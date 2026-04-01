"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function SettingsClient() {
  return (
    <div className="space-y-6 pt-0">
      <div>
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Settings</h1>
        <p className="text-[#555] text-[13px] mt-2">Configure your agent, properties, notifications, and team.</p>
      </div>

      <Tabs defaultValue="agent">
        <TabsList className="bg-transparent h-auto p-0 flex-wrap">
          <TabsTrigger value="agent">Agent</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-6">
          <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
            <div className="text-[#0A0A0A] text-[14px] font-medium">Agent</div>
            <p className="text-[#555] text-[13px] mt-2">Personality and language preferences will be editable here.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">Language preference</div>
                <Input value="Auto-detect (recommended)" disabled className="bg-transparent border-[#E8E8E8]" />
              </div>
              <div className="space-y-2">
                <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">Tone</div>
                <Input value="Formal → Friendly" disabled className="bg-transparent border-[#E8E8E8]" />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="mt-6">
          <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
            <div className="text-[#0A0A0A] text-[14px] font-medium">Properties</div>
            <p className="text-[#555] text-[13px] mt-2">Property configuration cards and inline editing will appear here.</p>
            <div className="mt-4 text-[#888] text-[13px]">+ Add Property (coming soon)</div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
            <div className="text-[#0A0A0A] text-[14px] font-medium">Notifications</div>
            <p className="text-[#555] text-[13px] mt-2">Morning briefing time and hot-lead thresholds will be editable here.</p>
            <div className="mt-4 text-[#888] text-[13px]">Configuration UI (coming soon)</div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
            <div className="text-[#0A0A0A] text-[14px] font-medium">Team</div>
            <p className="text-[#555] text-[13px] mt-2">Invite team members and manage access.</p>
            <div className="mt-4 text-[#888] text-[13px]">+ Invite Team Member (coming soon)</div>
          </div>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
            <div className="text-[#0A0A0A] text-[14px] font-medium">Account</div>
            <p className="text-[#555] text-[13px] mt-2">Subscription and password controls will appear here.</p>
            <div className="mt-4 text-[#888] text-[13px]">Account UI (coming soon)</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

