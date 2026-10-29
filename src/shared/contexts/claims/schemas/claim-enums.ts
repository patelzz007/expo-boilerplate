import { z } from "zod";

// ── Claim enums (mirror Prisma — packages/shared cannot import @prisma/client) ───

export const RewardClaimStatusSchema = z.enum(["PENDING", "REDEEMED", "EXPIRED"]);
export type RewardClaimStatus = z.output<typeof RewardClaimStatusSchema>;
