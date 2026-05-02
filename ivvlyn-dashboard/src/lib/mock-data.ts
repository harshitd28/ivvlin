export type DashboardStat = {
  label: string;
  value: number;
  suffix?: string;
  trend: string;
  trendUp: boolean;
  valueColor?: string;
};

export type LeadItem = {
  id: string;
  name: string;
  initials: string;
  phone?: string;
  email?: string;
  source: string;
  lastMessage: string;
  time: string;
  score: number;
  status: "hot" | "warm" | "new" | "cold";
  unread: number;
};

export type VisitItem = {
  leadName: string;
  project: string;
  time: string;
  salesperson: string;
  status: "confirmed" | "due" | "reminder";
};

export type ActivityItem = {
  id: string;
  time: string;
  type: "lead" | "visit" | "hot" | "crm" | "human";
  description: string;
  entity: string;
};

export type LeadSourceItem = {
  source: string;
  count: number;
  percentage: number;
};

export const dashboardStats: DashboardStat[] = [
  { label: "New Leads Today", value: 14, trend: "+27% vs yesterday", trendUp: true },
  { label: "Hot Leads", value: 12, trend: "+20% vs yesterday", trendUp: true, valueColor: "#FF6B35" },
  { label: "Avg Response", value: 47, suffix: "s", trend: "-12s vs yesterday", trendUp: true, valueColor: "#10B981" },
  { label: "Site Visits", value: 3, trend: "+50% vs yesterday", trendUp: true },
  { label: "Follow-ups Active", value: 56, trend: "+16% vs yesterday", trendUp: true },
  { label: "CRM Sync", value: 100, suffix: "%", trend: "All healthy", trendUp: true, valueColor: "#10B981" },
];

export const leads: LeadItem[] = [
  {
    id: "lead-1",
    name: "Arjun Mehta",
    initials: "AM",
    phone: "+91 9820012345",
    email: "arjun.mehta@example.com",
    source: "Meta Ads",
    lastMessage: "Can we visit the 3BHK this evening around 6?",
    time: "2m ago",
    score: 84,
    status: "hot",
    unread: 2,
  },
  {
    id: "lead-2",
    name: "Riya Sharma",
    initials: "RS",
    phone: "+91 9811134567",
    email: "riya.sharma@example.com",
    source: "MagicBricks",
    lastMessage: "Please share possession timeline and floor plans.",
    time: "8m ago",
    score: 68,
    status: "warm",
    unread: 0,
  },
  {
    id: "lead-3",
    name: "Nikhil Rao",
    initials: "NR",
    phone: "+91 9899988877",
    email: "nikhil.rao@example.com",
    source: "Website",
    lastMessage: "Interested in 2BHK under 90L near Hinjewadi.",
    time: "19m ago",
    score: 52,
    status: "new",
    unread: 1,
  },
  {
    id: "lead-4",
    name: "Sneha Pillai",
    initials: "SP",
    phone: "+91 9777766655",
    email: "sneha.pillai@example.com",
    source: "WhatsApp",
    lastMessage: "Need a weekend slot for family visit.",
    time: "42m ago",
    score: 74,
    status: "hot",
    unread: 0,
  },
  {
    id: "lead-5",
    name: "Karan Gupta",
    initials: "KG",
    phone: "+91 9666655544",
    email: "karan.gupta@example.com",
    source: "Housing",
    lastMessage: "Will confirm after checking commute distance.",
    time: "1h ago",
    score: 33,
    status: "cold",
    unread: 0,
  },
];

export const siteVisits: VisitItem[] = [
  { leadName: "Arjun Mehta", project: "Skyline Crest", time: "11:00 AM", salesperson: "Priya N.", status: "confirmed" },
  { leadName: "Sneha Pillai", project: "Urban Nest", time: "1:30 PM", salesperson: "Rohan P.", status: "due" },
  { leadName: "Riya Sharma", project: "Green Arc", time: "3:00 PM", salesperson: "Priya N.", status: "reminder" },
  { leadName: "Nikhil Rao", project: "Riverfront 9", time: "4:15 PM", salesperson: "Aman V.", status: "confirmed" },
  { leadName: "Karan Gupta", project: "Parkline One", time: "6:00 PM", salesperson: "Aman V.", status: "due" },
];

export const activities: ActivityItem[] = [
  { id: "act-1", time: "08:22", type: "lead", description: "New lead captured from Meta campaign", entity: "Arjun Mehta" },
  { id: "act-2", time: "08:41", type: "hot", description: "Lead score crossed hot threshold", entity: "Sneha Pillai" },
  { id: "act-3", time: "09:05", type: "visit", description: "Site visit confirmed for today", entity: "Riya Sharma" },
  { id: "act-4", time: "09:40", type: "crm", description: "Lead updated in Zoho CRM", entity: "Nikhil Rao" },
  { id: "act-5", time: "10:12", type: "human", description: "Sales rep takeover completed", entity: "Karan Gupta" },
  { id: "act-6", time: "10:36", type: "lead", description: "AI sent 3rd follow-up message", entity: "Arjun Mehta" },
];

export const leadSources: LeadSourceItem[] = [
  { source: "Meta Ads", count: 34, percentage: 34 },
  { source: "MagicBricks", count: 21, percentage: 21 },
  { source: "Website", count: 18, percentage: 18 },
  { source: "WhatsApp", count: 15, percentage: 15 },
  { source: "Other", count: 12, percentage: 12 },
];

export const aiActivity = {
  conversations: { value: 132, trend: "+18%" },
  messages: { value: 486, trend: "+22%" },
  reminders: { value: 38, trend: "+27%" },
  noShowFollowups: { value: 12, trend: "-5%" },
};

export const crmSync = {
  connected: true,
  leadsCreated: 24,
  leadsUpdated: 56,
  activitiesLogged: 142,
  errors: 0,
  lastSync: "2 min ago",
  nextSync: "in 13 min",
};

export const briefingItems: Array<{
  icon: "Moon" | "Calendar" | "RefreshCw" | "PhoneCall" | "Bot";
  text: string;
}> = [
  { icon: "Moon", text: "14 new leads captured overnight" },
  { icon: "Calendar", text: "3 site visits confirmed for today" },
  { icon: "RefreshCw", text: "2 no-shows need rescheduling" },
  { icon: "PhoneCall", text: "5 warm leads waiting for callback" },
  { icon: "Bot", text: "AI follow-ups running on 56 leads" },
];

export const creditUsage = {
  used: 247,
  limit: 500,
};

export const pipeline = [
  { stage: "New", count: 48, isActive: false },
  { stage: "Qualified", count: 32, isActive: false },
  { stage: "Warm", count: 18, isActive: false },
  { stage: "Hot", count: 12, isActive: true },
  { stage: "Site Visit", count: 5, isActive: false },
  { stage: "Closed", count: 3, isActive: false },
];
