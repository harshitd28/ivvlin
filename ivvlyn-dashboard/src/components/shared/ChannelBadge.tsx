import type { Channel } from "@/lib/types";

type Props = {
  channel: Channel;
  className?: string;
};

function iconFor(channel: Channel) {
  if (channel === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <defs>
          <linearGradient id="igBadgeGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#833ab4" />
            <stop offset="0.58" stopColor="#fd1d1d" />
            <stop offset="1" stopColor="#fcb045" />
          </linearGradient>
        </defs>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="none" stroke="url(#igBadgeGrad)" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.8" fill="none" stroke="url(#igBadgeGrad)" strokeWidth="2" />
        <circle cx="17.4" cy="6.6" r="1.2" fill="url(#igBadgeGrad)" />
      </svg>
    );
  }

  if (channel === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path
          d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v5h3v-5h2.2l.8-3H13V9c0-.6.4-1 1-1Z"
          fill="#1877F2"
        />
      </svg>
    );
  }

  if (channel === "sms") {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path
          d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
          fill="#F59E0B"
        />
      </svg>
    );
  }

  if (channel === "email") {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="#6B7280" />
        <path d="M4 7.5 12 13l8-5.5" stroke="#fff" strokeWidth="1.4" fill="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        d="M12 3C7 3 3 6.7 3 11.3c0 2.6 1.2 4.8 3.1 6.3V21l3.2-1.8c.9.2 1.8.3 2.7.3 5 0 9-3.7 9-8.2C21 6.7 17 3 12 3Z"
        fill="#16A34A"
      />
    </svg>
  );
}

function stylesFor(channel: Channel) {
  if (channel === "instagram") return "bg-[#f7f1fb] text-[#7c3aed] border-[#e8def6]";
  if (channel === "facebook") return "bg-[#eef4ff] text-[#1d4ed8] border-[#d8e5ff]";
  if (channel === "sms") return "bg-[#fff6e8] text-[#b45309] border-[#fde7c6]";
  if (channel === "email") return "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]";
  return "bg-[#eaf8ef] text-[#15803d] border-[#d6f0df]";
}

function labelFor(channel: Channel) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "instagram") return "Instagram";
  if (channel === "facebook") return "Facebook";
  if (channel === "sms") return "SMS";
  return "Email";
}

export default function ChannelBadge({ channel, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 border ${stylesFor(channel)} ${className}`}
    >
      {iconFor(channel)}
      {labelFor(channel)}
    </span>
  );
}

