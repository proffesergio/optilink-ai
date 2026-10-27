"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, BarChart3, Bell, Check, ChevronDown, CircleHelp, Clipboard, Compass, Copy, FileText, Gauge, LayoutDashboard, Menu, Plus, Search, Settings, Sparkles, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileLab } from "@/components/profile-lab";
import { type Lead, type LeadSortKey, useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Profile lab", icon: Sparkles },
  { label: "Lead signals", icon: Users },
  { label: "Content queue", icon: FileText },
];

const actionItems = [
  { label: "Add 2 proof points to About", detail: "Your profile score will gain clarity", tone: "lime" },
  { label: "Use “product strategy” in headline", detail: "Appears in 4 high-signal profiles", tone: "blue" },
  { label: "Follow up with Maya Chen", detail: "Warm signal detected 2h ago", tone: "purple" },
] as const;

function statusClass(status: Lead["status"]): string {
  const classes: Record<Lead["status"], string> = {
    Warm: "bg-[#eff8d3] text-[#5b6e2b]",
    "Draft ready": "bg-[#e8efff] text-[#526ca2]",
    Researching: "bg-[#f4eee3] text-[#96764b]",
    Replied: "bg-[#eee8fb] text-[#795da6]",
  };
  return classes[status];
}

export function Dashboard() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Overview");
  const { leads, searchQuery, sortKey, sortDirection, selectedLeadId, copiedLeadId, setSearchQuery, setSort, selectLead, setCopiedLeadId } = useDashboardStore();

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];
  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = leads.filter((lead) => [lead.name, lead.company, lead.role, lead.status].some((value) => value.toLowerCase().includes(query)));
    return [...filtered].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [leads, searchQuery, sortDirection, sortKey]);

  async function copyDraft(lead: Lead): Promise<void> {
    try {
      await navigator.clipboard.writeText(lead.draft);
      setCopiedLeadId(lead.id);
      window.setTimeout(() => setCopiedLeadId(null), 1800);
    } catch {
      setCopiedLeadId(null);
    }
  }

  function sortIndicator(key: LeadSortKey): ReactNode {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  }

  return <div className="min-h-screen bg-[#f5f7f3] text-[#17221f]">
    <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-[250px] -translate-x-full flex-col border-r border-[#e0e6df] bg-[#fbfcf9] px-5 py-6 transition-transform lg:translate-x-0", mobileNavOpen && "translate-x-0")}>
      <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-xl bg-[#17221f] text-[#e8ff70]"><Sparkles size={16} /></div><span className="text-lg font-bold tracking-[-0.04em]">optilink<span className="text-[#879b49]">.</span></span></div><Button variant="icon" className="lg:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={16} /></Button></div>
      <div className="mt-11 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#65736a]">Workspace</div>
      <nav className="mt-3 space-y-1" aria-label="Main navigation">{navigation.map(({ label, icon: Icon }) => <button key={label} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#53655a] transition-colors hover:bg-[#eef2eb] hover:text-[#17221f]", activeSection === label && "bg-[#eaf0e4] font-bold text-[#17221f]")} onClick={() => { setActiveSection(label); setMobileNavOpen(false); }}><Icon size={17} strokeWidth={activeSection === label ? 2.5 : 1.8} />{label}{label === "Lead signals" && <span className="ml-auto rounded-full bg-[#dce8be] px-2 py-0.5 text-[10px] font-bold text-[#4a5d23]">12</span>}</button>)}</nav>
      <div className="mt-auto space-y-1 border-t border-[#e6ebe4] pt-4"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#53655a] hover:bg-[#eef2eb] hover:text-[#17221f]"><Settings size={17} /> Settings</button><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#53655a] hover:bg-[#eef2eb] hover:text-[#17221f]"><CircleHelp size={17} /> Help center</button><div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f0f4ed] p-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#d0dcae] text-xs font-bold text-[#526232]">AK</div><div className="min-w-0"><div className="truncate text-xs font-bold">Alex Kim</div><div className="truncate text-[11px] text-[#5d6b62]">Personal workspace</div></div><ChevronDown className="ml-auto text-[#91a096]" size={15} /></div></div>
    </aside>

    <div className="lg:pl-[250px]"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e0e6df] bg-[#f5f7f3]/90 px-5 backdrop-blur-md sm:px-8"><div className="flex items-center gap-3"><Button variant="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={18} /></Button><div className="text-sm text-[#56655d]">Workspace <span className="mx-2 text-[#b7c0b9]">/</span> <span className="font-semibold text-[#26342d]">Overview</span></div></div><div className="flex items-center gap-2 sm:gap-4"><button className="relative grid h-10 w-10 place-items-center rounded-xl text-[#718078] hover:bg-white" aria-label="Notifications"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#b1cc45]" /></button><Button variant="primary" className="hidden sm:inline-flex"><Plus size={16} /> New workflow</Button><div className="grid h-9 w-9 place-items-center rounded-full bg-[#273b34] text-xs font-bold text-[#e8ff70] sm:hidden">AK</div></div></header>

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">{activeSection === "Profile lab" ? <ProfileLab /> : <><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-semibold text-[#5a6f28]">Tuesday, October 27, 2026</p><h1 className="text-[clamp(2rem,4vw,3.25rem)] font-bold leading-none tracking-[-0.07em]">Good morning, Alex<span className="text-[#b7cc5b]">.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#5d6d64]">Your growth system is moving. Here’s where your strongest signals and next best actions are today.</p></div><Button variant="secondary" className="self-start sm:self-auto"><Compass size={16} /> Weekly view <ChevronDown size={15} className="text-[#98a49c]" /></Button></div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Performance summary"><MetricCard label="Profile strength" value="78" suffix="/100" detail="↑ 6 pts this month" icon={<Gauge size={18} />} accent="lime" /><MetricCard label="Profile views" value="2,481" detail="↑ 18.4% vs last month" icon={<BarChart3 size={18} />} accent="blue" /><MetricCard label="Active signals" value="12" detail="4 high-intent leads" icon={<Users size={18} />} accent="purple" /><MetricCard label="Reply rate" value="24.8%" detail="↑ 4.2% this month" icon={<ArrowUpRight size={18} />} accent="orange" /></section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]"><Card className="overflow-hidden"><div className="flex flex-col gap-4 border-b border-[#e8ede7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-bold tracking-[-0.02em]">Lead signals</h2><p className="mt-1 text-xs text-[#8a978f]">People worth a thoughtful next move.</p></div><div className="flex items-center gap-2"><label className="relative flex min-w-0 flex-1 items-center sm:w-52"><Search className="absolute left-3 text-[#a2ada5]" size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search leads" className="h-10 w-full rounded-xl border border-[#e0e6df] bg-[#fafcf9] pl-9 pr-3 text-xs outline-none placeholder:text-[#a2ada5] focus:border-[#aabd62]" /></label><Button variant="icon" aria-label="Filter leads"><svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M4.5 8h7M6.5 12h3" /></svg></Button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#fafcf9] text-[10px] uppercase tracking-[0.12em] text-[#9aa59d]"><tr><SortableHeader label="Lead" sortKey="name" onSort={setSort} indicator={sortIndicator("name")} /><SortableHeader label="Company" sortKey="company" onSort={setSort} indicator={sortIndicator("company")} /><th className="px-4 py-3 font-bold">Signal</th><SortableHeader label="Fit" sortKey="score" onSort={setSort} indicator={sortIndicator("score")} /><SortableHeader label="Last touch" sortKey="lastTouch" onSort={setSort} indicator={sortIndicator("lastTouch")} /><th className="px-4 py-3 font-bold">Action</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{filteredLeads.map((lead) => <tr key={lead.id} className={cn("cursor-pointer transition-colors hover:bg-[#fbfcf9]", selectedLeadId === lead.id && "bg-[#fbfcf7]")} onClick={() => selectLead(lead.id)}><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dbe8cb] text-[11px] font-bold text-[#617143]">{lead.initials}</div><div><div className="font-semibold text-[#26342d]">{lead.name}</div><div className="mt-0.5 text-xs text-[#99a49d]">{lead.role}</div></div></div></td><td className="px-4 py-4 font-medium text-[#66756c]">{lead.company}</td><td className="px-4 py-4"><Badge className={statusClass(lead.status)}>{lead.status}</Badge></td><td className="px-4 py-4"><div className="flex items-center gap-2 font-bold text-[#26342d]"><span className="h-1.5 w-1.5 rounded-full bg-[#b7cc5b]" />{lead.score}%</div></td><td className="px-4 py-4 text-xs text-[#93a097]">{lead.lastTouch}</td><td className="px-4 py-4"><button className="rounded-lg p-2 text-[#9ba79e] hover:bg-[#edf2e9] hover:text-[#50623c]" aria-label={`Copy outreach draft for ${lead.name}`} onClick={(event) => { event.stopPropagation(); void copyDraft(lead); }}>{copiedLeadId === lead.id ? <Check size={16} /> : <Copy size={16} />}</button></td></tr>)}</tbody></table></div>{filteredLeads.length === 0 && <div className="px-5 py-10 text-center text-sm text-[#8c9990]">No leads match “{searchQuery}”.</div>}<div className="flex items-center justify-between border-t border-[#e8ede7] px-5 py-4 text-xs text-[#8b978f]"><span>Showing {filteredLeads.length} of {leads.length} leads</span><button className="font-semibold text-[#6c833d] hover:text-[#4b5f26]">View all leads <ArrowUpRight className="ml-1 inline" size={13} /></button></div></Card>

          <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#98a59b]">Selected lead</p><div className="mt-3 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-[#dbe8cb] text-sm font-bold text-[#617143]">{selectedLead.initials}</div><div><h2 className="font-bold">{selectedLead.name}</h2><p className="mt-0.5 text-xs text-[#89968e]">{selectedLead.role} · {selectedLead.company}</p></div></div></div><Badge className={statusClass(selectedLead.status)}>{selectedLead.status}</Badge></div><div className="mt-6 rounded-xl bg-[#f5f8f2] p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#98a494]">Outreach draft</span><button className="text-[#7f9450] hover:text-[#536b29]" onClick={() => void copyDraft(selectedLead)} aria-label="Copy selected outreach draft">{copiedLeadId === selectedLead.id ? <Check size={16} /> : <Clipboard size={16} />}</button></div><p className="mt-3 text-sm leading-6 text-[#59675f]">{selectedLead.draft}</p></div><Button variant="primary" className="mt-4 w-full" onClick={() => void copyDraft(selectedLead)}>{copiedLeadId === selectedLead.id ? <><Check size={16} /> Copied to clipboard</> : <><Copy size={16} /> Copy outreach script</>}</Button><div className="mt-5 flex items-center justify-between border-t border-[#e8ede7] pt-4 text-xs"><span className="text-[#98a59c]">Fit score</span><span className="font-bold text-[#5f7333]">{selectedLead.score}% <span className="font-normal text-[#9aa69e]">high confidence</span></span></div></Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]"><Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold tracking-[-0.02em]">Profile momentum</h2><p className="mt-1 text-xs text-[#8a978f]">Your visibility is compounding.</p></div><button className="text-xs font-semibold text-[#779044]">Last 30 days <ChevronDown className="ml-1 inline" size={13} /></button></div><div className="mt-5 flex items-end gap-8"><div><div className="text-3xl font-bold tracking-[-0.06em]">+18.4<span className="text-lg text-[#96a45d]">%</span></div><div className="mt-1 text-xs text-[#98a59c]">profile views</div></div><div><div className="text-3xl font-bold tracking-[-0.06em]">+6</div><div className="mt-1 text-xs text-[#98a59c]">strength points</div></div></div><div className="relative mt-7 h-32"><div className="absolute inset-x-0 top-0 border-t border-dashed border-[#e5ebe3]" /><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#e5ebe3]" /><div className="absolute inset-x-0 bottom-0 border-t border-dashed border-[#e5ebe3]" /><svg viewBox="0 0 680 130" preserveAspectRatio="none" className="relative h-full w-full overflow-visible"><defs><linearGradient id="momentum-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#cddd74" stopOpacity="0.28" /><stop offset="100%" stopColor="#cddd74" stopOpacity="0" /></linearGradient></defs><path d="M0 112 C50 106 62 104 95 108 S145 91 173 96 S224 78 259 84 S310 80 339 68 S386 72 418 61 S463 64 493 42 S534 48 563 31 S615 35 680 10 L680 130 L0 130Z" fill="url(#momentum-fill)" /><path d="M0 112 C50 106 62 104 95 108 S145 91 173 96 S224 78 259 84 S310 80 339 68 S386 72 418 61 S463 64 493 42 S534 48 563 31 S615 35 680 10" fill="none" stroke="#aabc58" strokeLinecap="round" strokeWidth="3" /></svg></div><div className="mt-2 flex justify-between text-[10px] text-[#adb7b0]"><span>Sep 28</span><span>Oct 5</span><span>Oct 12</span><span>Oct 19</span><span>Today</span></div></Card><Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold tracking-[-0.02em]">Next best actions</h2><p className="mt-1 text-xs text-[#8a978f]">Small moves, meaningful lift.</p></div><button className="grid h-8 w-8 place-items-center rounded-lg text-[#9daaa0] hover:bg-[#eef2eb]" aria-label="More actions"><span className="text-lg leading-none">···</span></button></div><div className="mt-5 space-y-3">{actionItems.map((item) => <ActionRow key={item.label} {...item} />)}</div><button className="mt-5 text-xs font-bold text-[#769044] hover:text-[#50682d]">Open profile lab <ArrowUpRight className="ml-1 inline" size={13} /></button></Card></div>
      </>}</main>
    </div>
  </div>;
}

function MetricCard({ label, value, suffix, detail, icon, accent }: { label: string; value: string; suffix?: string; detail: string; icon: ReactNode; accent: "lime" | "blue" | "purple" | "orange" }) {
  const accentClasses: Record<typeof accent, string> = { lime: "bg-[#edf4d7] text-[#8aa447]", blue: "bg-[#e8effd] text-[#7394cd]", purple: "bg-[#eee8fa] text-[#8c73b7]", orange: "bg-[#f8ede1] text-[#c08c5a]" };
  return <Card className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#89968d]">{label}</span><span className={cn("grid h-8 w-8 place-items-center rounded-lg", accentClasses[accent])}>{icon}</span></div><div className="mt-4 text-3xl font-bold tracking-[-0.06em]">{value}<span className="ml-1 text-sm font-semibold tracking-normal text-[#9ba69f]">{suffix}</span></div><div className="mt-2 text-xs font-semibold text-[#829246]">{detail}</div></Card>;
}

function SortableHeader({ label, sortKey, onSort, indicator }: { label: string; sortKey: LeadSortKey; onSort: (key: LeadSortKey) => void; indicator: ReactNode }) {
  return <th className="px-4 py-3 font-bold"><button className="inline-flex items-center gap-1.5 hover:text-[#576d2d]" onClick={() => onSort(sortKey)}>{label}{indicator}</button></th>;
}

function ActionRow({ label, detail, tone }: { label: string; detail: string; tone: "lime" | "blue" | "purple" }) {
  const toneClasses: Record<typeof tone, string> = { lime: "bg-[#e7f0c8] text-[#759139]", blue: "bg-[#e5edfc] text-[#6c8fcc]", purple: "bg-[#eee7f9] text-[#8a70b6]" };
  return <button className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-[#e3e9df] hover:bg-[#fafcf9]"><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold", toneClasses[tone])}>{tone === "lime" ? "01" : tone === "blue" ? "02" : "03"}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-[#3a4941]">{label}</span><span className="mt-1 block truncate text-[11px] text-[#9aa69e]">{detail}</span></span><ArrowUpRight className="ml-auto shrink-0 text-[#b2bdb4]" size={15} /></button>;
}

