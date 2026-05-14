import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OperationalEventLevel = "debug" | "info" | "warn" | "error";

export type OperationalEventInput = {
  companyId?: string | null;
  affiliateId?: string | null;
  payoutBatchId?: string | null;
  payoutId?: string | null;
  actorUserId?: string | null;
  source: string;
  event: string;
  level?: OperationalEventLevel;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logOperationalEvent(input: OperationalEventInput) {
  const level = input.level ?? "info";
  const payload = {
    company_id: input.companyId ?? null,
    affiliate_id: input.affiliateId ?? null,
    payout_batch_id: input.payoutBatchId ?? null,
    payout_id: input.payoutId ?? null,
    actor_user_id: input.actorUserId ?? null,
    source: input.source,
    event: input.event,
    level,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
  };

  const logLine = {
    source: payload.source,
    event: payload.event,
    level,
    companyId: payload.company_id,
    affiliateId: payload.affiliate_id,
    payoutId: payload.payout_id,
    payoutBatchId: payload.payout_batch_id,
    message: payload.message,
    metadata: payload.metadata,
  };

  if (level === "error") {
    console.error("[ops]", logLine);
  } else if (level === "warn") {
    console.warn("[ops]", logLine);
  } else {
    console.info("[ops]", logLine);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("operational_events").insert(payload);
    if (error) {
      console.warn("[ops] could not persist operational event", {
        error: error.message,
        source: input.source,
        event: input.event,
      });
    }
  } catch (error) {
    console.warn("[ops] could not persist operational event", {
      error: error instanceof Error ? error.message : "Unknown logging failure.",
      source: input.source,
      event: input.event,
    });
  }
}

export function errorMetadata(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}
