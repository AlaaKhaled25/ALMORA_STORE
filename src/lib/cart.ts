import { CART_MAX_ITEMS, CART_MAX_QUANTITY } from "@/lib/constants";

// Browser-only cart storage. The cart keeps only product ids and quantities.
// Prices are always loaded fresh from the server.

const CART_STORAGE_KEY = "my_store_cart_v1";
const CART_PRICES_STORAGE_KEY = "my_store_cart_prices_v1";

export const CART_UPDATED_EVENT = "my-store-cart-updated";

export type CartItem = {
  productId: string;
  quantity: number;
};

export type AddToCartResult =
  | { ok: true }
  | { ok: false; message: string };

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or a full storage quota: keep the UI usable.
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const quantities = new Map<string, number>();

  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;

    const item = raw as Record<string, unknown>;
    const productId =
      typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = item.quantity;

    if (productId === "") continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity)) continue;
    if (quantity < 1) continue;

    const current = quantities.get(productId) ?? 0;
    const merged = Math.min(CART_MAX_QUANTITY, current + quantity);
    quantities.set(productId, merged);
  }

  return Array.from(quantities, ([productId, quantity]) => ({
    productId,
    quantity,
  })).slice(0, CART_MAX_ITEMS);
}

function notifyCartChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function readCart(): CartItem[] {
  if (!canUseStorage()) return [];

  const raw = safeGetItem(CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    return normalizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  const normalized = normalizeCartItems(items);
  safeSetItem(CART_STORAGE_KEY, JSON.stringify(normalized));
  notifyCartChanged();
}

// Stable snapshot for useSyncExternalStore.
export function getCartSnapshot(): string {
  return JSON.stringify(readCart());
}

export function parseCartSnapshot(snapshot: string): CartItem[] {
  try {
    return normalizeCartItems(JSON.parse(snapshot));
  } catch {
    return [];
  }
}

export function getCartCountSnapshot(): number {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function subscribeCart(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CART_STORAGE_KEY) callback();
  };

  window.addEventListener(CART_UPDATED_EVENT, callback);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function addToCart(productId: string, quantity = 1): AddToCartResult {
  const cart = readCart();
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    if (existing.quantity >= CART_MAX_QUANTITY) {
      return {
        ok: false,
        message: `لا يمكن إضافة أكثر من ${CART_MAX_QUANTITY} من نفس المنتج.`,
      };
    }

    existing.quantity = Math.min(
      CART_MAX_QUANTITY,
      existing.quantity + Math.max(1, Math.trunc(quantity)),
    );
    writeCart(cart);
    return { ok: true };
  }

  if (cart.length >= CART_MAX_ITEMS) {
    return {
      ok: false,
      message: `لا يمكن إضافة أكثر من ${CART_MAX_ITEMS} منتجًا مختلفًا إلى السلة.`,
    };
  }

  cart.push({
    productId,
    quantity: Math.min(CART_MAX_QUANTITY, Math.max(1, Math.trunc(quantity))),
  });
  writeCart(cart);
  return { ok: true };
}

export function setCartQuantity(productId: string, quantity: number): void {
  const cart = readCart();
  const item = cart.find((entry) => entry.productId === productId);
  if (!item) return;

  if (quantity <= 0) {
    writeCart(cart.filter((entry) => entry.productId !== productId));
    return;
  }

  item.quantity = Math.min(CART_MAX_QUANTITY, Math.trunc(quantity));
  writeCart(cart);
}

export function removeFromCart(productId: string): void {
  writeCart(readCart().filter((item) => item.productId !== productId));
}

export function clearCart(): void {
  safeRemoveItem(CART_STORAGE_KEY);
  safeRemoveItem(CART_PRICES_STORAGE_KEY);
  notifyCartChanged();
}

// Last known price for each product, used only to detect price changes.
export function readCartPrices(): Record<string, number> {
  if (!canUseStorage()) return {};

  const raw = safeGetItem(CART_PRICES_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const prices: Record<string, number> = {};
    for (const [productId, value] of Object.entries(parsed)) {
      if (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
      ) {
        prices[productId] = value;
      }
    }
    return prices;
  } catch {
    return {};
  }
}

export function writeCartPrices(prices: Record<string, number>): void {
  safeSetItem(CART_PRICES_STORAGE_KEY, JSON.stringify(prices));
}

export function rememberCartPrice(productId: string, price: number): void {
  if (
    productId === "" ||
    !Number.isSafeInteger(price) ||
    price < 0
  ) {
    return;
  }

  writeCartPrices({ ...readCartPrices(), [productId]: price });
}
