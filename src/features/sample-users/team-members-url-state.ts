// The team members list's URL state (lib/url-state): the page it shows. Declared once, so Home reads
// and writes it and a link can open the list on any page (`TEAM_MEMBERS_URL_STATE.href("/", { page: 2 })`).
// An absent or malformed `?page=` opens the first page.

import { defineUrlState, pageUrlParam } from "../../lib/url-state/url-state";

export const TEAM_MEMBERS_URL_STATE = defineUrlState({ page: pageUrlParam() });
