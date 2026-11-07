import { normalizeEgyptianPhone } from "@/lib/checkout";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/order-status";
import {
  ORDERS_COLLECTION,
  ORDER_STATUS_HISTORY_COLLECTION,
} from "@/lib/orders";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

// Public tracking result. It intentionally contains no internal fields:
// no admin data, audit data, idempotency key, customer phone or internal notes.

export type TrackedOrderItem = {
  name: string;
  unitPrice: number; // piastres
  quantity: number;
  lineTotal: number; // piastres
};

export type TrackedStatusEvent = {
  status: OrderStatus;
  label: string;
  createdAt: number | null;
};

export type TrackedOrder = {
  orderNumber: string;
  createdAt: number | null;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: "COD";
  paymentMethodLabel: string;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  items: TrackedOrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: "EGP";
  shippingAddress: {
    city: string;
    addressLine: string;
  };
  statusHistory: TrackedStatusEvent[];
};

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

function toTrackedItems(value: unknown): TrackedOrderItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => {
      const unitPrice = Number(item.unitPriceSnapshot ?? 0);
      const quantity = Number(item.quantity ?? 0);

      return {
        name: String(item.productNameSnapshot ?? ""),
        unitPrice,
        quantity,
        lineTotal: Number(item.lineTotal ?? unitPrice * quantity),
      };
    })
    .filter((item) => item.name !== "" && item.quantity > 0);
}

function toShippingAddress(value: unknown): {
  city: string;
  addressLine: string;
} {
  const data =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  // Notes are deliberately left out of the public tracking response.
  return {
    city: String(data.city ?? ""),
    addressLine: String(data.addressLine ?? ""),
  };
}

// Returns null for a wrong order number OR a wrong phone number.
export async function findTrackedOrder(
  orderNumberInput: unknown,
  phoneInput: unknown,
): Promise<TrackedOrder | null> {
  if (typeof orderNumberInput !== "string" || typeof phoneInput !== "string") {
    return null;
  }

  const orderNumber = orderNumberInput
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const phone = normalizeEgyptianPhone(phoneInput);

  if (orderNumber === "" || orderNumber.length > 50 || !phone) return null;

  const db = getAdminDb();
  const orderDoc = await db.collection(ORDERS_COLLECTION).doc(orderNumber).get();
  if (!orderDoc.exists) return null;

  const data = orderDoc.data() ?? {};
  const storedPhone = normalizeEgyptianPhone(
    String(data.recipientPhone ?? ""),
  );

  // One generic "not found" result for both a wrong number and a wrong phone.
  if (storedPhone !== phone) return null;

  const historySnapshot = await db
    .collection(ORDER_STATUS_HISTORY_COLLECTION)
    .where("orderId", "==", orderNumber)
    .get();

  const status: OrderStatus = isOrderStatus(data.orderStatus)
    ? data.orderStatus
    : "pending";
  const paymentStatus: PaymentStatus = isPaymentStatus(data.paymentStatus)
    ? data.paymentStatus
    : "unpaid";
  const createdAt = timestampToMillis(data.createdAt);

  const statusHistory: TrackedStatusEvent[] = historySnapshot.docs
    .map((doc) => {
      const history = doc.data();
      if (!isOrderStatus(history.newStatus)) return null;

      return {
        status: history.newStatus,
        label: getOrderStatusLabel(history.newStatus),
        createdAt: timestampToMillis(history.createdAt),
      };
    })
    .filter((event): event is TrackedStatusEvent => event !== null)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  if (statusHistory.length === 0) {
    statusHistory.push({
      status,
      label: getOrderStatusLabel(status),
      createdAt,
    });
  }

  return {
    orderNumber,
    createdAt,
    status,
    statusLabel: getOrderStatusLabel(status),
    paymentMethod: "COD",
    paymentMethodLabel: "الدفع عند الاستلام",
    paymentStatus,
    paymentStatusLabel: getPaymentStatusLabel(paymentStatus),
    items: toTrackedItems(data.items),
    subtotal: Number(data.subtotal ?? 0),
    deliveryFee: Number(data.deliveryFee ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
    currency: "EGP",
    shippingAddress: toShippingAddress(data.shippingAddress),
    statusHistory,
  };
}
