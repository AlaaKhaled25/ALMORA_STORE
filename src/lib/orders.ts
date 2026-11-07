import { randomInt } from "node:crypto";
import {
  Timestamp,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import type { ApiErrorCode, ApiErrorDetail } from "@/lib/api-errors";
import {
  IDEMPOTENCY_KEY_PATTERN,
  validateCartItems,
  validateCheckoutCustomer,
} from "@/lib/checkout";
import { DELIVERY_FEE_PIASTRES } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import type {
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from "@/lib/types";

export const ORDERS_COLLECTION = "orders";
export const ORDER_STATUS_HISTORY_COLLECTION = "orderStatusHistory";
export const ORDER_IDEMPOTENCY_COLLECTION = "orderIdempotency";

const ORDER_NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ORDER_NUMBER_LENGTH = 8;

export type OrderConfirmation = {
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentMethod: "COD";
  paymentStatus: PaymentStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: {
    city: string;
    addressLine: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: "EGP";
  createdAt: number | null;
};

export type CreateStoreOrderResult =
  | { ok: true; created: boolean; order: OrderConfirmation }
  | {
      ok: false;
      status: number;
      code: ApiErrorCode;
      message: string;
      details?: ApiErrorDetail[];
      extra?: Record<string, unknown>;
    };

function generateOrderNumber(): string {
  let text = "";
  for (let index = 0; index < ORDER_NUMBER_LENGTH; index += 1) {
    text += ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)];
  }
  return `ORD-${text}`;
}

function timestampToMillis(value: unknown): number | null {
  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number };
    if (typeof maybeTimestamp.toMillis === "function") {
      return maybeTimestamp.toMillis();
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function toOrderItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      productId: String(item.productId ?? ""),
      productNameSnapshot: String(item.productNameSnapshot ?? ""),
      unitPriceSnapshot: Number(item.unitPriceSnapshot ?? 0),
      quantity: Number(item.quantity ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
    }))
    .filter((item) => item.productId !== "");
}

function toShippingAddress(value: unknown): {
  city: string;
  addressLine: string;
  notes?: string;
} {
  const data =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  const notes =
    typeof data.notes === "string" && data.notes.trim() !== ""
      ? data.notes.trim()
      : undefined;

  return {
    city: String(data.city ?? ""),
    addressLine: String(data.addressLine ?? ""),
    ...(notes ? { notes } : {}),
  };
}

function toOrderConfirmation(
  orderNumber: string,
  data: Record<string, unknown>,
): OrderConfirmation {
  return {
    orderNumber: String(data.orderNumber ?? orderNumber),
    orderStatus: (data.orderStatus as OrderStatus | undefined) ?? "pending",
    paymentMethod: "COD",
    paymentStatus:
      (data.paymentStatus as PaymentStatus | undefined) ?? "unpaid",
    recipientName: String(data.recipientName ?? ""),
    recipientPhone: String(data.recipientPhone ?? ""),
    shippingAddress: toShippingAddress(data.shippingAddress),
    items: toOrderItems(data.items),
    subtotal: Number(data.subtotal ?? 0),
    deliveryFee: Number(data.deliveryFee ?? DELIVERY_FEE_PIASTRES),
    totalAmount: Number(data.totalAmount ?? 0),
    currency: "EGP",
    createdAt: timestampToMillis(data.createdAt),
  };
}

// Creates one order atomically. All reads happen before any write.
export async function createStoreOrder(
  body: unknown,
): Promise<CreateStoreOrderResult> {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "صيغة الطلب غير صحيحة.",
    };
  }

  const input = body as Record<string, unknown>;
  const parsedItems = validateCartItems(input.items);
  const parsedCustomer = validateCheckoutCustomer(input);
  const details: ApiErrorDetail[] = [
    ...parsedItems.details,
    ...parsedCustomer.details,
  ];

  const rawKey =
    typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
    details.push({
      field: "idempotencyKey",
      message: "معرّف الطلب غير صحيح. أعد تحميل الصفحة وحاول مرة أخرى.",
    });
  }

  let expectedTotal: number | null = null;
  if (input.expectedTotal !== undefined && input.expectedTotal !== null) {
    if (
      typeof input.expectedTotal !== "number" ||
      !Number.isSafeInteger(input.expectedTotal) ||
      input.expectedTotal < 0
    ) {
      details.push({
        field: "expectedTotal",
        message: "الإجمالي المتوقع غير صحيح.",
      });
    } else {
      expectedTotal = input.expectedTotal;
    }
  }

  if (details.length > 0) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "يرجى تصحيح الحقول المطلوبة.",
      details,
    };
  }

  const db = getAdminDb();
  const ordersRef = db.collection(ORDERS_COLLECTION);
  const productsRef = db.collection("products");
  const categoriesRef = db.collection("categories");
  const historyRef = db.collection(ORDER_STATUS_HISTORY_COLLECTION);
  const idempotencyKey = rawKey.toLowerCase();
  const idempotencyRef = db
    .collection(ORDER_IDEMPOTENCY_COLLECTION)
    .doc(idempotencyKey);

  return db.runTransaction<CreateStoreOrderResult>(async (transaction) => {
    // 1) If this request was already completed, return the same order.
    const idempotencyDoc = await transaction.get(idempotencyRef);
    if (idempotencyDoc.exists) {
      const saved = idempotencyDoc.data() ?? {};
      const existingOrderNumber = String(saved.orderNumber ?? "");

      if (existingOrderNumber !== "") {
        const existingOrder = await transaction.get(
          ordersRef.doc(existingOrderNumber),
        );
        if (existingOrder.exists) {
          return {
            ok: true,
            created: false,
            order: toOrderConfirmation(
              existingOrderNumber,
              existingOrder.data() ?? {},
            ),
          };
        }
      }

      return {
        ok: false,
        status: 409,
        code: "CONFLICT",
        message: "تم استخدام هذا الطلب مسبقًا. أعد تحميل الصفحة وحاول مرة أخرى.",
      };
    }

    // 2) Read all products, then all categories (still before any write).
    const productSnapshots: {
      item: { productId: string; quantity: number };
      doc: DocumentSnapshot;
    }[] = [];

    for (const item of parsedItems.value) {
      const doc = await transaction.get(productsRef.doc(item.productId));
      productSnapshots.push({ item, doc });
    }

    const categoryIds = new Set<string>();
    for (const { doc } of productSnapshots) {
      if (!doc.exists) continue;
      const categoryId = String(doc.data()?.categoryId ?? "");
      if (categoryId !== "") categoryIds.add(categoryId);
    }

    const activeCategories = new Map<string, boolean>();
    for (const categoryId of categoryIds) {
      const categoryDoc = await transaction.get(
        categoriesRef.doc(categoryId),
      );
      activeCategories.set(
        categoryId,
        categoryDoc.exists && categoryDoc.data()?.status !== "inactive",
      );
    }

    // 3) Validate current visibility, price and stock.
    const orderItems: OrderItem[] = [];
    const stockUpdates: {
      ref: DocumentReference;
      stockQuantity: number;
    }[] = [];
    const itemDetails: ApiErrorDetail[] = [];
    let hasUnavailableItem = false;
    let hasStockIssue = false;

    for (const { item, doc } of productSnapshots) {
      if (!doc.exists) {
        hasUnavailableItem = true;
        itemDetails.push({
          field: "items",
          message: "أحد المنتجات في السلة لم يعد متوفرًا.",
        });
        continue;
      }

      const data = doc.data() ?? {};
      const name = String(data.name ?? "");
      const categoryId = String(data.categoryId ?? "");

      if (data.status !== "active") {
        hasUnavailableItem = true;
        itemDetails.push({
          field: "items",
          message: `المنتج "${name}" لم يعد متوفرًا.`,
        });
        continue;
      }

      if (!activeCategories.get(categoryId)) {
        hasUnavailableItem = true;
        itemDetails.push({
          field: "items",
          message: `المنتج "${name}" لم يعد متوفرًا.`,
        });
        continue;
      }

      const price = Number(data.price ?? 0);
      const stockQuantity = Number(data.stockQuantity ?? 0);

      if (!Number.isSafeInteger(price) || price <= 0) {
        hasUnavailableItem = true;
        itemDetails.push({
          field: "items",
          message: `سعر المنتج "${name}" غير صحيح.`,
        });
        continue;
      }

      if (
        !Number.isFinite(stockQuantity) ||
        stockQuantity < item.quantity
      ) {
        hasStockIssue = true;
        itemDetails.push({
          field: "items",
          message: `الكمية المطلوبة من "${name}" أكبر من المتاح.`,
        });
        continue;
      }

      orderItems.push({
        productId: item.productId,
        productNameSnapshot: name,
        unitPriceSnapshot: price,
        quantity: item.quantity,
        lineTotal: price * item.quantity,
      });
      stockUpdates.push({
        ref: productsRef.doc(item.productId),
        stockQuantity: stockQuantity - item.quantity,
      });
    }

    if (hasUnavailableItem) {
      return {
        ok: false,
        status: 409,
        code: "CONFLICT",
        message: "بعض المنتجات في السلة لم تعد متاحة.",
        details: itemDetails,
      };
    }

    if (hasStockIssue) {
      return {
        ok: false,
        status: 409,
        code: "INSUFFICIENT_STOCK",
        message: "الكمية المطلوبة أكبر من المخزون المتاح.",
        details: itemDetails,
      };
    }

    // 4) Calculate totals on the server only.
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    const deliveryFee = DELIVERY_FEE_PIASTRES;
    const totalAmount = subtotal + deliveryFee;

    if (expectedTotal !== null && expectedTotal !== totalAmount) {
      return {
        ok: false,
        status: 409,
        code: "PRICE_CHANGED",
        message: "تغيّرت أسعار بعض المنتجات. راجع الإجمالي الجديد ثم أعد المحاولة.",
        extra: { subtotal, deliveryFee, totalAmount },
      };
    }

    // 5) Pick an unused order number (the document id).
    let orderNumber = "";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateOrderNumber();
      const existing = await transaction.get(ordersRef.doc(candidate));
      if (!existing.exists) {
        orderNumber = candidate;
        break;
      }
    }

    if (orderNumber === "") {
      throw new Error("Could not generate a unique order number.");
    }

    const now = Timestamp.now();
    const shippingAddress = {
      city: parsedCustomer.value.city,
      addressLine: parsedCustomer.value.addressLine,
      ...(parsedCustomer.value.notes
        ? { notes: parsedCustomer.value.notes }
        : {}),
    };

    const orderData = {
      id: orderNumber,
      orderNumber,
      recipientName: parsedCustomer.value.recipientName,
      recipientPhone: parsedCustomer.value.recipientPhone,
      shippingAddress,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      currency: "EGP",
      paymentMethod: "COD",
      paymentStatus: "unpaid",
      orderStatus: "pending",
      stockRestored: false,
      createdAt: now,
      updatedAt: now,
    };

    // 6) Writes: order + stock + history + idempotency (all atomic).
    transaction.set(ordersRef.doc(orderNumber), orderData);

    for (const update of stockUpdates) {
      transaction.update(update.ref, {
        stockQuantity: update.stockQuantity,
        updatedAt: now,
      });
    }

    transaction.set(historyRef.doc(), {
      orderId: orderNumber,
      orderNumber,
      previousStatus: null,
      newStatus: "pending",
      changedByUserId: null,
      reason: "تم إنشاء الطلب",
      createdAt: now,
    });

    transaction.set(idempotencyRef, {
      key: idempotencyKey,
      orderId: orderNumber,
      orderNumber,
      createdAt: now,
    });

    return {
      ok: true,
      created: true,
      order: toOrderConfirmation(
        orderNumber,
        orderData as Record<string, unknown>,
      ),
    };
  });
}
