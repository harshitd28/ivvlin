"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  clientId: string;
};

export default function DashboardRealtime({ clientId }: Props) {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let mounted = true;

    const scheduleRefresh = () => {
      if (!mounted) return;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        router.refresh();
      }, 300);
    };

    const channel = supabase
      .channel("ivvlyn-client-rt")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visits",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          scheduleRefresh();
        }
      );

    channel.subscribe();

    return () => {
      mounted = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      void supabase.removeChannel(channel);
    };
  }, [clientId, router]);

  return null;
}

