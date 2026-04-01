"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  tableId: string;
};

export default function SelectAllLeadsCheckbox({ tableId }: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.getElementById(tableId);
    const input = ref.current;
    if (!root || !input) return;

    const getBoxes = () => Array.from(root.querySelectorAll<HTMLInputElement>('input[name="leadIds"]'));
    const sync = () => {
      const boxes = getBoxes();
      const selected = boxes.filter((b) => b.checked).length;
      input.checked = boxes.length > 0 && selected === boxes.length;
      input.indeterminate = selected > 0 && selected < boxes.length;
    };

    const boxes = getBoxes();
    boxes.forEach((box) => box.addEventListener("change", sync));
    sync();

    return () => {
      boxes.forEach((box) => box.removeEventListener("change", sync));
    };
  }, [tableId]);

  return (
    <input
      id={id}
      ref={ref}
      type="checkbox"
      aria-label="Select all leads on this page"
      className="h-4 w-4 rounded border-[#d4d4d4]"
      onChange={(e) => {
        const root = document.getElementById(tableId);
        if (!root) return;
        const boxes = root.querySelectorAll<HTMLInputElement>('input[name="leadIds"]');
        boxes.forEach((box) => {
          box.checked = e.currentTarget.checked;
          box.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }}
    />
  );
}

