import type { ApiErrorDetail } from "@/lib/api-errors";
import { CART_MAX_ITEMS, CART_MAX_QUANTITY } from "@/lib/constants";

// Shared checkout validation. Safe for the browser and the server.
// The server always runs these checks again; the browser only uses them for fast feedback.

export const CHECKOUT_NAME_MAX_LENGTH = 100;
export const CHECKOUT_CITY_MAX_LENGTH = 100;
export const CHECKOUT_ADDRESS_MAX_LENGTH = 300;
export const CHECKOUT_NOTES_MAX_LENGTH = 500;

export type CheckoutCustomer = {
  recipientName: string;
  recipientPhone: string;
  city: string;
  addressLine: string;
  notes: string;
};

export type CartItemInput = {
  productId: string;
  quantity: number;
};

function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

// Accepts common Egyptian formats and returns 01XXXXXXXXX.
export function normalizeEgyptianPhone(value: string): string | null {
  let phone = toAsciiDigits(value).replace(/[\s\-().]/g, "");

  if (phone.startsWith("+20")) {
    phone = `0${phone.slice(3)}`;
  } else if (phone.startsWith("0020")) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith("20") && phone.length === 12) {
    phone = `0${phone.slice(2)}`;
  }

  return /^01[0125]\d{8}$/.test(phone) ? phone : null;
}

function readText(
  input: Record<string, unknown>,
  field: string,
  label: string,
  maxLength: number,
  required: boolean,
  details: ApiErrorDetail[],
): string {
  const raw = input[field];

  if (raw === undefined || raw === null || raw === "") {
    if (required) details.push({ field, message: `${label} مطلوب.` });
    return "";
  }

  if (typeof raw !== "string") {
    details.push({ field, message: `${label} يجب أن يكون نصًا.` });
    return "";
  }

  const value = raw.trim().replace(/[ \t]+/g, " ");
  if (required && value === "") {
    details.push({ field, message: `${label} مطلوب.` });
  } else if (value.length > maxLength) {
    details.push({
      field,
      message: `${label} يجب ألا يتجاوز ${maxLength} حرفًا.`,
    });
  }

  return value;
}

// Validates the checkout fields and normalizes the phone number.
export function validateCheckoutCustomer(input: unknown): {
  ok: boolean;
  value: CheckoutCustomer;
  details: ApiErrorDetail[];
} {
  const details: ApiErrorDetail[] = [];
  const value: CheckoutCustomer = {
    recipientName: "",
    recipientPhone: "",
    city: "",
    addressLine: "",
    notes: "",
  };

  if (typeof input !== "object" || input === null) {
    details.push({ message: "صيغة الطلب غير صحيحة." });
    return { ok: false, value, details };
  }

  const body = input as Record<string, unknown>;

  value.recipientName = readText(
    body,
    "recipientName",
    "الاسم الكامل",
    CHECKOUT_NAME_MAX_LENGTH,
    true,
    details,
  );
  value.city = readText(
    body,
    "city",
    "المحافظة / المدينة",
    CHECKOUT_CITY_MAX_LENGTH,
    true,
    details,
  );
  value.addressLine = readText(
    body,
    "addressLine",
    "العنوان بالتفصيل",
    CHECKOUT_ADDRESS_MAX_LENGTH,
    true,
    details,
  );
  value.notes = readText(
    body,
    "notes",
    "الملاحظات",
    CHECKOUT_NOTES_MAX_LENGTH,
    false,
    details,
  );

  const rawPhone = body.recipientPhone;
  if (typeof rawPhone !== "string" || rawPhone.trim() === "") {
    details.push({ field: "recipientPhone", message: "رقم الهاتف مطلوب." });
  } else {
    const phone = normalizeEgyptianPhone(rawPhone);
    if (!phone) {
      details.push({
        field: "recipientPhone",
        message: "رقم الهاتف غير صحيح. مثال: 01012345678.",
      });
    } else {
      value.recipientPhone = phone;
    }
  }

  return { ok: details.length === 0, value, details };
}

// Validates the cart items sent by the browser. Prices are never accepted from the client.
export function validateCartItems(
  input: unknown,
  options: { allowEmpty?: boolean } = {},
): {
  ok: boolean;
  value: CartItemInput[];
  details: ApiErrorDetail[];
} {
  const details: ApiErrorDetail[] = [];
  const value: CartItemInput[] = [];

  if (!Array.isArray(input)) {
    details.push({ field: "items", message: "صيغة السلة غير صحيحة." });
    return { ok: false, value, details };
  }

  if (input.length === 0) {
    if (!options.allowEmpty) {
      details.push({ field: "items", message: "السلة فارغة." });
    }
    return { ok: details.length === 0, value, details };
  }

  if (input.length > CART_MAX_ITEMS) {
    details.push({
      field: "items",
      message: `لا يمكن أن تحتوي السلة على أكثر من ${CART_MAX_ITEMS} منتج مختلف.`,
    });
  }

  const seenProductIds = new Set<string>();

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) {
      details.push({ field: "items", message: "صيغة أحد المنتجات غير صحيحة." });
      continue;
    }

    const item = raw as Record<string, unknown>;
    const productId =
      typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = item.quantity;

    if (productId === "" || productId.length > 200) {
      details.push({
        field: "items",
        message: "معرّف أحد المنتجات غير صحيح.",
      });
      continue;
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > CART_MAX_QUANTITY
    ) {
      details.push({
        field: "items",
        message: `كمية كل منتج يجب أن تكون عددًا صحيحًا من 1 إلى ${CART_MAX_QUANTITY}.`,
      });
      continue;
    }

    if (seenProductIds.has(productId)) {
      details.push({
        field: "items",
        message: "لا يمكن تكرار نفس المنتج في السلة.",
      });
      continue;
    }

    seenProductIds.add(productId);
    value.push({ productId, quantity });
  }

  return { ok: details.length === 0, value, details };
}

// UUID used to make order retries safe (no duplicate orders).
export const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
