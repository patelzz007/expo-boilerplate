import { z } from "zod";

/** Currencies a POS bill may be settled in (ISO 4217). Amounts are always integer minor units (sen). */
export const SaleCurrencySchema = z.enum(["MYR"]);

export type SaleCurrency = z.output<typeof SaleCurrencySchema>;

/**
 * ISO 4217 minor-unit exponent of every sale currency: an amount of `n` minor
 * units is `n / 10^exponent` major units (2 for MYR: 123450 sen = RM 1,234.50).
 *
 * This table — not ICU's display precision — is the source of truth for
 * converting the integer minor units the API sends. ICU's default fraction
 * digits are a display convention and differ from ISO 4217 for several
 * currencies (IDR, HUF and COP display 0 decimals but have 2 minor digits;
 * IQD displays 0 but has 3), so deriving the exponent from `Intl` silently
 * mis-scales money. Adding a currency to {@link SaleCurrencySchema} fails to
 * compile until its exponent is added here.
 */
export const SALE_CURRENCY_MINOR_UNIT_EXPONENTS: Readonly<Record<SaleCurrency, number>> = {
  MYR: 2,
};

/** The currency every sale is recorded in until multi-currency merchants exist. */
export const DEFAULT_SALE_CURRENCY: SaleCurrency = "MYR";
