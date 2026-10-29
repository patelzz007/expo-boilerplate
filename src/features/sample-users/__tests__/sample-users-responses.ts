// Responses from the JSONPlaceholder users endpoints for the feature's tests: the network is the
// boundary they replace, so `fetch` answers with these.

import type { SampleUser, SampleUserDetails, SampleUsersPage } from "../sample-users";
import { TOTAL_COUNT_HEADER } from "../sample-users";

/** Leanne in full, as the API sends her (with fields the app does not read: geo). */
export const API_USER_DETAILS = {
  id: 1,
  name: "Leanne Graham",
  username: "Bret",
  email: "Sincere@april.biz",
  address: {
    street: "Kulas Light",
    suite: "Apt. 556",
    city: "Gwenborough",
    zipcode: "92998-3874",
    geo: { lat: "-37.3159", lng: "81.1496" },
  },
  phone: "1-770-736-8031 x56442",
  website: "hildegard.org",
  company: {
    name: "Romaguera-Crona",
    catchPhrase: "Multi-layered client-server neural-net",
    bs: "harness real-time e-markets",
  },
};

/** Leanne after parsing: `geo` is dropped. */
export const PARSED_USER_DETAILS: SampleUserDetails = {
  id: 1,
  name: "Leanne Graham",
  username: "Bret",
  email: "Sincere@april.biz",
  address: { street: "Kulas Light", suite: "Apt. 556", city: "Gwenborough", zipcode: "92998-3874" },
  phone: "1-770-736-8031 x56442",
  website: "hildegard.org",
  company: {
    name: "Romaguera-Crona",
    catchPhrase: "Multi-layered client-server neural-net",
    bs: "harness real-time e-markets",
  },
};

/** One page of two users as the API sends them, with fields the list does not read. */
export const API_USERS = [
  API_USER_DETAILS,
  {
    id: 2,
    name: "Ervin Howell",
    username: "Antonette",
    email: "Shanna@melissa.tv",
    phone: "010-692-6593 x09125",
    company: { name: "Deckow-Crist", catchPhrase: "Proactive didactic contingency" },
  },
];

/** The same users after parsing: only the fields the list shows. */
export const PARSED_USERS: readonly SampleUser[] = [
  { id: 1, name: "Leanne Graham", username: "Bret", email: "Sincere@april.biz", company: { name: "Romaguera-Crona" } },
  { id: 2, name: "Ervin Howell", username: "Antonette", email: "Shanna@melissa.tv", company: { name: "Deckow-Crist" } },
];

/** How many users the API says it has in all. */
export const TOTAL_USERS = 10;

/** The first page as the app holds it. */
export const FIRST_PAGE: SampleUsersPage = { users: PARSED_USERS, total: TOTAL_USERS };

const OK_STATUS = 200;

/** A JSON response with the given body, status and extra headers. */
export function jsonResponse(
  body: object,
  status: number = OK_STATUS,
  headers: Readonly<Record<string, string>> = {}
): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

/** A page of the list, with the total-count header the API sends. */
export function pageResponse(body: object, total: number = TOTAL_USERS): Response {
  return jsonResponse(body, OK_STATUS, { [TOTAL_COUNT_HEADER]: String(total) });
}
