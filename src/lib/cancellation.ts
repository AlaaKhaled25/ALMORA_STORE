import type { CancellationReasonCode } from "@/lib/types";

export const CANCELLATION_NOTE_MAX_LENGTH = 200;

export const CANCELLATION_CONTACT_MESSAGE =
  "إذا كان لديك أي استفسار، يرجى التواصل مع المتجر.";

export const CANCELLATION_REASON_OPTIONS: {
  code: CancellationReasonCode;
  label: string;
}[] = [
  { code: "out_of_stock", label: "نفاد المخزون" },
  { code: "cannot_reach_customer", label: "تعذر التواصل مع العميل" },
  {
    code: "insufficient_delivery_info",
    label: "بيانات التوصيل غير كافية",
  },
  { code: "customer_request", label: "بناءً على طلب العميل" },
  { code: "other", label: "سبب آخر" },
];

export const CANCELLATION_REASON_LABELS: Record<
  CancellationReasonCode,
  string
> = {
  out_of_stock: "نفاد المخزون",
  cannot_reach_customer: "تعذر التواصل مع العميل",
  insufficient_delivery_info: "بيانات التوصيل غير كافية",
  customer_request: "بناءً على طلب العميل",
  other: "سبب آخر",
};

export function isCancellationReasonCode(
  value: unknown,
): value is CancellationReasonCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      CANCELLATION_REASON_LABELS,
      value,
    )
  );
}

export function getCancellationReasonLabel(value: unknown): string {
  return isCancellationReasonCode(value)
    ? CANCELLATION_REASON_LABELS[value]
    : "";
}
