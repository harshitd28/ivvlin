"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = {
  value: string;
  options: string[];
};

export default function CreditsMonthSelect({ value, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(search.toString());
        next.set("month", e.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="h-9 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#111]"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

