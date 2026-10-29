import { z } from "zod";

// ── Reward enums (mirror Prisma — packages/shared cannot import @prisma/client) ───

/** Stock placeholder image keys by category (Phase 1). */
export const RewardCategorySchema = z.enum([
  "cafe",
  "restaurant",
  "retail",
  "wellness",
  "entertainment",
  "food",
  "beverage",
]);
export type RewardCategory = z.output<typeof RewardCategorySchema>;
