// The app's shared contracts (rules/05): zod schemas, their inferred types and pure helpers, grouped by
// bounded context. The ONE public entry point — import from "@/shared", never from a file inside.
// A subset of the reference starter kit's packages/shared, kept at the same paths and verbatim.

export * from "./contexts/claims";
export * from "./contexts/identity";
export * from "./contexts/pos";
export * from "./contexts/reporting";
export * from "./contexts/rewards";
export * from "./contexts/tenancy";
export { assertNever } from "./lib/assert-never";
export { type ToDiscoUnion } from "./lib/disco-union";
export { type EpochMs, EpochMsSchema, epochMs, nowEpochMs } from "./schemas/api/common";
export { CanonicalEmailSchema, EMAIL_ADDRESS_MAX_LENGTH, canonicalEmailSchema } from "./schemas/api/email-address";
export * from "./lib/pdf";
export * from "./lib/qr";
