"use client";

import { useEffect, useState } from "react";

type Props = {
  tableId: string;
};

export default function SelectedLeadsCount({ tableId }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const root = document.getElementById(tableId);
    if (!root) return;

    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="leadIds"]'));
    const sync = () => setCount(boxes.filter((b) => b.checked).length);

    boxes.forEach((box) => box.addEventListener("change", sync));
    sync();
    return () => boxes.forEach((box) => box.removeEventListener("change", sync));
  }, [tableId]);

  return <span>{count} selected</span>;
}

