// ============================================
// analytics-dashboard.ts — the analytics dashboards of the customer, the merchant and the admin
// ============================================
// `GET /claims/analytics/dashboard`, `GET /tenants/:tenantSlug/analytics/dashboard`,
// `GET /admin/analytics/dashboard` (docs/technical/api/analytics.md). Every
// number is computed in Postgres for the request's range ([from, to), see
// analytics-range.ts); every series has one point per bucket of the range,
// empty buckets as zero. Money is in integer minor units of `currency` (sen).
//
// These supersede the weekly v1 summaries (`…/analytics`, `/admin/analytics/sales`),
// which stay unchanged for API clients; every analytics screen reads the dashboards.

import { z } from "zod";

import { EpochMsSchema } from "../../../schemas/api/common";
import { RewardClaimStatusSchema } from "../../claims/schemas/claim-enums";
import { SaleCurrencySchema } from "../../pos/schemas/sale-currency";
import { MerchantBusinessCategorySchema } from "../../tenancy/schemas/tenant-enums";
import { analyticsRangeQueryShape, AnalyticsReportRangeSchema, validateAnalyticsRange } from "./analytics-range";

// ── Queries ────────────────────────────────────────────────────────────────

/** `GET /claims/analytics/dashboard` — the signed-in customer's own activity. */
export const CustomerAnalyticsDashboardQuerySchema = z
  .object(analyticsRangeQueryShape)
  .strict()
  .superRefine(validateAnalyticsRange);

export type CustomerAnalyticsDashboardQuery = z.output<typeof CustomerAnalyticsDashboardQuerySchema>;

// ── Building blocks ────────────────────────────────────────────────────────

const CountSchema = z.number().int().nonnegative();
const MinorUnitsSchema = z.number().int().nonnegative();

/**
 * One KPI for the range, compared with the previous range of equal length.
 * `change` = value − previous; `changePercent` = change / previous × 100 with
 * one decimal place, `null` when `previous` is 0 (no meaningful base).
 */
export const AnalyticsComparisonSchema = z.object({
  value: z.number(),
  previous: z.number(),
  change: z.number(),
  changePercent: z.number().nullable(),
});

export type AnalyticsComparison = z.output<typeof AnalyticsComparisonSchema>;

/**
 * One bucket of a time series: `[start, end)`, clipped to the range. Label it
 * by `start` in the response's `range.timeZone`. `isPartial` = the bucket was
 * clipped (the range starts or ends inside it), so its total covers fewer days.
 */
export const AnalyticsBucketSchema = z.object({
  start: EpochMsSchema,
  end: EpochMsSchema,
  isPartial: z.boolean(),
});

export type AnalyticsBucket = z.output<typeof AnalyticsBucketSchema>;

/** One value per bucket of the response's series (same `start`s, same order). */
export const AnalyticsSeriesValueSchema = z.object({ start: EpochMsSchema, totalMinor: MinorUnitsSchema });

export type AnalyticsSeriesValue = z.output<typeof AnalyticsSeriesValueSchema>;

// ── Customer ───────────────────────────────────────────────────────────────

export const CustomerDashboardTotalsSchema = z.object({
  /** The customer's paid bills (where they redeemed rewards), in minor units. */
  spentMinor: AnalyticsComparisonSchema,
  visits: AnalyticsComparisonSchema,
  averageBillMinor: AnalyticsComparisonSchema,
  claims: AnalyticsComparisonSchema,
  redemptions: AnalyticsComparisonSchema,
  /** Redemptions ÷ claims of the range, in percent (one decimal). */
  conversionRate: AnalyticsComparisonSchema,
  /** Distinct merchants visited. */
  merchants: AnalyticsComparisonSchema,
  /** Referral links the customer shared that were opened (referrals created in the range). */
  referralsSent: AnalyticsComparisonSchema,
  /** The customer's referrals credited in the range (the friend redeemed; `creditedAt` in the range). */
  referralsCredited: AnalyticsComparisonSchema,
  /** Referrer reward claims the customer received in the range — what the credited referrals earned them. */
  referralRewardsEarned: AnalyticsComparisonSchema,
});

export type CustomerDashboardTotals = z.output<typeof CustomerDashboardTotalsSchema>;

export const CustomerDashboardPointSchema = AnalyticsBucketSchema.extend({
  spentMinor: MinorUnitsSchema,
  visits: CountSchema,
  claims: CountSchema,
  redemptions: CountSchema,
});

export type CustomerDashboardPoint = z.output<typeof CustomerDashboardPointSchema>;

/** Spending in one merchant category, with its own series (one value per bucket of `series`). */
export const CustomerCategorySpendSchema = z.object({
  category: MerchantBusinessCategorySchema.nullable(),
  totalMinor: MinorUnitsSchema,
  visits: CountSchema,
  series: z.array(AnalyticsSeriesValueSchema),
});

export type CustomerCategorySpend = z.output<typeof CustomerCategorySpendSchema>;

/** Spending at one merchant, with its own series (one value per bucket of `series`). */
export const CustomerMerchantSpendSchema = z.object({
  tenantId: z.uuid(),
  merchantName: z.string(),
  category: MerchantBusinessCategorySchema.nullable(),
  totalMinor: MinorUnitsSchema,
  visits: CountSchema,
  series: z.array(AnalyticsSeriesValueSchema),
});

export type CustomerMerchantSpend = z.output<typeof CustomerMerchantSpendSchema>;

/** Claims made in the range (`claimedAt`) by their CURRENT status. Every status is listed, zero included. */
export const ClaimStatusBreakdownSchema = z.object({
  status: RewardClaimStatusSchema,
  claims: CountSchema,
});

export type ClaimStatusBreakdown = z.output<typeof ClaimStatusBreakdownSchema>;

export const CustomerAnalyticsDashboardSchema = z.object({
  range: AnalyticsReportRangeSchema,
  currency: SaleCurrencySchema,
  totals: CustomerDashboardTotalsSchema,
  /** Spending, visits, claims and redemptions per bucket. */
  series: z.array(CustomerDashboardPointSchema),
  /** Highest spend first. */
  spendingByCategory: z.array(CustomerCategorySpendSchema),
  /** Highest spend first, at most `CUSTOMER_TOP_MERCHANTS_LIMIT`. */
  spendingByMerchant: z.array(CustomerMerchantSpendSchema),
  /** The range's claims by current status (pending / redeemed / expired), in `RewardClaimStatusSchema` order. */
  claimsByStatus: z.array(ClaimStatusBreakdownSchema),
});

export type CustomerAnalyticsDashboard = z.output<typeof CustomerAnalyticsDashboardSchema>;

/** Merchants listed (each with a series) in the customer's spending breakdown. */
export const CUSTOMER_TOP_MERCHANTS_LIMIT = 5;
