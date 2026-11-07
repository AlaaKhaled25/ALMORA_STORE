import type { OrderStatus, PaymentStatus } from "@/lib/types";

// Arabic labels shared by the tracking page and the tracking API.

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "قيد المراجعة",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوع",
  paid: "مدفوع",
};

// Main workflow. Cancellation is a side action, not part of this sequence.
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export const ORDER_STATUSES: OrderStatus[] = [
  ...ORDER_STATUS_FLOW,
  "cancelled",
];

// Only the next step is allowed. Delivered and cancelled are final.
export function getNextOrderStatus(
  status: OrderStatus,
): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1] ?? null;
}

export function canCancelOrder(status: OrderStatus): boolean {
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "processing"
  );
}

// COD money can be collected only after delivery, and only once.
export function canCollectPayment(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return status === "delivered" && paymentStatus === "unpaid";
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABELS, value)
  );
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PAYMENT_STATUS_LABELS, value)
  );
}

export function getOrderStatusLabel(value: unknown): string {
  return isOrderStatus(value) ? ORDER_STATUS_LABELS[value] : "غير معروف";
}

export function getPaymentStatusLabel(value: unknown): string {
  return isPaymentStatus(value)
    ? PAYMENT_STATUS_LABELS[value]
    : "غير معروف";
}
