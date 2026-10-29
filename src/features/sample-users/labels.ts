// Copy of the Home screen's team-members card and the team member screen (features/sample-users).

export const SAMPLE_USERS_COPY = {
  title: "Team members",
  description: "Loaded from JSONPlaceholder, a public demo API.",
  loading: "Loading team members",
  empty: "No team members yet.",
  error: "The team members couldn't be loaded. Check your connection and try again.",
  retry: "Try again",
  pagination: "Team members pages",
  openDetailsHint: "Opens their details",
} satisfies Record<string, string>;

/** The team member screen's header. */
export const SAMPLE_USER_DETAILS_TITLE = "Team member";
export const SAMPLE_USER_DETAILS_SUBTITLE = "Contact and company details";

export const SAMPLE_USER_DETAILS_COPY = {
  loading: "Loading team member",
  error: "This team member couldn't be loaded. Check your connection and try again.",
  retry: "Try again",
  notFoundTitle: "Team member not found",
  notFound: "They may have been removed, or the link is wrong.",
  contact: "Contact",
  email: "Email",
  phone: "Phone",
  website: "Website",
  address: "Address",
  street: "Street",
  city: "City",
  zipcode: "Postcode",
  company: "Company",
  companyName: "Name",
  catchPhrase: "Catchphrase",
  business: "Business",
} satisfies Record<string, string>;
