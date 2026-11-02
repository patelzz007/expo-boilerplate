import { z } from "zod";

// ── Broadcasts and tenant customers (ADR 073) ────────────────────────────────────────────────────

export const BroadcastReportReasonSchema = z.enum(["SPAM", "OFFENSIVE", "SCAM"]);
export type BroadcastReportReason = z.output<typeof BroadcastReportReasonSchema>;
