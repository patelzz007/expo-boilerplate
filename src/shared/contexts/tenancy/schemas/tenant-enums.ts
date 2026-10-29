import type { z } from "zod";

import { RewardCategorySchema } from "../../rewards/schemas/reward-enums";

// ── Tenant enums (mirror Prisma — packages/shared cannot import @prisma/client) ───

/** The locale and IANA time zone a date, time, count or money amount is rendered in. */
export interface DisplayRegion {
  /** BCP 47 locale tag, e.g. `en-MY`. */
  readonly locale: string;
  /** IANA time zone, e.g. `Asia/Kuala_Lumpur`. */
  readonly timeZone: string;
}

/**
 * The region every web, merchant and admin screen renders in: Malaysian English,
 * Malaysia time. Every pilot city is in this one zone (a test pins that
 * {@link PILOT_CITY_TIME_ZONES} agree with it), so a time shown in it is the
 * stores' own wall-clock time — what a customer redeeming in-store and a
 * merchant reading their redemptions both expect.
 *
 * Rendering in one fixed region instead of the runtime's default is what keeps
 * server-rendered HTML identical to the first client render: a Node server
 * (often UTC, `en-US`) and a browser (the viewer's own zone) would otherwise
 * format the same instant differently and React reports a hydration mismatch.
 */
export const PLATFORM_DISPLAY_REGION: DisplayRegion = {
  locale: "en-MY",
  timeZone: "Asia/Kuala_Lumpur",
};

/** Merchant business type — same vocabulary as reward categories. */
export const MerchantBusinessCategorySchema = RewardCategorySchema;
export type MerchantBusinessCategory = z.output<typeof MerchantBusinessCategorySchema>;

export const MERCHANT_BUSINESS_CATEGORY_LABELS: Record<MerchantBusinessCategory, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  retail: "Retail",
  wellness: "Wellness",
  entertainment: "Entertainment",
  food: "Food",
  beverage: "Beverage",
};

/** Label for a merchant without a (recognised) business category — used by every sales / spending breakdown. */
export const UNCATEGORISED_MERCHANT_CATEGORY_LABEL = "Other";
