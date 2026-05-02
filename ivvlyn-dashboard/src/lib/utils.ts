import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getStatusColor(status: "hot" | "warm" | "new" | "cold") {
  if (status === "hot") return "#FF6B35";
  if (status === "warm") return "#F59E0B";
  if (status === "cold") return "#3B82F6";
  return "#555555";
}
