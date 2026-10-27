"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LeadStatus = "Warm" | "Researching" | "Draft ready" | "Replied";

export interface Lead {
  id: string;
  name: string;
  initials: string;
  company: string;
  role: string;
  status: LeadStatus;
  score: number;
  lastTouch: string;
  draft: string;
}

export type LeadSortKey = "name" | "company" | "score" | "lastTouch";

interface DashboardState {
  leads: Lead[];
  searchQuery: string;
  sortKey: LeadSortKey;
  sortDirection: "asc" | "desc";
  selectedLeadId: string;
  copiedLeadId: string | null;
  setSearchQuery: (searchQuery: string) => void;
  setSort: (sortKey: LeadSortKey) => void;
  selectLead: (selectedLeadId: string) => void;
  setCopiedLeadId: (copiedLeadId: string | null) => void;
}

const initialLeads: Lead[] = [
  { id: "maya-chen", name: "Maya Chen", initials: "MC", company: "Northstar Labs", role: "VP, Product", status: "Warm", score: 94, lastTouch: "2h ago", draft: "Maya, your work on product-led growth at Northstar stood out. I’m exploring how thoughtful product systems create durable expansion — would enjoy comparing notes." },
  { id: "jordan-rivera", name: "Jordan Rivera", initials: "JR", company: "Arc & Finch", role: "Founder", status: "Draft ready", score: 88, lastTouch: "Yesterday", draft: "Jordan, I’ve been following Arc & Finch’s approach to category design. The connection between clear positioning and consistent demand is a useful one — open to a short exchange?" },
  { id: "samir-patel", name: "Samir Patel", initials: "SP", company: "Vanta Works", role: "Head of Growth", status: "Researching", score: 79, lastTouch: "3d ago", draft: "Samir, your perspective on building repeatable growth systems is closely aligned with the work I’m doing. I’d value your take on the signals that matter before a team scales." },
  { id: "elena-morales", name: "Elena Morales", initials: "EM", company: "Goodform", role: "Chief of Staff", status: "Replied", score: 72, lastTouch: "5d ago", draft: "Elena, thanks for the thoughtful reply. I’d love to keep the conversation going around how strong operating rhythms make ambitious teams feel lighter." },
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      leads: initialLeads,
      searchQuery: "",
      sortKey: "score",
      sortDirection: "desc",
      selectedLeadId: initialLeads[0].id,
      copiedLeadId: null,
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSort: (sortKey) => set((state) => ({ sortKey, sortDirection: state.sortKey === sortKey && state.sortDirection === "asc" ? "desc" : "asc" })),
      selectLead: (selectedLeadId) => set({ selectedLeadId }),
      setCopiedLeadId: (copiedLeadId) => set({ copiedLeadId }),
    }),
    {
      name: "optilink-dashboard",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ leads: state.leads, searchQuery: state.searchQuery, sortKey: state.sortKey, sortDirection: state.sortDirection, selectedLeadId: state.selectedLeadId }),
    },
  ),
);

