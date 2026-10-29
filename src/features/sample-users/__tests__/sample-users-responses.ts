// Responses from the JSONPlaceholder users endpoint for the feature's tests: the network is the
// boundary they replace, so `fetch` answers with these.

import type { SampleUser } from "../sample-users";

/** Two users as the API sends them, with fields the app does not read. */
export const API_USERS = [
  {
    id: 1,
    name: "Leanne Graham",
    username: "Bret",
    email: "Sincere@april.biz",
    phone: "1-770-736-8031 x56442",
    company: { name: "Romaguera-Crona", catchPhrase: "Multi-layered client-server neural-net" },
  },
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

const OK_STATUS = 200;

/** A JSON response with the given body and status. */
export function jsonResponse(body: object, status: number = OK_STATUS): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
