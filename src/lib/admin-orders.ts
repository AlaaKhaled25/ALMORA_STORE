import { getAdminDb } from "@/lib/firebase-admin";
import { isOrderStatus, isPaymentStatus } from "@/lib/order-status";
import {
  ORDERS_COLLECTION,
  ORDER_STATUS_HISTORY_COLLECTION,
} from "@/lib/orders";
import type {
  AdminOrderDetails,
  AdminOrderHistoryEntry,
  AdminOrderListItem,
  OrderHistoryAction,
  OrderItem,
} from "@/lib/types";

export function timestampToMillis(value: unknown): number | null {
  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number };
    if (typeof maybeTimestamp.toMillis === "function") {
      return maybeTimestamp.toMillis();
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

// Used by the details page and by stock restoration.
export function readOrderItems(value: unknown): OrderItem[] {
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
    .filter(
      (item) =>
        item.productId !== "" &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0,
    );
}

function toHistoryAction(value: unknown): OrderHistoryAction | null {
  if (
    value === "status.change" ||
    value === "order.cancel" ||
    value === "payment.collected"
  ) {
    return value;
  }
  return null;
}

function toAdminOrderListItem(
  id: string,
  data: Record<string, unknown>,
): AdminOrderListItem {
  return {
    id,
    orderNumber: String(data.orderNumber ?? id),
    recipientName: String(data.recipientName ?? ""),
    recipientPhone: String(data.recipientPhone ?? ""),
    totalAmount: Number(data.totalAmount ?? 0),
    currency: "EGP",
    orderStatus: isOrderStatus(data.orderStatus)
      ? data.orderStatus
      : "pending",
    paymentStatus: isPaymentStatus(data.paymentStatus)
      ? data.paymentStatus
      : "unpaid",
    createdAt: timestampToMillis(data.createdAt),
  };
}

function toAdminOrderHistory(
  id: string,
  data: Record<string, unknown>,
): AdminOrderHistoryEntry | null {
  if (!isOrderStatus(data.newStatus)) return null;

  return {
    id,
    action: toHistoryAction(data.action),
    previousStatus: isOrderStatus(data.previousStatus)
      ? data.previousStatus
      : null,
    newStatus: data.newStatus,
    changedByUserId:
      typeof data.changedByUserId === "string"
        ? data.changedByUserId
        : null,
    changedByUserEmail:
      typeof data.changedByUserEmail === "string"
        ? data.changedByUserEmail
        : null,
    paymentStatusBefore: isPaymentStatus(data.paymentStatusBefore)
      ? data.paymentStatusBefore
      : null,
    paymentStatusAfter: isPaymentStatus(data.paymentStatusAfter)
      ? data.paymentStatusAfter
      : null,
    reason: typeof data.reason === "string" ? data.reason.trim() : "",
    createdAt: timestampToMillis(data.createdAt),
  };
}

// Read all orders, then sort in code. No composite index is needed.
// Good for an MVP; switch to server-side pagination when the list grows.
export async function listAdminOrders(): Promise<AdminOrderListItem[]> {
  const snapshot = await getAdminDb().collection(ORDERS_COLLECTION).get();

  return snapshot.docs
    .map((doc) =>
      toAdminOrderListItem(
        doc.id,
        doc.data() as Record<string, unknown>,
      ),
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function getAdminOrderDetails(
  orderId: string,
): Promise<AdminOrderDetails | null> {
  const db = getAdminDb();
  const [orderDoc, historySnapshot] = await Promise.all([
    db.collection(ORDERS_COLLECTION).doc(orderId).get(),
    db
      .collection(ORDER_STATUS_HISTORY_COLLECTION)
      .where("orderId", "==", orderId)
      .get(),
  ]);

  if (!orderDoc.exists) return null;

  const data = orderDoc.data() ?? {};
  const listItem = toAdminOrderListItem(orderDoc.id, data);
  const address =
    typeof data.shippingAddress === "object" &&
    data.shippingAddress !== null
      ? (data.shippingAddress as Record<string, unknown>)
      : {};

  const history = historySnapshot.docs
    .map((doc) =>
      toAdminOrderHistory(doc.id, doc.data() as Record<string, unknown>),
    )
    .filter((entry): entry is AdminOrderHistoryEntry => entry !== null)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  return {
    ...listItem,
    shippingAddress: {
      city: String(address.city ?? ""),
      addressLine: String(address.addressLine ?? ""),
      notes:
        typeof address.notes === "string" ? address.notes.trim() : "",
    },
    items: readOrderItems(data.items),
    subtotal: Number(data.subtotal ?? 0),
    deliveryFee: Number(data.deliveryFee ?? 0),
    paymentMethod: "COD",
    stockRestored: data.stockRestored === true,
    cancellationReason:
      typeof data.cancellationReason === "string"
        ? data.cancellationReason.trim()
        : "",
    updatedAt: timestampToMillis(data.updatedAt),
    cancelledAt: timestampToMillis(data.cancelledAt),
    history,
  };
}
