"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string;
  kind: "success" | "error";
};

export default function AdminActionToast({ message, kind }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-4 z-[120]">
      <div
        className={`text-[13px] rounded-lg px-3 py-2 border shadow-sm ${
          kind === "success"
            ? "bg-[#ecfdf3] border-[#bbf7d0] text-[#166534]"
            : "bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

