import { createSupabaseServerClient } from "@/lib/supabase/server";
import ChannelBadge from "@/components/shared/ChannelBadge";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase env vars to load settings.</div>;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return <div className="p-8 pt-0 text-[#555]">Please sign in again.</div>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, full_name")
    .eq("id", session.user.id)
    .maybeSingle();

  const clientId = (profile as { client_id?: string | null } | null)?.client_id ?? null;
  if (!clientId) {
    return <div className="p-8 pt-0 text-[#555]">No client linked to this account.</div>;
  }

  const { data: client } = await supabase
    .from("clients")
    .select("business_name, agent_type, whatsapp_phone_id, instagram_page_id, system_prompt, phone")
    .eq("id", clientId)
    .maybeSingle();

  const typed = client as
    | {
        business_name?: string | null;
        agent_type?: string | null;
        whatsapp_phone_id?: string | null;
        instagram_page_id?: string | null;
        system_prompt?: string | null;
        phone?: string | null;
      }
    | null;

  const channels = [
    typed?.whatsapp_phone_id ? "whatsapp" : null,
    typed?.instagram_page_id ? "instagram" : null,
  ].filter((v): v is "whatsapp" | "instagram" => !!v);

  const subject = encodeURIComponent("Request changes to dashboard settings");
  const body = encodeURIComponent(
    `Business: ${typed?.business_name ?? "Unknown"}\nAgent: ${typed?.agent_type ?? "vaani"}\n\nPlease help update our configuration.`
  );

  return (
    <div className="p-8 pt-0 space-y-6">
      <div className="sticky top-0 z-20 bg-[#FAFAF8] py-2">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Settings</h1>
        <p className="text-[#555] text-[13px] mt-2">Read-only client configuration.</p>
      </div>

      <section className="border border-[#E8E8E8] rounded-xl bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="text-[#777] text-[11px] uppercase tracking-[0.14em]">Agent name</div>
            <div className="mt-1 text-[#0A0A0A]">{typed?.agent_type ?? "vaani"}</div>
          </div>
          <div>
            <div className="text-[#777] text-[11px] uppercase tracking-[0.14em]">Business name</div>
            <div className="mt-1 text-[#0A0A0A]">{typed?.business_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-[#777] text-[11px] uppercase tracking-[0.14em]">Salesperson notification number</div>
            <div className="mt-1 text-[#0A0A0A]">{typed?.phone ?? "—"}</div>
          </div>
        </div>
        <div>
          <div className="text-[#777] text-[11px] uppercase tracking-[0.14em] mb-2">Active channels</div>
          <div className="flex flex-wrap gap-2">
            {channels.length ? channels.map((c) => <ChannelBadge key={c} channel={c} />) : <span className="text-[#777] text-[13px]">No channels configured</span>}
          </div>
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl bg-white p-5">
        <div className="text-[#777] text-[11px] uppercase tracking-[0.14em] mb-2">System prompt (read-only)</div>
        <pre className="text-[12px] leading-6 whitespace-pre-wrap bg-[#fafaf8] border border-[#efefef] rounded-lg p-4 text-[#333]">
          {typed?.system_prompt || "No system prompt configured yet."}
        </pre>
      </section>

      <a
        href={`mailto:founder@ivvlin.com?subject=${subject}&body=${body}`}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-[#0A0A0A] text-white text-[13px] hover:bg-[#202020] transition-colors duration-150"
      >
        Request changes
      </a>
    </div>
  );
}

