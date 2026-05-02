/**
 * Production `activities` has both `timestamp` and `created_at`; a sync trigger may keep them aligned.
 * Prefer **`timestamp`** for ordering/display; fall back to **`created_at`** when needed.
 */
export function activityOccurredAt(row: { timestamp?: string | null; created_at?: string | null }): string | null {
  if (typeof row.timestamp === "string" && row.timestamp.length > 0) return row.timestamp;
  if (typeof row.created_at === "string" && row.created_at.length > 0) return row.created_at;
  return null;
}
