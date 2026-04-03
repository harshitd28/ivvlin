"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __vaaniDemoTimeouts?: ReturnType<typeof setTimeout>[];
  }
}

type Props = {
  script: string;
  /** Stable key so the effect re-runs only when the page (script source) changes */
  pageKey: string;
};

function clearVaaniDemoTimers() {
  const list = window.__vaaniDemoTimeouts;
  if (!list?.length) return;
  list.forEach((id) => clearTimeout(id));
  list.length = 0;
}

function resetDemoContainers() {
  document.getElementById("wa-chat")?.replaceChildren();
  document.getElementById("ig-dm-chat")?.replaceChildren();
  document.getElementById("ig-comment-feed")?.replaceChildren();
  document.getElementById("phone-notify")?.classList.remove("is-visible");
}

/**
 * Runs extracted marketing HTML scripts once after mount. Avoids next/script inline
 * double-execution (Strict Mode, remounts) that left orphaned setTimeouts appending
 * duplicate chat bubbles to the same DOM nodes.
 */
export default function MarketingInlineScript({ script, pageKey }: Props) {
  useEffect(() => {
    if (!script.trim()) return;

    clearVaaniDemoTimers();
    resetDemoContainers();

    try {
      const run = new Function(script);
      run();
    } catch (e) {
      console.error("[MarketingInlineScript] failed to run script for", pageKey, e);
    }

    return () => {
      clearVaaniDemoTimers();
      resetDemoContainers();
    };
  }, [script, pageKey]);

  return null;
}
