// Shared constants safe to import from the browser, server, and proxy (edge).
export const SESSION_COOKIE = "my_store_session";

// Keep in sync with the value used when creating the session cookie.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

// Cart and checkout limits (shared by the browser and the server).
export const CART_MAX_ITEMS = 50;
export const CART_MAX_QUANTITY = 10;
export const DELIVERY_FEE_PIASTRES = 50 * 100; // 50 EGP

// Product image limits (shared by the browser and the server).
export const PRODUCT_IMAGES_MAX = 5;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PRODUCT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
