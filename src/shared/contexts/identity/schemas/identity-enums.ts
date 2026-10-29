import { z } from "zod";

// ── Device Type ───────────────────────────────────────────────────────────

export const DeviceTypeSchema = z.enum(["DESKTOP", "MOBILE", "TABLET", "BOT", "UNKNOWN"]);
export type DeviceType = z.output<typeof DeviceTypeSchema>;
