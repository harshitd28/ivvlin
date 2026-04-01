import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">{label}</div>
      {children}
      {hint ? <div className="text-[#555] text-[12px]">{hint}</div> : null}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="p-8 pt-14 space-y-6">
      <div>
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Admin Settings</h1>
        <p className="text-[#555] text-[13px] mt-2">Meta, Claude, system config, and billing placeholder.</p>
      </div>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8] space-y-4">
        <div className="text-[#0A0A0A] text-[14px] font-medium">META API GLOBAL</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default WhatsApp Template IDs">
            <Input placeholder="e.g. template_id_1, template_id_2" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <Field label="Webhook Verification Token">
            <Input placeholder="Webhook verification token" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <Field label="Meta App Secret">
            <Input placeholder="Meta App Secret" type="password" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <div />
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8] space-y-4">
        <div className="text-[#0A0A0A] text-[14px] font-medium">CLAUDE API</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="API key">
            <Input placeholder="Claude API key" type="password" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <Field label="Default model">
            <Input placeholder="claude-haiku-4-5-20251001" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <Field label="Max tokens per call">
            <Input placeholder="e.g. 1200" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <div />
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8] space-y-4">
        <div className="text-[#0A0A0A] text-[14px] font-medium">SYSTEM</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="n8n webhook URL">
            <Input placeholder="https://your-n8n-webhook" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <Field label="Admin email addresses">
            <Input placeholder="admin1@domain.com, admin2@domain.com" className="bg-transparent border-[#E8E8E8]" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Alert thresholds">
              <Input placeholder="e.g. hot>=70, warm>=50" className="bg-transparent border-[#E8E8E8]" />
            </Field>
          </div>
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8] space-y-4">
        <div className="text-[#0A0A0A] text-[14px] font-medium">BILLING</div>
        <p className="text-[#555] text-[13px]">Stripe integration coming soon.</p>
        <Button variant="secondary" className="rounded-lg" disabled>
          Coming soon
        </Button>
      </section>
    </div>
  );
}

