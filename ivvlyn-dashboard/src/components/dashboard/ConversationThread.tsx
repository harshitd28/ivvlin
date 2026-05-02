"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ImageIcon, Loader2, Mic, Send, Video } from "lucide-react";
import type { Channel } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rowToThreadMessage, type ConversationRowInput } from "@/lib/conversations/thread-map";
import { mergeConversationMetadata } from "@/lib/conversations/merge-metadata";
import { isWhatsAppSessionActive } from "@/lib/messaging/whatsapp-session-window";
import {
  loadWaTemplatePresets,
  persistWaTemplatePresets,
  type WaTemplatePreset,
} from "@/lib/inbox/wa-template-presets";

export type ThreadMessage = {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  message: string;
  is_automated: boolean;
  channel: Channel;
  status?: string | null;
  lifecycle_state?: string | null;
};

type Props = {
  clientId: string;
  lead: {
    lead_id: string;
    lead_name: string | null;
    phone: string | null;
    email: string | null;
    channel: Channel;
    /** For WhatsApp 24h session UX */
    last_customer_message_at?: string | null;
  } | null;
  messages: ThreadMessage[];
  mode: "ai" | "human";
  loading?: boolean;
  onMessageSent?: (leadId: string, preview: string) => void;
  /** After outbound queued (text/template/retry) — e.g. refresh queue banner. */
  onMessagingActivity?: () => void;
  /** After lead fields change from this thread (e.g. mode toggle). */
  onLeadUpdated?: () => void;
};

const MEDIA_PREFIX = "[[media]]";
const TYPING_IDLE_MS = 1200;

function idempotencyKeyUiSend(clientId: string, leadId: string) {
  return `ui:${clientId}:${leadId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function idempotencyKeyRetry(clientId: string, leadId: string, conversationId: string) {
  return `retry:${clientId}:${leadId}:${conversationId}:${Date.now()}`;
}

function parseVariableLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

type ParsedMessage =
  | { kind: "text"; text: string }
  | { kind: "media"; mediaType: "image" | "audio" | "video"; url: string; name: string; fallbackText: string };

type DeliveryState = "pending" | "sent" | "failed";

type LocalThreadMessage = ThreadMessage & {
  client_tag?: string;
  delivery_state?: DeliveryState;
  /** Merged into `payload` on enqueue / retry (e.g. WhatsApp template fields). */
  enqueue_payload?: Record<string, unknown>;
};

function encodeMediaMessage(payload: { mediaType: "image" | "audio" | "video"; url: string; name: string }) {
  return `${MEDIA_PREFIX}${JSON.stringify(payload)}`;
}

function parseMessage(message: string): ParsedMessage {
  if (!message.startsWith(MEDIA_PREFIX)) return { kind: "text", text: message };
  const raw = message.slice(MEDIA_PREFIX.length);
  try {
    const parsed = JSON.parse(raw) as { mediaType?: "image" | "audio" | "video"; url?: string; name?: string };
    if (!parsed.mediaType || !parsed.url) return { kind: "text", text: message };
    return {
      kind: "media",
      mediaType: parsed.mediaType,
      url: parsed.url,
      name: parsed.name ?? "attachment",
      fallbackText: `${parsed.mediaType.toUpperCase()} · ${parsed.name ?? "attachment"}`,
    };
  } catch {
    return { kind: "text", text: message };
  }
}

function bubbleBg(direction: "inbound" | "outbound") {
  if (direction === "inbound") return "bg-[#F4F4F2]";
  return "bg-[#0D2818] border border-[#10311f]";
}

function bubbleAlign(direction: "inbound" | "outbound") {
  return direction === "inbound" ? "justify-start" : "justify-end";
}

export default function ConversationThread({
  clientId,
  lead,
  messages,
  mode,
  loading = false,
  onMessageSent,
  onMessagingActivity,
  onLeadUpdated,
}: Props) {
  const [localMode, setLocalMode] = useState<"ai" | "human">(mode);
  const [localMessages, setLocalMessages] = useState<LocalThreadMessage[]>(messages);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplLang, setTplLang] = useState("en_US");
  const [tplParamsRaw, setTplParamsRaw] = useState("");
  const [tplHeaderMode, setTplHeaderMode] = useState<"none" | "text" | "image" | "video" | "document">("none");
  const [tplHeaderRaw, setTplHeaderRaw] = useState("");
  const [tplHeaderMediaUrl, setTplHeaderMediaUrl] = useState("");
  const [tplHeaderDocFilename, setTplHeaderDocFilename] = useState("");
  const [tplUrlButtonIndex, setTplUrlButtonIndex] = useState("0");
  const [tplUrlButtonSuffix, setTplUrlButtonSuffix] = useState("");
  const [tplQrButtonIndex, setTplQrButtonIndex] = useState("1");
  const [tplQrButtonPayload, setTplQrButtonPayload] = useState("");
  const [tplPresetLabel, setTplPresetLabel] = useState("");
  const [presetList, setPresetList] = useState<WaTemplatePreset[]>([]);
  const [presetSelectId, setPresetSelectId] = useState("");
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<"image" | "audio" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingSince, setTypingSince] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const tempIdRef = useRef(0);
  const uploadIdRef = useRef(0);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  useEffect(() => {
    if (clientId === "demo-client") {
      setPresetList([]);
      setPresetSelectId("");
      setPresetNotice(null);
      setPresetsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPresets() {
      setPresetsLoading(true);
      setPresetNotice(null);
      try {
        const res = await fetch("/api/inbox/wa-template-presets", { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          presets?: WaTemplatePreset[];
          message?: string;
        };
        if (cancelled) return;

        if (!res.ok || !data.ok || !Array.isArray(data.presets)) {
          setPresetList(loadWaTemplatePresets(clientId));
          setPresetNotice(
            data.message ?? "Could not load team presets — showing browser-only cache."
          );
          return;
        }

        let list = data.presets;
        if (list.length === 0) {
          const local = loadWaTemplatePresets(clientId);
          if (local.length > 0) {
            const migrated: WaTemplatePreset[] = [];
            for (const p of local) {
              const r = await fetch("/api/inbox/wa-template-presets", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  label: p.label,
                  template_name: p.template_name,
                  template_language: p.template_language,
                  params_lines: p.params_lines,
                  header_params_lines: p.header_params_lines ?? "",
                  url_button_index: p.url_button_index ?? "",
                  url_button_suffix: p.url_button_suffix ?? "",
                  header_media_kind: p.header_media_kind ?? "",
                  header_media_url: p.header_media_url ?? "",
                  header_document_filename: p.header_document_filename ?? "",
                }),
              });
              const j = (await r.json().catch(() => ({}))) as { ok?: boolean; preset?: WaTemplatePreset };
              if (r.ok && j.ok && j.preset) migrated.push(j.preset);
            }
            if (migrated.length > 0) {
              persistWaTemplatePresets(clientId, []);
              list = migrated;
            }
          }
        }

        setPresetList(list);
      } finally {
        if (!cancelled) setPresetsLoading(false);
      }
    }

    void loadPresets();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!lead?.lead_id) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation-live-${lead.lead_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `lead_id=eq.${lead.lead_id}` },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const tm = rowToThreadMessage(raw as ConversationRowInput);
          const meta = (raw.metadata as Record<string, unknown> | undefined) ?? {};
          const queued =
            String(meta.queue_status ?? "").toLowerCase() === "queued" ||
            String(meta.delivery_status ?? "").toLowerCase() === "queued" ||
            String(tm.lifecycle_state ?? "").toLowerCase() === "queued" ||
            String(tm.status ?? "").toLowerCase() === "queued";
          setLocalMessages((prev) => {
            if (prev.some((m) => m.id === tm.id)) return prev;
            const stripMatchingTemp = prev.filter(
              (m) =>
                !(
                  m.client_tag &&
                  tm.direction === "outbound" &&
                  m.direction === "outbound" &&
                  m.message === tm.message &&
                  m.delivery_state === "pending"
                )
            );
            if (tm.direction === "outbound") {
              const pendingIdx = stripMatchingTemp.findIndex(
                (m) => m.direction === "outbound" && m.delivery_state === "pending" && m.message === tm.message
              );
              if (pendingIdx !== -1) {
                const copy = [...stripMatchingTemp];
                copy[pendingIdx] = {
                  ...tm,
                  delivery_state: queued ? "pending" : "sent",
                };
                return copy;
              }
            }
            return [
              ...stripMatchingTemp,
              {
                ...tm,
                delivery_state: tm.direction === "outbound" ? (queued ? "pending" : "sent") : undefined,
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `lead_id=eq.${lead.lead_id}` },
        (payload) => {
          const tm = rowToThreadMessage(payload.new as ConversationRowInput);
          setLocalMessages((prev) =>
            prev.map((m) => {
              if (m.id !== tm.id) return m;
              const lc = String(tm.lifecycle_state ?? tm.status ?? "").toLowerCase();
              const nextDelivery =
                tm.direction === "outbound"
                  ? lc === "failed"
                    ? "failed"
                    : ["sent", "delivered", "read"].includes(lc)
                      ? "sent"
                      : lc === "queued"
                        ? "pending"
                        : m.delivery_state
                  : m.delivery_state;
              return { ...m, ...tm, delivery_state: nextDelivery };
            })
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lead?.lead_id]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [localMessages]);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !sending && !uploading && !!lead?.lead_id,
    [draft, sending, uploading, lead?.lead_id]
  );

  const sessionClosedHuman =
    lead?.channel === "whatsapp" &&
    localMode === "human" &&
    !isWhatsAppSessionActive(lead.last_customer_message_at ?? null);

  const showTemplateComposer = lead?.channel === "whatsapp" && clientId !== "demo-client";

  function setTypingWithDebounce(nextValue: string) {
    setDraft(nextValue);
    const hasText = nextValue.trim().length > 0;
    if (!hasText) {
      setIsTyping(false);
      setTypingSince(null);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      return;
    }
    if (!isTyping) {
      setIsTyping(true);
      setTypingSince(Date.now());
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingSince(null);
    }, TYPING_IDLE_MS);
  }

  useEffect(() => {
    const timers = statusTimersRef.current;
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  function addPendingOutgoingMessage(message: string, enqueuePayload?: Record<string, unknown>) {
    tempIdRef.current += 1;
    const tag = `tmp-${lead?.lead_id ?? "lead"}-${tempIdRef.current}`;
    const temp: LocalThreadMessage = {
      id: tag,
      client_tag: tag,
      created_at: new Date().toISOString(),
      direction: "outbound",
      message,
      is_automated: localMode === "ai",
      channel: lead?.channel ?? "whatsapp",
      status: "sent",
      delivery_state: "pending",
      ...(enqueuePayload ? { enqueue_payload: enqueuePayload } : {}),
    };
    setLocalMessages((prev) => [...prev, temp]);
    return tag;
  }

  function markPendingAsFailed(tag: string) {
    setLocalMessages((prev) => prev.map((m) => (m.client_tag === tag ? { ...m, delivery_state: "failed" } : m)));
  }

  function markPendingAsSent(tag: string) {
    setLocalMessages((prev) => prev.map((m) => (m.client_tag === tag ? { ...m, delivery_state: "sent" } : m)));
  }

  async function sendMessage(text: string) {
    if (!lead?.lead_id) return;
    const clean = text.trim();
    if (!clean.length) return;
    const useQueue = clientId !== "demo-client";
    const tag = addPendingOutgoingMessage(clean);
    setSending(true);
    setSendError(null);

    if (useQueue) {
      const idemKey = idempotencyKeyUiSend(clientId, lead.lead_id);
      const res = await fetch("/api/messaging/outbound/enqueue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify({
          lead_id: lead.lead_id,
          message: clean,
          is_automated: localMode === "ai",
          channel: lead.channel,
          priority: localMode === "human" ? 20 : 5,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        conversation_id?: string;
        message?: string;
      };
      if (res.ok && data.ok && data.conversation_id) {
        setDraft("");
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.client_tag === tag
              ? {
                  ...m,
                  id: data.conversation_id!,
                  status: "queued",
                  lifecycle_state: "queued",
                  delivery_state: "pending",
                }
              : m
          )
        );
        if (lead?.lead_id) onMessageSent?.(lead.lead_id, clean);
        onMessagingActivity?.();
      } else {
        markPendingAsFailed(tag);
        if (data.message) setSendError(data.message);
      }
      setSending(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      markPendingAsFailed(tag);
      setSending(false);
      return;
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("conversations").insert({
      client_id: clientId,
      lead_id: lead.lead_id,
      channel: lead.channel,
      direction: "outbound",
      sender: localMode === "ai" ? "system" : "agent",
      content: clean,
      timestamp: now,
      last_message_at: now,
      updated_at: now,
      metadata: { is_automated: localMode === "ai", delivery_status: "sent" },
    });
    if (!error) {
      setDraft("");
      markPendingAsSent(tag);
      queueAutoProgress(tag);
      if (lead?.lead_id) onMessageSent?.(lead.lead_id, clean);
    } else {
      markPendingAsFailed(tag);
    }
    setSending(false);
  }

  function parseTemplateParams(): string[] {
    return parseVariableLines(tplParamsRaw);
  }

  function applyPresetById(id: string) {
    if (!id) {
      setPresetSelectId("");
      return;
    }
    const p = presetList.find((x) => x.id === id);
    if (!p) return;
    setTplName(p.template_name);
    setTplLang(p.template_language || "en_US");
    setTplParamsRaw(p.params_lines ?? "");
    const mk = (p.header_media_kind ?? "").toLowerCase().trim();
    if (mk === "image" || mk === "video" || mk === "document") {
      setTplHeaderMode(mk);
      setTplHeaderMediaUrl(p.header_media_url ?? "");
      setTplHeaderDocFilename(p.header_document_filename ?? "");
      setTplHeaderRaw("");
    } else if ((p.header_params_lines ?? "").trim()) {
      setTplHeaderMode("text");
      setTplHeaderRaw(p.header_params_lines ?? "");
      setTplHeaderMediaUrl("");
      setTplHeaderDocFilename("");
    } else {
      setTplHeaderMode("none");
      setTplHeaderRaw("");
      setTplHeaderMediaUrl("");
      setTplHeaderDocFilename("");
    }
    setTplUrlButtonIndex((p.url_button_index ?? "").trim() || "0");
    setTplUrlButtonSuffix(p.url_button_suffix ?? "");
    setPresetSelectId(id);
  }

  async function saveCurrentPreset() {
    if (clientId === "demo-client" || !tplName.trim()) return;
    const label = tplPresetLabel.trim() || tplName.trim();
    setPresetNotice(null);

    const res = await fetch("/api/inbox/wa-template-presets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        template_name: tplName.trim(),
        template_language: tplLang.trim() || "en_US",
        params_lines: tplParamsRaw,
        header_params_lines: tplHeaderMode === "text" ? tplHeaderRaw : "",
        url_button_index: tplUrlButtonIndex,
        url_button_suffix: tplUrlButtonSuffix,
        header_media_kind: tplHeaderMode === "image" || tplHeaderMode === "video" || tplHeaderMode === "document" ? tplHeaderMode : "",
        header_media_url:
          tplHeaderMode === "image" || tplHeaderMode === "video" || tplHeaderMode === "document" ? tplHeaderMediaUrl : "",
        header_document_filename: tplHeaderMode === "document" ? tplHeaderDocFilename : "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      preset?: WaTemplatePreset;
      message?: string;
    };

    if (res.ok && data.ok && data.preset) {
      setPresetList((prev) => [...prev, data.preset!]);
      setPresetSelectId(data.preset.id);
      setTplPresetLabel("");
      persistWaTemplatePresets(clientId, []);
      return;
    }

    const fallback: WaTemplatePreset = {
      id: crypto.randomUUID(),
      label,
      template_name: tplName.trim(),
      template_language: tplLang.trim() || "en_US",
      params_lines: tplParamsRaw,
      header_params_lines: tplHeaderMode === "text" ? tplHeaderRaw : "",
      url_button_index: tplUrlButtonIndex,
      url_button_suffix: tplUrlButtonSuffix,
      header_media_kind:
        tplHeaderMode === "image" || tplHeaderMode === "video" || tplHeaderMode === "document" ? tplHeaderMode : "",
      header_media_url:
        tplHeaderMode === "image" || tplHeaderMode === "video" || tplHeaderMode === "document" ? tplHeaderMediaUrl : "",
      header_document_filename: tplHeaderMode === "document" ? tplHeaderDocFilename : "",
    };
    const merged = [...presetList, fallback];
    setPresetList(merged);
    persistWaTemplatePresets(clientId, merged);
    setPresetSelectId(fallback.id);
    setTplPresetLabel("");
    setPresetNotice(data.message ?? "Saved locally only (team sync unavailable).");
  }

  async function removeSelectedPreset() {
    if (clientId === "demo-client" || !presetSelectId) return;
    setPresetNotice(null);

    const res = await fetch(
      `/api/inbox/wa-template-presets?id=${encodeURIComponent(presetSelectId)}`,
      { method: "DELETE", credentials: "include" }
    );
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };

    if (res.ok && data.ok) {
      setPresetList((prev) => prev.filter((x) => x.id !== presetSelectId));
      setPresetSelectId("");
      return;
    }

    setPresetNotice(data.message ?? "Could not remove preset.");
  }

  async function sendTemplate() {
    if (!lead?.lead_id || clientId === "demo-client") return;
    const name = tplName.trim();
    if (!name.length) return;
    const params = parseTemplateParams();
    const headerParams = tplHeaderMode === "text" ? parseVariableLines(tplHeaderRaw) : [];
    const urlIdx = tplUrlButtonIndex.trim() || "0";
    const urlSuffix = tplUrlButtonSuffix.trim();
    const qrIdx = tplQrButtonIndex.trim() || "1";
    const qrPayload = tplQrButtonPayload.trim();

    const template_buttons: Array<{ index: string; sub_type: "url" | "quick_reply"; parameters: string[] }> = [];
    if (urlSuffix.length > 0) {
      template_buttons.push({ index: urlIdx, sub_type: "url", parameters: [urlSuffix] });
    }
    if (qrPayload.length > 0) {
      template_buttons.push({ index: qrIdx, sub_type: "quick_reply", parameters: [qrPayload] });
    }

    const previewBits: string[] = [];
    if (tplHeaderMode === "text" && headerParams.length) previewBits.push(`header: ${headerParams.join(", ")}`);
    if (tplHeaderMode === "image") previewBits.push("header: image");
    if (tplHeaderMode === "video") previewBits.push("header: video");
    if (tplHeaderMode === "document") previewBits.push("header: document");
    if (params.length) previewBits.push(params.join(" · "));
    if (urlSuffix.length) previewBits.push(`url btn [${urlIdx}]: ${urlSuffix}`);
    if (qrPayload.length) previewBits.push(`quick_reply [${qrIdx}]: ${qrPayload}`);
    const preview =
      `[Template: ${name}]` + (previewBits.length ? ` · ${previewBits.join(" · ")}` : "");
    const enqueuePayload: Record<string, unknown> = {
      whatsapp_kind: "template",
      template_name: name,
      template_language: tplLang.trim() || "en_US",
      template_body_params: params,
      template_buttons,
    };
    if (tplHeaderMode === "text" && headerParams.length > 0) {
      enqueuePayload.template_header_params = headerParams;
    }
    if (tplHeaderMode === "image" || tplHeaderMode === "video" || tplHeaderMode === "document") {
      enqueuePayload.template_header_media_kind = tplHeaderMode;
      enqueuePayload.template_header_media_url = tplHeaderMediaUrl.trim();
      if (tplHeaderMode === "document" && tplHeaderDocFilename.trim()) {
        enqueuePayload.template_header_document_filename = tplHeaderDocFilename.trim();
      }
    }
    const tag = addPendingOutgoingMessage(preview, enqueuePayload);
    setSendingTemplate(true);
    setSendError(null);

    const idemKey = idempotencyKeyUiSend(clientId, lead.lead_id);
    const res = await fetch("/api/messaging/outbound/enqueue", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
      body: JSON.stringify({
        lead_id: lead.lead_id,
        message: preview,
        payload: enqueuePayload,
        is_automated: localMode === "ai",
        channel: lead.channel,
        priority: localMode === "human" ? 20 : 5,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      conversation_id?: string;
      message?: string;
    };
    if (res.ok && data.ok && data.conversation_id) {
      setTplParamsRaw("");
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.client_tag === tag
            ? {
                ...m,
                id: data.conversation_id!,
                status: "queued",
                lifecycle_state: "queued",
                delivery_state: "pending",
              }
            : m
        )
      );
      if (lead?.lead_id) onMessageSent?.(lead.lead_id, preview);
      onMessagingActivity?.();
    } else {
      markPendingAsFailed(tag);
      if (data.message) setSendError(data.message);
    }
    setSendingTemplate(false);
  }

  async function retryMessage(localId: string) {
    const target = localMessages.find((m) => m.id === localId);
    if (!target || !lead?.lead_id) return;
    setLocalMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, delivery_state: "pending" } : m)));

    if (clientId !== "demo-client") {
      const idemKey = idempotencyKeyRetry(clientId, lead.lead_id, localId);
      const retryBody: Record<string, unknown> = {
        lead_id: lead.lead_id,
        message: target.message,
        is_automated: localMode === "ai",
        channel: lead.channel,
        priority: 30,
      };
      if (target.enqueue_payload && typeof target.enqueue_payload === "object") {
        retryBody.payload = target.enqueue_payload;
      }
      const res = await fetch("/api/messaging/outbound/enqueue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify(retryBody),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        conversation_id?: string;
        message?: string;
      };
      if (res.ok && data.ok && data.conversation_id) {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === localId
              ? {
                  ...m,
                  id: data.conversation_id!,
                  status: "queued",
                  lifecycle_state: "queued",
                  delivery_state: "pending",
                }
              : m
          )
        );
        setSendError(null);
        onMessagingActivity?.();
      } else {
        setLocalMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, delivery_state: "failed" } : m)));
        if (data.message) setSendError(data.message);
      }
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("conversations").insert({
      client_id: clientId,
      lead_id: lead.lead_id,
      channel: lead.channel,
      direction: "outbound",
      sender: localMode === "ai" ? "system" : "agent",
      content: target.message,
      timestamp: now,
      last_message_at: now,
      updated_at: now,
      metadata: { is_automated: localMode === "ai", delivery_status: "sent" },
    });
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.id === localId
          ? {
              ...m,
              delivery_state: error ? "failed" : "sent",
            }
          : m
      )
    );
    if (!error) queueAutoProgress(localId);
  }

  async function toggleMode() {
    if (!lead?.lead_id) return;
    const next: "ai" | "human" = localMode === "ai" ? "human" : "ai";
    if (clientId === "demo-client") {
      setLocalMode(next);
      return;
    }
    const res = await fetch("/api/inbox/leads", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.lead_id, mode: next }),
    });
    if (res.ok) {
      setLocalMode(next);
      onLeadUpdated?.();
    }
  }

  function receiptLabel(message: LocalThreadMessage) {
    if (message.delivery_state === "pending") {
      const st = (message.status ?? message.lifecycle_state ?? "").toLowerCase();
      if (st === "queued") return "Queued…";
      return "Sending…";
    }
    if (message.delivery_state === "failed") return "Failed";
    const status = (message.lifecycle_state ?? message.status ?? "sent").toLowerCase();
    if (status === "read") return "Read";
    if (status === "delivered") return "Delivered";
    if (status === "queued") return "Queued…";
    return "Sent";
  }

  async function updateStatus(messageId: string, nextStatus: "sent" | "delivered" | "read") {
    if (clientId === "demo-client") {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: nextStatus, lifecycle_state: nextStatus, delivery_state: "sent" } : m
        )
      );
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await mergeConversationMetadata(supabase, messageId, { delivery_status: nextStatus });
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, lifecycle_state: nextStatus, status: nextStatus, delivery_state: "sent" } : m
      )
    );
  }

  function queueAutoProgress(messageId: string) {
    const deliveredTimer = setTimeout(() => {
      void updateStatus(messageId, "delivered");
    }, 1800);
    const readTimer = setTimeout(() => {
      void updateStatus(messageId, "read");
    }, 5200);
    statusTimersRef.current[`${messageId}-delivered`] = deliveredTimer;
    statusTimersRef.current[`${messageId}-read`] = readTimer;
  }

  async function uploadMedia(file: File, kind: "image" | "audio" | "video") {
    if (!lead?.lead_id) return null;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return null;
    const ext = file.name.includes(".") ? file.name.split(".").pop() : kind;
    const safeExt = (ext || kind).replace(/[^a-zA-Z0-9]/g, "");
    uploadIdRef.current += 1;
    const path = `client-${clientId}/lead-${lead.lead_id}/upload-${uploadIdRef.current}.${safeExt}`;
    const { error: uploadErr } = await supabase.storage.from("conversation-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (uploadErr) return null;
    const { data: signed, error: signErr } = await supabase.storage.from("conversation-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (!signErr && signed?.signedUrl) return signed.signedUrl;
    const { data } = supabase.storage.from("conversation-media").getPublicUrl(path);
    return data.publicUrl || null;
  }

  async function onPickFile(file: File, kind: "image" | "audio" | "video") {
    if (!lead?.lead_id) return;
    setUploading(true);
    const publicUrl = await uploadMedia(file, kind);
    if (!publicUrl) {
      await sendMessage(`[${kind.toUpperCase()}] ${file.name}`);
      setUploading(false);
      return;
    }
    const encoded = encodeMediaMessage({ mediaType: kind, url: publicUrl, name: file.name });
    await sendMessage(encoded);
    if (lead?.lead_id) onMessageSent?.(lead.lead_id, `${kind.toUpperCase()} · ${file.name}`);
    setUploading(false);
  }

  function openPicker(kind: "image" | "audio" | "video") {
    setUploadingType(kind);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#1A1A1A] bg-[#111111] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#777]">Conversation</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#8b8b8b]">
        <span>{lead?.lead_name ?? "Lead"}</span>
        <span>•</span>
        <span>{lead?.phone ?? "No phone"}</span>
        <span>•</span>
        <span>{lead?.email ?? "No email"}</span>
      </div>
      <div className="mt-1 h-4 text-[11px] text-[#6f6f6f]">{isTyping && typingSince ? "Typing..." : ""}</div>

      {sessionClosedHuman ? (
        <div className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-[12px] text-amber-100/95">
          Outside the WhatsApp customer care window (no inbound message in the last 24h). Plain text from manual mode
          will not send — use <strong className="font-medium">Send approved WhatsApp template</strong> below (Meta-approved
          template name + language).
        </div>
      ) : null}

      <div ref={scrollRef} className="mt-2 min-h-0 flex-1 space-y-3 overflow-auto pr-2 pb-4">
        {loading ? (
          <div className="rounded-xl border border-[#1A1A1A] p-6 text-center text-[13px] text-[#777]">Loading conversation...</div>
        ) : null}
        {localMessages.length === 0 ? (
          <div className="rounded-xl border border-[#1A1A1A] p-6 text-center text-[13px] text-[#777]">
            No conversation yet.
          </div>
        ) : (
          localMessages.map((m) => {
            const align = bubbleAlign(m.direction);
            return (
              <div key={m.id} className={`flex ${align}`}>
                <div
                  className={`max-w-[520px] rounded-xl px-4 py-3 border border-[#E8E8E8] ${bubbleBg(
                    m.direction
                  )}`}
                >
                  {(() => {
                    const parsed = parseMessage(m.message);
                    if (parsed.kind === "text") {
                      return (
                        <div className={`text-[13px] leading-relaxed ${m.direction === "inbound" ? "text-[#1a1a1a]" : "text-white"}`}>
                          {parsed.text}
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <div className={`text-[11px] ${m.direction === "inbound" ? "text-[#555]" : "text-[#c8d8cf]"}`}>{parsed.fallbackText}</div>
                        {parsed.mediaType === "image" ? (
                          <a href={parsed.url} target="_blank" rel="noreferrer" className="block">
                            <img src={parsed.url} alt={parsed.name} className="max-h-[220px] w-auto rounded-md border border-black/10" />
                          </a>
                        ) : null}
                        {parsed.mediaType === "audio" ? (
                          <audio controls className="w-[260px] max-w-full">
                            <source src={parsed.url} />
                          </audio>
                        ) : null}
                        {parsed.mediaType === "video" ? (
                          <video controls className="max-h-[220px] w-auto max-w-full rounded-md border border-black/10">
                            <source src={parsed.url} />
                          </video>
                        ) : null}
                      </div>
                    );
                  })()}
                  <div className={`mt-1 text-[11px] ${m.direction === "inbound" ? "text-[#666]" : "text-[#c8d8cf]"}`}>
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: false })} ago
                    {m.direction === "outbound" && m.delivery_state ? (
                      <span className="ml-2">• {receiptLabel(m)}</span>
                    ) : null}
                  </div>
                  {m.direction === "outbound" && m.delivery_state === "failed" ? (
                    <button
                      type="button"
                      onClick={() => void retryMessage(m.id)}
                      className="mt-2 rounded-md border border-[#39444d] px-2 py-1 text-[11px] text-[#d6e2ea] hover:border-[#6a7987]"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3 border-t border-[#1A1A1A] pt-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-[#9a9a9a]">
            {localMode === "ai" ? "Vaani is handling this conversation." : "Manual mode enabled."}
          </div>
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-1.5 text-[12px] text-[#E5E5E5] hover:border-[#3a3a3a]"
          >
            {localMode === "ai" ? "Take over manually" : "Hand back to AI"}
          </button>
        </div>

        {showTemplateComposer ? (
          <details className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2">
            <summary className="cursor-pointer text-[12px] text-[#c4c4c4] select-none marker:text-[#666]">
              Send approved WhatsApp template
            </summary>
            <div className="mt-3 space-y-2 pb-1">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[160px] flex-1 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">
                    Preset <span className="font-normal normal-case text-[#555]">(team)</span>
                  </span>
                  <select
                    value={presetSelectId}
                    onChange={(e) => applyPresetById(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white"
                  >
                    <option value="">Custom</option>
                    {presetList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-[120px] flex-1 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Save as</span>
                  <input
                    value={tplPresetLabel}
                    onChange={(e) => setTplPresetLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
                <div className="flex gap-1 pb-0.5">
                  <button
                    type="button"
                    disabled={!tplName.trim() || clientId === "demo-client" || presetsLoading}
                    onClick={() => void saveCurrentPreset()}
                    className="h-9 rounded-lg border border-[#3a3a3a] px-2 text-[11px] text-[#ddd] hover:border-[#555] disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={!presetSelectId || clientId === "demo-client" || presetsLoading}
                    onClick={() => void removeSelectedPreset()}
                    className="h-9 rounded-lg border border-[#3a3a3a] px-2 text-[11px] text-[#aaa] hover:border-[#555] disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {presetNotice ? (
                <p className="text-[11px] text-amber-200/90">{presetNotice}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Template name</span>
                  <input
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="hello_world"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Language code</span>
                  <input
                    value={tplLang}
                    onChange={(e) => setTplLang(e.target.value)}
                    placeholder="en_US"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#666]">Body variables (one per line)</span>
                <textarea
                  value={tplParamsRaw}
                  onChange={(e) => setTplParamsRaw(e.target.value)}
                  rows={3}
                  placeholder={"Line 1: first name\nLine 2: order id"}
                  className="w-full resize-y rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 py-1.5 text-[12px] text-white placeholder:text-[#555]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#666]">Header format</span>
                <select
                  value={tplHeaderMode}
                  onChange={(e) =>
                    setTplHeaderMode(e.target.value as "none" | "text" | "image" | "video" | "document")
                  }
                  className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white"
                >
                  <option value="none">No header variables</option>
                  <option value="text">Text variables (one per line)</option>
                  <option value="image">Image (public HTTPS URL)</option>
                  <option value="video">Video (public HTTPS URL)</option>
                  <option value="document">Document (public HTTPS URL)</option>
                </select>
              </label>
              {tplHeaderMode === "text" ? (
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Header text variables</span>
                  <textarea
                    value={tplHeaderRaw}
                    onChange={(e) => setTplHeaderRaw(e.target.value)}
                    rows={2}
                    placeholder="Matches TEXT header placeholders in your approved template"
                    className="w-full resize-y rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 py-1.5 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
              ) : null}
              {tplHeaderMode === "image" || tplHeaderMode === "video" || tplHeaderMode === "document" ? (
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Media URL (HTTPS)</span>
                  <input
                    value={tplHeaderMediaUrl}
                    onChange={(e) => setTplHeaderMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
              ) : null}
              {tplHeaderMode === "document" ? (
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Filename (optional)</span>
                  <input
                    value={tplHeaderDocFilename}
                    onChange={(e) => setTplHeaderDocFilename(e.target.value)}
                    placeholder="brochure.pdf"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
              ) : null}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr]">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">URL btn #</span>
                  <input
                    value={tplUrlButtonIndex}
                    onChange={(e) => setTplUrlButtonIndex(e.target.value)}
                    placeholder="0"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">
                    URL button dynamic suffix (optional)
                  </span>
                  <input
                    value={tplUrlButtonSuffix}
                    onChange={(e) => setTplUrlButtonSuffix(e.target.value)}
                    placeholder="Appended to URL per Meta template config"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr]">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">Quick reply #</span>
                  <input
                    value={tplQrButtonIndex}
                    onChange={(e) => setTplQrButtonIndex(e.target.value)}
                    placeholder="1"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#666]">
                    Quick reply payload (optional)
                  </span>
                  <input
                    value={tplQrButtonPayload}
                    onChange={(e) => setTplQrButtonPayload(e.target.value)}
                    placeholder="Shown on button; maps to template quick_reply slot"
                    className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 text-[12px] text-white placeholder:text-[#555]"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={sendingTemplate || sending || !tplName.trim() || uploading}
                onClick={() => void sendTemplate()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#3d2d10] bg-[#2a2108] px-3 py-2 text-[12px] text-amber-100 disabled:opacity-50 hover:border-[#5c4420]"
              >
                {sendingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Queue template send
              </button>
              <p className="text-[11px] text-[#666]">
                Uses the same queue as free-form messages. Template must be approved in Meta Business Manager for this WABA.
                Header and URL-button fields must match your template&apos;s components (see Meta Cloud API template message format).
              </p>
            </div>
          </details>
        ) : null}

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openPicker("image")} className="rounded-md border border-[#2A2A2A] p-2 text-[#B5B5B5] hover:border-[#3A3A3A]">
            <ImageIcon size={15} />
          </button>
          <button type="button" onClick={() => openPicker("audio")} className="rounded-md border border-[#2A2A2A] p-2 text-[#B5B5B5] hover:border-[#3A3A3A]">
            <Mic size={15} />
          </button>
          <button type="button" onClick={() => openPicker("video")} className="rounded-md border border-[#2A2A2A] p-2 text-[#B5B5B5] hover:border-[#3A3A3A]">
            <Video size={15} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={uploadingType === "image" ? "image/*" : uploadingType === "audio" ? "audio/*" : "video/*"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f || !uploadingType) return;
              void onPickFile(f, uploadingType);
            }}
          />
          <input
            value={draft}
            onChange={(e) => setTypingWithDebounce(e.target.value)}
            placeholder={uploading ? "Uploading media..." : "Type a message..."}
            className="h-10 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-[13px] text-white outline-none placeholder:text-[#666]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void sendMessage(draft);
              }
            }}
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={() => void sendMessage(draft)}
            className="inline-flex h-10 items-center rounded-lg border border-[#0f2e1d] bg-[#0D2818] px-3 text-white disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
        {sendError ? <div className="text-[12px] text-red-400">{sendError}</div> : null}
      </div>

    </div>
  );
}

