import assert from "node:assert/strict";
import test from "node:test";
import {
  hasCompletedWebhookIdempotency,
  markWebhookIdempotencyCompleted,
} from "../src/lib/messaging/idempotency";

type FakeRow = { provider: string; event_id: string; payload?: unknown; processed_at?: string | null };

function createFakeSupabase(rows: FakeRow[] = []) {
  return {
    rows,
    from(table: string) {
      assert.equal(table, "webhook_idempotency");
      return {
        insert: async (row: FakeRow) => {
          const exists = rows.some((r) => r.provider === row.provider && r.event_id === row.event_id);
          if (exists) return { error: { code: "23505", message: "duplicate key" } };
          rows.push(row);
          return { error: null };
        },
        select: () => ({
          eq: (column: string, value: string) => {
            const filters: Record<string, string> = { [column]: value };
            return {
              eq: (nextColumn: string, nextValue: string) => {
                filters[nextColumn] = nextValue;
                return {
                  maybeSingle: async () => {
                    const row =
                      rows.find((r) => r.provider === filters.provider && r.event_id === filters.event_id) ?? null;
                    return { data: row ? { event_id: row.event_id } : null, error: null };
                  },
                };
              },
            };
          },
        }),
      };
    },
  };
}

test("webhook idempotency is not marked completed until explicitly recorded", async () => {
  const supabase = createFakeSupabase();

  assert.deepEqual(await hasCompletedWebhookIdempotency(supabase as never, " wa:msg:1 ", "meta-whatsapp"), {
    ok: true,
    duplicate: false,
  });

  assert.deepEqual(await markWebhookIdempotencyCompleted(supabase as never, " wa:msg:1 ", "meta-whatsapp"), {
    ok: true,
    duplicate: false,
  });

  assert.deepEqual(await hasCompletedWebhookIdempotency(supabase as never, "wa:msg:1", "meta-whatsapp"), {
    ok: true,
    duplicate: true,
  });
});

test("recording an already completed webhook reports a duplicate without failing", async () => {
  const supabase = createFakeSupabase([{ provider: "meta-whatsapp", event_id: "wa:msg:1" }]);

  assert.deepEqual(await markWebhookIdempotencyCompleted(supabase as never, "wa:msg:1", "meta-whatsapp"), {
    ok: true,
    duplicate: true,
  });
});
