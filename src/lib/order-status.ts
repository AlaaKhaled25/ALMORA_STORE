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
