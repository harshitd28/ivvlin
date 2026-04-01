export type UserRole = "admin" | "client";

export type AgentType = "vaani" | "nova" | "kira" | "zane" | "custom";

export type LeadStatus = "new" | "hot" | "warm" | "cold" | "lost" | "closed";

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "visit_scheduled"
  | "visited"
  | "negotiating"
  | "closed_won"
  | "closed_lost";

export type Channel = "whatsapp" | "instagram";

export type VisitStatus = "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";

export interface Profile {
  id: string;
  created_at: string;
  email: string | null;
  role: UserRole;
  client_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Client {
  id: string;
  created_at: string;
  name: string;
  business_name: string;
  email: string;
  phone: string | null;
  industry: string;
  agent_type: AgentType;
  plan: string | null;
  status: string | null;
  city: string | null;
  whatsapp_phone_id: string | null;
  whatsapp_access_token: string | null;
  instagram_page_id: string | null;
  meta_app_id: string | null;
  system_prompt: string | null;
  logo_url: string | null;
  onboarded_at: string | null;
  notes: string | null;
}

export interface Lead {
  id: string;
  created_at: string;
  client_id: string;
  lead_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  channel: Channel;
  instagram_psid: string | null;
  instagram_username: string | null;
  preferred_channel: Channel;
  message: string | null;
  budget: string | null;
  bhk_preference: string | null;
  location_preference: string | null;
  score: number | null;
  status: LeadStatus;
  stage: LeadStage;
  mode: "ai" | "human";
  dnd: boolean;
  preferred_lang: string | null;
  follow_up_step: number;
  follow_up_paused: boolean;
  assigned_to: string | null;
  last_reply_at: string | null;
  last_contact: string | null;
  visit_date: string | null;
  visit_time: string | null;
  property_interest: string | null;
  all_sources: string | null;
  owner_summary: string | null;
  urgency: string | null;
  intent: string | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  client_id: string;
  lead_id: string | null;
  channel: Channel;
  direction: "inbound" | "outbound";
  message: string;
  is_automated: boolean;
  status: string | null;
  intent: string | null;
  sentiment: string | null;
}

export interface Activity {
  id: string;
  created_at: string;
  client_id: string;
  lead_id: string | null;
  type: string;
  channel: string | null;
  direction: string | null;
  content: string | null;
  is_automated: boolean;
  status: string | null;
}

export interface Visit {
  id: string;
  created_at: string;
  client_id: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  visit_date: string; // ISO date (YYYY-MM-DD)
  visit_time: string | null;
  property: string | null;
  status: VisitStatus;
  reminder_sent: boolean;
  notes: string | null;
}

/**
 * Supabase typed Database definition (enough for our queries).
 * We keep this narrow/explicit to avoid `any`.
 */
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at"> & Partial<Pick<Client, "id" | "created_at">>;
        Update: Partial<Omit<Client, "id">>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, "id" | "created_at"> & Partial<Pick<Lead, "id" | "created_at">>;
        Update: Partial<Omit<Lead, "id">>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, "id" | "created_at"> & Partial<Pick<Conversation, "id" | "created_at">>;
        Update: Partial<Omit<Conversation, "id">>;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, "id" | "created_at"> & Partial<Pick<Activity, "id" | "created_at">>;
        Update: Partial<Omit<Activity, "id">>;
      };
      visits: {
        Row: Visit;
        Insert: Omit<Visit, "id" | "created_at"> & Partial<Pick<Visit, "id" | "created_at">>;
        Update: Partial<Omit<Visit, "id">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "role"> & Partial<Pick<Profile, "id" | "created_at">> & Partial<Pick<Profile, "role">>;
        Update: Partial<Omit<Profile, "id">>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

