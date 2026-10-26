-- OptiLink.ai initial PostgreSQL schema.
-- Run this migration against Supabase/PostgreSQL with pgcrypto and pgvector enabled.

create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.lead_status as enum ('discovered', 'qualified', 'drafted', 'contacted', 'replied', 'archived');
create type public.metric_type as enum ('profile_score', 'keyword_coverage', 'headline_quality', 'about_quality', 'engagement');

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique check (char_length(email) between 3 and 255),
    display_name text not null check (char_length(display_name) between 1 and 120),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.users(id) on delete cascade,
    current_headline text not null default '' check (char_length(current_headline) <= 300),
    current_about text not null default '' check (char_length(current_about) <= 5000),
    target_niche text not null default '' check (char_length(target_niche) <= 160),
    target_keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(target_keywords) = 'array'),
    optimized_headline text check (char_length(optimized_headline) <= 300),
    optimized_about text check (char_length(optimized_about) <= 5000),
    embedding vector(1536),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tracked_leads (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    company_name text not null check (char_length(company_name) between 1 and 255),
    contact_name text not null check (char_length(contact_name) between 1 and 255),
    profile_url text not null check (profile_url ~* '^https://(www\.)?linkedin\.com/'),
    extracted_data jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_data) = 'object'),
    outreach_status public.lead_status not null default 'discovered',
    generated_pitch text check (char_length(generated_pitch) <= 5000),
    last_contacted_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (user_id, profile_url)
);

create table if not exists public.optimization_metrics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    metric_type public.metric_type not null,
    metric_value numeric(6, 3) not null check (metric_value >= 0 and metric_value <= 100),
    source text not null default 'system' check (char_length(source) between 1 and 80),
    metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
    measured_at timestamptz not null default timezone('utc', now())
);

create index if not exists tracked_leads_user_status_idx on public.tracked_leads(user_id, outreach_status);
create index if not exists tracked_leads_updated_idx on public.tracked_leads(user_id, updated_at desc);
create index if not exists optimization_metrics_profile_date_idx on public.optimization_metrics(profile_id, measured_at desc);
create index if not exists profiles_embedding_idx on public.profiles using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists tracked_leads_set_updated_at on public.tracked_leads;
create trigger tracked_leads_set_updated_at before update on public.tracked_leads for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.tracked_leads enable row level security;
alter table public.optimization_metrics enable row level security;

-- The API uses a service role only for server-side persistence. User-facing
-- JWT policies can be added when Supabase Auth is wired into the frontend.
