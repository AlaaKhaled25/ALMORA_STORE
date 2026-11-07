// Browser-only: remembers the last order NUMBER only.
// The phone number is never stored here (or anywhere in the browser).

const LAST_ORDER_KEY = "my_store_last_order_v1";
const LAST_ORDER_UPDATED_EVENT = "my-store-last-order-updated";

export function readLastOrderNumber(): string {
  if (typeof window === "undefined") return "";

  try {
    return (window.localStorage.getItem(LAST_ORDER_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function saveLastOrderNumber(orderNumber: string): void {
  if (typeof window === "undefined") return;

  const value = orderNumber.trim();
  if (value === "") return;

  try {
    window.localStorage.setItem(LAST_ORDER_KEY, value);
    window.dispatchEvent(new Event(LAST_ORDER_UPDATED_EVENT));
  } catch {
    // Ignore storage errors (private browsing / full quota).
  }
}

// Stable snapshot for useSyncExternalStore.
export function getLastOrderSnapshot(): string {
  return readLastOrderNumber();
}

export function subscribeLastOrder(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === LAST_ORDER_KEY) callback();
  };

  window.addEventListener(LAST_ORDER_UPDATED_EVENT, callback);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(LAST_ORDER_UPDATED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
