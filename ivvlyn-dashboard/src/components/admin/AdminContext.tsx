"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AdminContextValue = {
  activeClientId: string | null;
  setActiveClientId: (clientId: string | null) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialClientId = useMemo(() => {
    const v = searchParams.get("clientId");
    return typeof v === "string" && v.length ? v : null;
  }, [searchParams]);

  const [activeClientId, setActiveClientIdState] = useState<string | null>(initialClientId);

  function setActiveClientId(clientId: string | null) {
    setActiveClientIdState(clientId);

    const next = new URLSearchParams(searchParams.toString());
    if (clientId) next.set("clientId", clientId);
    else next.delete("clientId");

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const value = useMemo<AdminContextValue>(
    () => ({ activeClientId, setActiveClientId }),
    [activeClientId]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const v = useContext(AdminContext);
  if (!v) throw new Error("useAdminContext must be used within AdminContextProvider");
  return v;
}

