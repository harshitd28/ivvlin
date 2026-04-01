"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PROMPT_TEMPLATE = `═══ IDENTITY ═══
You are [AGENT_NAME], a warm and professional consultant at [BUSINESS_NAME].
You work exclusively for [BUSINESS_NAME].
Never mention any competitor.
Sound like a real human — never robotic.
Use emojis naturally where they add warmth.
Never say you are an AI or a bot.

═══ BUSINESS PROFILE ═══
Business: [BUSINESS_NAME]
Location: [CITY], [STATE]
[ADD YOUR BUSINESS DESCRIPTION HERE]

═══ CURRENT OFFERINGS ═══
[ADD YOUR PRODUCTS/SERVICES HERE]
Example for real estate:
PROJECT 1: [Project Name]
  Location: [Area, City]
  Type: [Residential/Commercial]
  Configurations: [BHK types + sizes + prices]
  Possession: [Date]
  Amenities: [List]
  USP: [What makes it special]

═══ PRICING RULES ═══
[ADD YOUR PRICING RULES]
Never quote below minimum price.
Always quote a range, never exact.
Discounts only if lead explicitly asks.

═══ SALES INSTRUCTIONS ═══
Primary goal: Book a site visit.
Secondary goal: Understand budget and timeline.
Never send all details at once.
Ask one question at a time.
[ADD YOUR CUSTOM INSTRUCTIONS]

═══ LANGUAGE RULES ═══
Detect language from lead's message.
Hindi/Hinglish → reply in Hinglish.
English → reply in warm English.
Always use lead's first name.
Maximum 3-4 sentences per reply.`;

type TestResult = { ok: boolean; message: string } | null;

export default function AdminNewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [created, setCreated] = useState<{ id: string; email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult>>({});

  const [form, setForm] = useState({
    business_name: "",
    agent_name: "Vaani",
    industry: "Real Estate",
    city: "",
    state: "",
    client_email: "",
    temp_password: "",
    full_name: "",
    whatsapp_enabled: true,
    whatsapp_phone_id: "",
    whatsapp_access_token: "",
    whatsapp_business_number: "",
    instagram_enabled: false,
    instagram_page_id: "",
    instagram_access_token: "",
    facebook_enabled: false,
    facebook_page_id: "",
    facebook_access_token: "",
    sms_enabled: false,
    msg91_auth_key: "",
    msg91_sender_id: "",
    email_enabled: false,
    salesperson_phone: "",
    owner_email: "",
    briefing_time: "09:00",
    alert_score_threshold: 70,
    claude_model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system_prompt: PROMPT_TEMPLATE,
  });

  const promptPreview = useMemo(
    () =>
      form.system_prompt
        .replaceAll("[AGENT_NAME]", form.agent_name || "Vaani")
        .replaceAll("[BUSINESS_NAME]", form.business_name || "Business Name")
        .replaceAll("[CITY]", form.city || "City")
        .replaceAll("[STATE]", form.state || "State"),
    [form]
  );

  async function runTest(kind: "whatsapp" | "instagram" | "facebook" | "msg91") {
    const payload =
      kind === "whatsapp"
        ? { phone_id: form.whatsapp_phone_id, access_token: form.whatsapp_access_token }
        : kind === "instagram"
          ? { page_id: form.instagram_page_id, access_token: form.instagram_access_token }
          : kind === "facebook"
            ? { page_id: form.facebook_page_id, access_token: form.facebook_access_token }
            : { auth_key: form.msg91_auth_key, sender_id: form.msg91_sender_id };

    const res = await fetch(`/api/test/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({ success: false, message: "Failed" }))) as {
      success?: boolean;
      message?: string;
    };
    setTests((prev) => ({
      ...prev,
      [kind]: { ok: Boolean(data.success), message: data.message ?? "Completed" },
    }));
  }

  async function onSave() {
    setError(null);
    if (!form.business_name || !form.client_email || !form.temp_password) {
      setError("Business name, client email and temporary password are required.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/clients/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string; clientId?: string; login?: { email: string; password: string } }
      | null;
    setSaving(false);

    if (!res.ok || !data?.ok || !data.clientId || !data.login) {
      setError(data?.message ?? "Unable to create client");
      return;
    }

    setCreated({ id: data.clientId, email: data.login.email, password: data.login.password });
  }

  const tokenCost = ((Number(form.max_tokens) / 1000) * 0.024).toFixed(3);

  return (
    <div className="p-8 pt-0 max-w-5xl space-y-6">
      <div className="sticky top-0 bg-[#FAFAF8] py-2 z-20 flex items-center justify-between">
        <h1 className="text-[22px] font-medium text-[#0A0A0A]">Onboard New Client</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/clients")}
          className="h-9 px-3 rounded-lg border border-[#e5e5e5] text-[13px]"
        >
          Cancel
        </button>
      </div>

      {created ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-[13px] text-green-900">
          <div className="font-medium">Client created. Share these login details with them:</div>
          <div className="mt-2">URL: dashboard.ivvlyn.com/login</div>
          <div>Email: {created.email}</div>
          <div>Password: {created.password}</div>
          <button
            type="button"
            className="mt-3 h-9 px-3 rounded-lg bg-[#0A0A0A] text-white"
            onClick={() => router.push(`/admin/clients/${created.id}`)}
          >
            Open Client
          </button>
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error}</div> : null}

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-4">
        <h2 className="text-[15px] font-medium">1) Business Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Business Name*" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
          <Input label="Agent Name" value={form.agent_name} onChange={(v) => setForm({ ...form, agent_name: v })} />
          <Select
            label="Industry"
            value={form.industry}
            options={["Real Estate", "Hospitality", "Retail", "Healthcare", "Education", "Other"]}
            onChange={(v) => setForm({ ...form, industry: v })}
          />
          <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Input label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
        </div>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-4">
        <h2 className="text-[15px] font-medium">2) Login Credentials</h2>
        <p className="text-[12px] text-[#666]">This creates their dashboard login</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Client Email*" value={form.client_email} onChange={(v) => setForm({ ...form, client_email: v })} />
          <Input
            label="Temporary Password*"
            type="password"
            value={form.temp_password}
            onChange={(v) => setForm({ ...form, temp_password: v })}
          />
          <Input label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        </div>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-4">
        <h2 className="text-[15px] font-medium">3) Channel Configuration</h2>
        <Toggle label="WhatsApp Business" checked={form.whatsapp_enabled} onChange={(v) => setForm({ ...form, whatsapp_enabled: v })} />
        {form.whatsapp_enabled ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Phone Number ID*" value={form.whatsapp_phone_id} onChange={(v) => setForm({ ...form, whatsapp_phone_id: v })} />
            <Input
              label="Access Token*"
              type="password"
              value={form.whatsapp_access_token}
              onChange={(v) => setForm({ ...form, whatsapp_access_token: v })}
            />
            <Input label="WhatsApp Business Number" value={form.whatsapp_business_number} onChange={(v) => setForm({ ...form, whatsapp_business_number: v })} />
            <TestButton onClick={() => runTest("whatsapp")} />
            <InlineTest result={tests.whatsapp ?? null} />
          </div>
        ) : null}

        <Toggle label="Instagram" checked={form.instagram_enabled} onChange={(v) => setForm({ ...form, instagram_enabled: v })} />
        {form.instagram_enabled ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Instagram Page ID" value={form.instagram_page_id} onChange={(v) => setForm({ ...form, instagram_page_id: v })} />
            <Input
              label="Access Token"
              type="password"
              value={form.instagram_access_token}
              onChange={(v) => setForm({ ...form, instagram_access_token: v })}
            />
            <TestButton onClick={() => runTest("instagram")} />
            <InlineTest result={tests.instagram ?? null} />
          </div>
        ) : null}

        <Toggle label="Facebook" checked={form.facebook_enabled} onChange={(v) => setForm({ ...form, facebook_enabled: v })} />
        {form.facebook_enabled ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Facebook Page ID" value={form.facebook_page_id} onChange={(v) => setForm({ ...form, facebook_page_id: v })} />
            <Input
              label="Access Token"
              type="password"
              value={form.facebook_access_token}
              onChange={(v) => setForm({ ...form, facebook_access_token: v })}
            />
            <TestButton onClick={() => runTest("facebook")} />
            <InlineTest result={tests.facebook ?? null} />
          </div>
        ) : null}

        <Toggle label="SMS via MSG91" checked={form.sms_enabled} onChange={(v) => setForm({ ...form, sms_enabled: v })} />
        {form.sms_enabled ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="MSG91 Auth Key" type="password" value={form.msg91_auth_key} onChange={(v) => setForm({ ...form, msg91_auth_key: v })} />
            <Input label="Sender ID (max 6 chars)" value={form.msg91_sender_id} onChange={(v) => setForm({ ...form, msg91_sender_id: v.slice(0, 6) })} />
            <TestButton onClick={() => runTest("msg91")} />
            <InlineTest result={tests.msg91 ?? null} />
          </div>
        ) : null}

        <Toggle label="Email" checked={form.email_enabled} onChange={(v) => setForm({ ...form, email_enabled: v })} />
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-4">
        <h2 className="text-[15px] font-medium">4) Notifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Salesperson WhatsApp Number"
            value={form.salesperson_phone}
            onChange={(v) => setForm({ ...form, salesperson_phone: v })}
          />
          <Input label="Owner Email" value={form.owner_email} onChange={(v) => setForm({ ...form, owner_email: v })} />
          <Input label="Morning Briefing Time" type="time" value={form.briefing_time} onChange={(v) => setForm({ ...form, briefing_time: v })} />
          <div>
            <label className="text-[12px] text-[#555]">Hot Lead Alert Score: {form.alert_score_threshold}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.alert_score_threshold}
              onChange={(e) => setForm({ ...form, alert_score_threshold: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-[11px] text-[#777]">Alert when lead score exceeds {form.alert_score_threshold}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-4">
        <h2 className="text-[15px] font-medium">5) AI Configuration</h2>
        <div className="space-y-2 text-[13px]">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.claude_model === "claude-haiku-4-5-20251001"}
              onChange={() => setForm({ ...form, claude_model: "claude-haiku-4-5-20251001" })}
            />
            <span>claude-haiku-4-5-20251001 - Fast & economical</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.claude_model === "claude-sonnet-4-20250514"}
              onChange={() => setForm({ ...form, claude_model: "claude-sonnet-4-20250514" })}
            />
            <span>claude-sonnet-4-20250514 - Smarter responses</span>
          </label>
        </div>
        <div>
          <label className="text-[12px] text-[#555]">Max Tokens: {form.max_tokens}</label>
          <input
            type="range"
            min={200}
            max={1000}
            value={form.max_tokens}
            onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })}
            className="w-full"
          />
          <p className="text-[11px] text-[#777]">Estimated cost per message: ~₹{tokenCost}</p>
        </div>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-4">
        <h2 className="text-[15px] font-medium">6) System Prompt</h2>
        <div className="flex gap-2 flex-wrap">
          {["[AGENT_NAME]", "[BUSINESS_NAME]", "[CITY]", "[STATE]", "[PROPERTIES]", "[PRICING_RULES]"].map((chip) => (
            <button
              key={chip}
              type="button"
              className="text-[12px] border border-[#e5e5e5] rounded-full px-2.5 py-1"
              onClick={() => setForm((f) => ({ ...f, system_prompt: `${f.system_prompt}\n${chip}` }))}
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          className="w-full min-h-[500px] rounded-xl border border-[#E8E8E8] p-3 font-mono text-[12px]"
        />
        <button type="button" className="h-9 px-3 rounded-lg border border-[#e5e5e5] text-[13px]" onClick={() => setShowPreview(true)}>
          Preview
        </button>
      </section>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="h-10 px-4 rounded-lg bg-[#0A0A0A] text-white text-[13px] disabled:opacity-60"
        >
          {saving ? "Creating..." : "Save & Create Client"}
        </button>
        <button type="button" className="h-10 px-4 rounded-lg border border-[#E8E8E8] text-[13px]" onClick={() => router.push("/admin/clients")}>
          Cancel
        </button>
      </div>

      {showPreview ? (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-white rounded-xl border border-[#e5e5e5] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-medium">Prompt Preview</h3>
              <button type="button" onClick={() => setShowPreview(false)} className="text-[13px] text-[#666]">
                Close
              </button>
            </div>
            <pre className="mt-4 max-h-[65vh] overflow-auto text-[12px] leading-relaxed bg-[#fafafa] border border-[#eee] rounded-lg p-3 whitespace-pre-wrap">
              {promptPreview}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[12px] text-[#555]">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-[#E8E8E8] px-3 text-[13px]" />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[12px] text-[#555]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-[#E8E8E8] px-3 text-[13px] bg-white">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-[#E8E8E8] px-3 py-2">
      <span className="text-[13px]">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function TestButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-10 px-3 rounded-lg border border-[#E8E8E8] text-[13px] w-fit">
      Test Connection
    </button>
  );
}

function InlineTest({ result }: { result: TestResult }) {
  if (!result) return null;
  return <div className={`text-[12px] ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.message}</div>;
}

