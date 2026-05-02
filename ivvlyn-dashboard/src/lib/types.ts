/** JSON value as stored in Postgres json/jsonb (Supabase-typed). */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

export type Channel = "whatsapp" | "instagram" | "facebook" | "sms" | "email";

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
  assigned_to_user_id?: string | null;
  inbox_starred?: boolean;
  sla_target_minutes?: number;
  first_response_due_at?: string | null;
  sla_breached_at?: string | null;
  inbox_locked_until?: string | null;
  inbox_locked_by?: string | null;
  /** Rolled-out inbox (replaces inbox_starred convention with pinned/open/…) */
  inbox_status?: string | null;
  last_customer_message_at?: string | null;
  last_agent_response_at?: string | null;
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
  /** queued | sent | delivered | read | failed — provider lifecycle */
  lifecycle_state: string | null;
  provider_message_id: string | null;
  retry_count: number;
  idempotency_key: string | null;
}

/** Insert payload — explicit so UI/API calls do not need every Row field. */
export type ConversationInsert = {
  id?: string;
  created_at?: string;
  client_id: string;
  lead_id?: string | null;
  channel?: Channel;
  direction: "inbound" | "outbound";
  message: string;
  is_automated?: boolean;
  status?: string | null;
  intent?: string | null;
  sentiment?: string | null;
  lifecycle_state?: string | null;
  provider_message_id?: string | null;
  retry_count?: number;
  idempotency_key?: string | null;
};

/** Rolled-out: unique (provider, event_id). Legacy docs used idempotency_key + source. */
export interface WebhookIdempotency {
  provider: string;
  event_id: string;
  payload: Json;
  processed_at: string | null;
  created_at: string;
}

export type WebhookIdempotencyInsert = {
  provider: string;
  event_id: string;
  payload?: Json;
  processed_at?: string | null;
  created_at?: string;
};

export type OutboundJobState = "pending" | "processing" | "sent" | "failed" | "dead";

export interface OutboundMessageJob {
  id: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  lead_id: string;
  channel: string;
  conversation_id: string | null;
  to_phone?: string | null;
  template_name?: string | null;
  template_language?: string | null;
  message_type?: string | null;
  payload: Json;
  state: OutboundJobState;
  priority: number;
  attempts: number;
  max_attempts: number;
  /** Rolled-out uses scheduled_at; legacy migrations used next_attempt_at */
  scheduled_at?: string;
  next_attempt_at?: string;
  locked_at?: string | null;
  locked_by?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  error?: string | null;
  last_error?: string | null;
  external_message_id?: string | null;
  provider_message_id?: string | null;
}

export type OutboundMessageJobInsert = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  client_id: string;
  lead_id: string;
  channel: string;
  conversation_id?: string | null;
  to_phone?: string | null;
  template_name?: string | null;
  template_language?: string | null;
  message_type?: string | null;
  payload?: Json;
  state?: OutboundJobState;
  priority?: number;
  attempts?: number;
  max_attempts?: number;
  /** Production queue uses `scheduled_at`; legacy SQL may use `next_attempt_at` */
  scheduled_at?: string;
  next_attempt_at?: string;
  locked_at?: string | null;
  locked_by?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  error?: string | null;
  last_error?: string | null;
  external_message_id?: string | null;
  provider_message_id?: string | null;
};

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

export interface CreditLog {
  id: string;
  created_at: string;
  client_id: string | null;
  log_type: string | null;
  channel: string | null;
  lead_id: string | null;
  tokens_used: number | null;
  cost_inr: number | null;
  workflow_name: string | null;
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
 * Reference schema shape for docs and future `supabase gen types`.
 * Supabase clients in this app use the default untyped client so inserts/updates stay compatible as the DB evolves.
 */
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at"> & Partial<Pick<Client, "id" | "created_at">>;
        Update: Partial<Omit<Client, "id">>;
        Relationships: [];
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, "id" | "created_at"> & Partial<Pick<Lead, "id" | "created_at">>;
        Update: Partial<Omit<Lead, "id">>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: Partial<Omit<Conversation, "id">>;
        Relationships: [];
      };
      webhook_idempotency: {
        Row: WebhookIdempotency;
        Insert: WebhookIdempotencyInsert;
        Update: Partial<WebhookIdempotency>;
        Relationships: [];
      };
      outbound_message_jobs: {
        Row: OutboundMessageJob;
        Insert: OutboundMessageJobInsert;
        Update: Partial<Omit<OutboundMessageJob, "id">>;
        Relationships: [];
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, "id" | "created_at"> & Partial<Pick<Activity, "id" | "created_at">>;
        Update: Partial<Omit<Activity, "id">>;
        Relationships: [];
      };
      credit_logs: {
        Row: CreditLog;
        Insert: Omit<CreditLog, "id" | "created_at"> & Partial<Pick<CreditLog, "id" | "created_at">>;
        Update: Partial<Omit<CreditLog, "id">>;
        Relationships: [];
      };
      visits: {
        Row: Visit;
        Insert: Omit<Visit, "id" | "created_at"> & Partial<Pick<Visit, "id" | "created_at">>;
        Update: Partial<Omit<Visit, "id">>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "role"> & Partial<Pick<Profile, "id" | "created_at">> & Partial<Pick<Profile, "role">>;
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

