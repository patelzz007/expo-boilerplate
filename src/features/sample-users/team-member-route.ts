// The team member screen's route: `/team/[id]`. Its id arrives from the URL (a deep link included),
// so it is parsed before anything is requested.

import { z } from "zod";

import { DYNAMIC_ROUTES } from "../../runtime/routes";

/** `[id]` of the route: a positive whole number, sent as text. */
export const TeamMemberRouteParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((id: string): number => Number(id)),
});

/** The id a route's params name, or `null` when they name none (the screen then says "not found"). */
export function teamMemberIdOf(params: Readonly<Record<string, string | string[] | undefined>>): number | null {
  const parsed = TeamMemberRouteParamsSchema.safeParse(params);
  return parsed.success ? parsed.data.id : null;
}

/** Where a team member is opened: `router.push(teamMemberHref(user.id))`. */
export function teamMemberHref(id: number): {
  readonly pathname: typeof DYNAMIC_ROUTES.teamMember;
  readonly params: { readonly id: string };
} {
  return { pathname: DYNAMIC_ROUTES.teamMember, params: { id: String(id) } };
}
