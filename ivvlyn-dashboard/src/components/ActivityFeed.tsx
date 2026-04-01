"use client";

import ActivityItem from "@/components/shared/ActivityItem";

type ActivityRow = {
  id: string;
  created_at: string;
  lead_name: string | null;
  channel: string | null;
  direction: string | null;
  content: string | null;
  type: string | null;
};

type Props = {
  activities: ActivityRow[];
};

export default function ActivityFeed({ activities }: Props) {
  if (!activities.length) {
    return <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 text-sm text-[#9ca3af]">No recent activity.</div>;
  }
  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
