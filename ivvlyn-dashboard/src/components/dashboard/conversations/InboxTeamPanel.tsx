"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Lock, Star } from "lucide-react";

export type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  inbox_last_seen_at?: string | null;
};

type NoteRow = { id: string; created_at: string; body: string; author_id: string };

type Props = {
  clientId: string;
  leadId: string | null;
  currentUserId: string | null;
  team: TeamMember[];
  assignedToUserId: string | null;
  inboxStarred: boolean;
  /** Latest message row status — drives Open / Resolved inbox filters */
  latestConversationStatus: string | null;
  firstResponseDueAt: string | null;
  inboxLockedUntil: string | null;
  inboxLockedBy: string | null;
  onLeadUpdated?: () => void;
};

export default function InboxTeamPanel({
  clientId,
  leadId,
  currentUserId,
  team,
  assignedToUserId,
  inboxStarred,
  latestConversationStatus,
  firstResponseDueAt,
  inboxLockedUntil,
  inboxLockedBy,
  onLeadUpdated,
}: Props) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [threadStatusBusy, setThreadStatusBusy] = useState(false);
  const [lockActive, setLockActive] = useState(false);
  const [slaBreached, setSlaBreached] = useState(false);

  useEffect(() => {
    const apply = () => {
      const now = Date.now();
      setLockActive(Boolean(inboxLockedUntil && new Date(inboxLockedUntil).getTime() > now));
      setSlaBreached(Boolean(firstResponseDueAt && new Date(firstResponseDueAt).getTime() < now));
    };
    const tInit = window.setTimeout(apply, 0);
    const id = window.setInterval(apply, 1000);
    return () => {
      window.clearTimeout(tInit);
      window.clearInterval(id);
    };
  }, [inboxLockedUntil, firstResponseDueAt]);

  const lockedByOther = Boolean(lockActive && inboxLockedBy && inboxLockedBy !== currentUserId);

  useEffect(() => {
    const windowMs = 120_000;
    const calc = () => {
      const now = Date.now();
      const next = new Set<string>();
      for (const m of team) {
        if (!m.inbox_last_seen_at) continue;
        if (now - new Date(m.inbox_last_seen_at).getTime() < windowMs) next.add(m.id);
      }
      setOnlineIds(next);
    };
    const t0 = window.setTimeout(calc, 0);
    const id = window.setInterval(calc, 15_000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [team]);

  useEffect(() => {
    if (!leadId || clientId === "demo-client") {
      const t = window.setTimeout(() => {
        setNotes([]);
        setLoadingNotes(false);
      }, 0);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    const tLoad = window.setTimeout(() => setLoadingNotes(true), 0);
    void fetch(`/api/inbox/notes?lead_id=${encodeURIComponent(leadId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.ok && Array.isArray(d.notes)) setNotes(d.notes as NoteRow[]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(tLoad);
    };
  }, [leadId, clientId]);

  useEffect(() => {
    if (!leadId || clientId === "demo-client") return;
    if (!lockActive || inboxLockedBy !== currentUserId) return;
    const t = window.setInterval(() => {
      void fetch("/api/inbox/lock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, action: "heartbeat", ttl_sec: 120 }),
      }).catch(() => null);
    }, 45_000);
    return () => window.clearInterval(t);
  }, [leadId, clientId, lockActive, inboxLockedBy, currentUserId]);

  async function patchLead(patch: Record<string, unknown>) {
    if (!leadId || clientId === "demo-client") return;
    setSaving(true);
    const res = await fetch("/api/inbox/leads", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, ...patch }),
    });
    setSaving(false);
    if (res.ok) onLeadUpdated?.();
  }

  async function addNote() {
    const text = noteDraft.trim();
    if (!leadId || !text || clientId === "demo-client") return;
    setSaving(true);
    const res = await fetch("/api/inbox/notes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, body: text }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && d?.note) {
      setNotes((prev) => [d.note as NoteRow, ...prev]);
      setNoteDraft("");
    }
  }

  const threadResolved = (latestConversationStatus ?? "").toLowerCase() === "resolved";

  async function setThreadStatus(next: "open" | "resolved") {
    if (!leadId || clientId === "demo-client") return;
    setThreadStatusBusy(true);
    const res = await fetch("/api/inbox/thread-status", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, status: next }),
    });
    setThreadStatusBusy(false);
    if (res.ok) onLeadUpdated?.();
  }

  async function toggleLock() {
    if (!leadId || clientId === "demo-client") return;
    setLockBusy(true);
    if (lockActive && inboxLockedBy === currentUserId) {
      await fetch("/api/inbox/lock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, action: "release" }),
      });
    } else if (!lockedByOther) {
      await fetch("/api/inbox/lock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, action: "acquire", ttl_sec: 120 }),
      });
    }
    setLockBusy(false);
    onLeadUpdated?.();
  }

  if (!leadId) return null;

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#111111] p-4 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#777]">Team inbox</div>

      {clientId === "demo-client" ? (
        <p className="text-[12px] text-[#666]">Sign in with a client account to use assignment, SLA, and notes.</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`rounded-lg px-2 py-1 text-[11px] border ${
            slaBreached ? "border-red-500/50 text-red-300 bg-red-950/30" : "border-[#2a2a2a] text-[#aaa]"
          }`}
        >
          SLA:{" "}
          {firstResponseDueAt
            ? `${slaBreached ? "Breached · " : ""}${formatDistanceToNow(new Date(firstResponseDueAt), { addSuffix: true })}`
            : "—"}
        </div>
        <button
          type="button"
          disabled={saving || clientId === "demo-client"}
          onClick={() => void patchLead({ inbox_starred: !inboxStarred })}
          className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] px-2 py-1 text-[11px] text-[#ccc] hover:border-[#444]"
        >
          <Star size={12} className={inboxStarred ? "text-amber-400 fill-amber-400" : ""} />
          {inboxStarred ? "Starred" : "Star"}
        </button>
        <button
          type="button"
          disabled={lockBusy || clientId === "demo-client" || lockedByOther}
          onClick={() => void toggleLock()}
          className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] px-2 py-1 text-[11px] text-[#ccc] hover:border-[#444] disabled:opacity-40"
        >
          {lockBusy ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
          {lockedByOther ? "Locked by teammate" : lockActive && inboxLockedBy === currentUserId ? "Unlock" : "Lock thread"}
        </button>
        <button
          type="button"
          disabled={threadStatusBusy || clientId === "demo-client"}
          onClick={() => void setThreadStatus(threadResolved ? "open" : "resolved")}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] disabled:opacity-40 ${
            threadResolved
              ? "border-emerald-900/60 text-emerald-200/95 hover:border-emerald-700/60"
              : "border-[#2a2a2a] text-[#ccc] hover:border-[#444]"
          }`}
        >
          {threadStatusBusy ? <Loader2 size={12} className="animate-spin" /> : null}
          {threadResolved ? "Reopen" : "Resolve"}
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[#666]">Assign to</label>
        <select
          disabled={saving || clientId === "demo-client"}
          className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-2 text-[12px] text-white"
          value={assignedToUserId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            void patchLead({ assigned_to_user_id: v === "" ? null : v });
          }}
        >
          <option value="">Unassigned</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {(onlineIds.has(m.id) ? "● " : "") + (m.full_name || m.email || m.id.slice(0, 8))}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 border-t border-[#1e1e1e] pt-3">
        <div className="text-[10px] uppercase tracking-wider text-[#666]">Internal notes</div>
        <div className="flex gap-2">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Note (not visible to lead)"
            className="h-9 flex-1 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-2 text-[12px] text-white placeholder:text-[#555]"
            onKeyDown={(e) => {
              if (e.key === "Enter") void addNote();
            }}
          />
          <button
            type="button"
            disabled={saving || !noteDraft.trim() || clientId === "demo-client"}
            onClick={() => void addNote()}
            className="h-9 rounded-lg border border-[#2a2a2a] px-3 text-[12px] text-white"
          >
            Add
          </button>
        </div>
        <div className="max-h-[140px] space-y-2 overflow-auto text-[11px] text-[#9a9a9a]">
          {loadingNotes ? <div>Loading notes…</div> : null}
          {!loadingNotes && notes.length === 0 ? <div className="text-[#555]">No notes yet.</div> : null}
          {notes.map((n) => (
            <div key={n.id} className="rounded-md border border-[#222] bg-[#0a0a0a] px-2 py-1.5">
              <div className="text-[#666] text-[10px]">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              <div className="text-[#ccc] mt-0.5 whitespace-pre-wrap">{n.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
