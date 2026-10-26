# OptiLink.ai – Implementation & Vercel Deployment Blueprint

## 1. Directory Structure

```text
optilink-root/
├── .agentcontext/
│   ├── sys_blueprint.md
│   ├── active_state.json
│   └── mcp_routing.json
├── frontend/ (Next.js 15 + Shadcn/ui)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── hooks/
│   ├── package.json
│   └── vercel.json
├── backend/ (FastAPI + Python Scraping)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── agents/
│   │   └── scraper/
│   ├── requirements.txt
│   └── Dockerfile
└── extension/ (Chrome Extension Wrapper)
    ├── manifest.json
    └── content.js
```

## 2. Technical Stack Specification

### Frontend Architecture
* Framework: Next.js 15 (App Router, strict TypeScript verification)
* Styling & UI: Tailwind CSS, Shadcn UI library primitives, Lucide React icons
* State Layer: Client-side storage managed via Zustand stores with sessionStorage persistence

### Backend Engineering
* Framework: FastAPI featuring an asynchronous ASGI pipeline
* Execution Workers: Celery tasks backed by a Redis broker layer
* Database Systems: PostgreSQL instance handled with Prisma ORM/SQLAlchemy, pgvector extension enabled

### Infrastructure Integration
* Automation Pipelines: Workflow processing using self-hosted n8n
* AI Inference: Requests routed through the Groq Cloud API (utilizing Llama 3.3 70B & Mistral Large)

## 3. Core Database Schema & State Layout

```sql
-- Core Target Profile Table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    current_headline TEXT,
    optimized_headline TEXT,
    target_niche VARCHAR(100),
    keyword_matrix JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead Tracking and Engagement State
CREATE TABLE client_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    company_name VARCHAR(255),
    contact_name VARCHAR(255),
    profile_url TEXT NOT NULL,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    outreach_status VARCHAR(50) DEFAULT 'discovered', -- discovered, drafted, sent, replied
    generated_pitch TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 4. MVP Implementation Roadmap

### Step 1: Base Application Initialization
* Initialize the Next.js 15 project in `/frontend` using strict TypeScript flags. Configure standard layout paths.
* Bootstrap the FastAPI boilerplate inside `/backend`. Implement comprehensive CORS safety middleware layers pointing to the frontend environment.

### Step 2: In-Insulated Local Scraper Mechanism
* Construct a lightweight background content script within the `/extension` directory. It reads `document.body.innerText` matching target CSS classes like `.pv-text-details__left-panel`.
* Build a secure local WebSocket connection endpoint inside `backend/app/scraper/router.py`. This receives raw profile dumps securely from the browser wrapper.

### Step 3: Optimization Core & Processing Loop
* Establish an asynchronous connection to the Groq inference endpoint. Write targeted prompts that isolate skill deltas and identify structural keyword gaps between users and high-ranking industry competitors.
* Wire up an external n8n workflow pipeline triggered via standard outgoing REST webhooks. This formats raw AI copy fragments into structured LinkedIn content layouts automatically.

## 5. Deployment Framework & Production Pipeline

### Backend Hosting Strategy
Deploy the containerized FastAPI microservices framework using specialized cloud runtime infrastructures (e.g., Render, Railway, or AWS ECS Fargate). Include an active Redis database layer to manage long-running extraction queries without web timeouts.

### Vercel Frontend Configuration (`frontend/vercel.json`)
```json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "rewrites": [
    {
      "source": "/api/v1/:path*",
      "destination": "https://your-fastapi-backend-url.com*"
    }
  ]
}
```

### CI/CD Pipeline Implementation
* Configure the Vercel dashboard connection to point directly to the project's `/frontend` directory workspace root.
* Ensure all critical platform API endpoints, external service credentials, and database secrets match production keys exactly before initializing live builds.
