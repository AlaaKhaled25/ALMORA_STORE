// Shared constants safe to import from the browser, server, and proxy (edge).
export const SESSION_COOKIE = "my_store_session";

// Keep in sync with the value used when creating the session cookie.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days
