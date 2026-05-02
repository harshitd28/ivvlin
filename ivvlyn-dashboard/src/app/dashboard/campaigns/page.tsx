import CampaignsClient from "@/components/dashboard/campaigns/CampaignsClient";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-white">Campaigns</h1>
        <p className="mt-1 text-[13px] text-[#888]">
          Broadcast WhatsApp messages to a lead segment. Delivery uses the same outbound queue as inbox.
        </p>
      </div>
      <CampaignsClient />
    </div>
  );
}
