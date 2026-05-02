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

function findClosestFaqRoot(item: Element): Element | null {
  return item.closest("#pricing-faq, #faq, .faq-list");
}

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

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const faqButton = target.closest(".faq-q");
      if (faqButton) {
        event.preventDefault();
        event.stopPropagation();
        const item = faqButton.closest(".faq-item");
        if (!item) return;

        const root = findClosestFaqRoot(item) ?? document;
        const wasOpen = item.classList.contains("is-open");

        root.querySelectorAll(".faq-item").forEach((faqItem) => {
          faqItem.classList.remove("is-open");
          faqItem.querySelector(".faq-q")?.setAttribute("aria-expanded", "false");
          const answer = faqItem.querySelector<HTMLElement>(".faq-a");
          if (answer) answer.style.maxHeight = "0";
        });

        if (wasOpen) return;
        item.classList.add("is-open");
        faqButton.setAttribute("aria-expanded", "true");
        const answer = item.querySelector<HTMLElement>(".faq-a");
        if (answer) answer.style.maxHeight = `${answer.scrollHeight}px`;
        return;
      }

      const bookingAnchor = target.closest('a[href="#booking"]');
      if (!bookingAnchor) return;

      const bookingSection = document.getElementById("booking");
      if (bookingSection) {
        event.preventDefault();
        bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      event.preventDefault();
      window.location.href = "/contact#demo-form-wrap";
    };

    document.addEventListener("click", onDocumentClick, true);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      clearVaaniDemoTimers();
      resetDemoContainers();
    };
  }, [script, pageKey]);

  return null;
}
