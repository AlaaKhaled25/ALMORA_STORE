"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  CANCELLATION_NOTE_MAX_LENGTH,
  CANCELLATION_REASON_LABELS,
  CANCELLATION_REASON_OPTIONS,
} from "@/lib/cancellation";
import { piastresToEgp } from "@/lib/money";
import {
  canCancelOrder,
  canCollectPayment,
  getNextOrderStatus,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import type {
  AdminOrderDetails,
  AdminOrderHistoryEntry,
  CancellationReasonCode,
  OrderStatus,
} from "@/lib/types";

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground disabled:opacity-60 dark:border-white/20";

const NEXT_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "قيد المراجعة",
  confirmed: "تأكيد الطلب",
  processing: "بدء التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "إلغاء الطلب",
};

async function readErrorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  const details = data?.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map((detail: { message?: string }) => detail.message)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }

  return data?.error?.message ?? "حدث خطأ غير متوقع.";
}

class UnauthorizedError extends Error {}

async function fetchOrder(orderId: string): Promise<AdminOrderDetails> {
  const response = await fetch(`/api/admin/orders/${orderId}`, {
    cache: "no-store",
  });

  if (response.status === 401) throw new UnauthorizedError("Unauthorized");
  if (!response.ok) throw new Error(await readErrorMessage(response));

  const data = await response.json();
  return data.order;
}

function formatDateTime(millis: number | null): string {
  if (millis === null) return "غير متاح";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(millis));
}

function statusBadgeClass(status: OrderStatus): string {
  if (status === "delivered") {
    return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }
  if (status === "shipped" || status === "processing") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }
  return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
}

function historyTitle(entry: AdminOrderHistoryEntry): string {
  if (entry.action === "payment.collected") return "تم تحصيل المبلغ";
  return ORDER_STATUS_LABELS[entry.newStatus];
}

function historyDetails(entry: AdminOrderHistoryEntry): string {
  if (entry.action === "payment.collected") {
    const before = entry.paymentStatusBefore
      ? PAYMENT_STATUS_LABELS[entry.paymentStatusBefore]
      : "غير مدفوع";
    const after = entry.paymentStatusAfter
      ? PAYMENT_STATUS_LABELS[entry.paymentStatusAfter]
      : "مدفوع";
    return `حالة الدفع: ${before} ← ${after}`;
  }

  if (entry.previousStatus) {
    return `من ${ORDER_STATUS_LABELS[entry.previousStatus]} إلى ${ORDER_STATUS_LABELS[entry.newStatus]}`;
  }

  return ORDER_STATUS_LABELS[entry.newStatus];
}

export default function OrderDetailsView({
  orderId,
}: {
  orderId: string;
}) {
  const router = useRouter();

  const [order, setOrder] = useState<AdminOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [busyAction, setBusyAction] = useState<
    "status" | "cancel" | "payment" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReasonCode, setCancelReasonCode] = useState<
    CancellationReasonCode | ""
  >("");
  const [cancelNote, setCancelNote] = useState("");

  const reloadData = useCallback(async () => {
    try {
      const updated = await fetchOrder(orderId);
      setOrder(updated);
      setDetailError(null);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        router.replace("/admin/login");
        return;
      }
      setDetailError(
        error instanceof Error
          ? error.message
          : "تعذر تحميل تفاصيل الطلب.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    let cancelled = false;

    // setState happens in the promise callbacks, after the request starts.
    fetchOrder(orderId)
      .then((updated) => {
        if (cancelled) return;
        setOrder(updated);
        setDetailError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof UnauthorizedError) {
          router.replace("/admin/login");
          return;
        }
        setDetailError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل تفاصيل الطلب.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  async function sendAction(
    path: string,
    body: Record<string, unknown>,
    busy: "status" | "cancel" | "payment",
    successText: string,
  ): Promise<boolean> {
    setBusyAction(busy);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return false;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setSuccessMessage(successText);
      await reloadData();
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "تعذر تنفيذ الإجراء.",
      );
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function handleNextStatus(nextStatus: OrderStatus) {
    if (
      nextStatus === "delivered" &&
      !window.confirm("هل تأكدت من تسليم الطلب للعميل؟")
    ) {
      return;
    }

    await sendAction(
      `/api/admin/orders/${orderId}/status`,
      { status: nextStatus },
      "status",
      "تم تحديث حالة الطلب.",
    );
  }

  function openCancelForm() {
    setActionError(null);
    setSuccessMessage(null);
    setShowCancelForm(true);
  }

  function closeCancelForm() {
    setShowCancelForm(false);
    setCancelReasonCode("");
    setCancelNote("");
    setActionError(null);
  }

  async function handleCancelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cancelReasonCode === "") {
      setActionError("اختر سبب الإلغاء.");
      return;
    }

    const note = cancelNote.trim();
    if (note.length > CANCELLATION_NOTE_MAX_LENGTH) {
      setActionError(
        `ملاحظة الإلغاء يجب ألا تتجاوز ${CANCELLATION_NOTE_MAX_LENGTH} حرف.`,
      );
      return;
    }

    if (cancelReasonCode === "other" && note === "") {
      setActionError("اكتب ملاحظة توضح سبب الإلغاء.");
      return;
    }

    if (
      !window.confirm(
        "هل تريد إلغاء هذا الطلب؟ سيظهر السبب للعميل، وسيتم إرجاع المخزون ولا يمكن التراجع.",
      )
    ) {
      return;
    }

    const succeeded = await sendAction(
      `/api/admin/orders/${orderId}/status`,
      {
        status: "cancelled",
        cancellationReasonCode: cancelReasonCode,
        cancellationNote: note,
      },
      "cancel",
      "تم إلغاء الطلب وإرجاع المخزون.",
    );

    if (succeeded) {
      setShowCancelForm(false);
      setCancelReasonCode("");
      setCancelNote("");
    }
  }

  async function handleCollectPayment() {
    if (
      !window.confirm("تأكيد تحصيل المبلغ نقدًا من العميل؟")
    ) {
      return;
    }

    await sendAction(
      `/api/admin/orders/${orderId}/payment`,
      { paymentStatus: "paid" },
      "payment",
      "تم تسجيل تحصيل المبلغ.",
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        جارٍ تحميل تفاصيل الطلب...
      </p>
    );
  }

  if (detailError || !order) {
    return (
      <div className="space-y-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
        <p role="alert">{detailError ?? "الطلب غير موجود."}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void reloadData();
          }}
          className="rounded-lg border border-red-300 px-3 py-1.5 font-medium dark:border-red-800"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const nextStatus = getNextOrderStatus(order.orderStatus);
  const cancellable = canCancelOrder(order.orderStatus);
  const payable = canCollectPayment(
    order.orderStatus,
    order.paymentStatus,
  );
  const hasActions = Boolean(nextStatus || cancellable || payable);
  const cancellationReasonLabel = order.cancellationReasonCode
    ? CANCELLATION_REASON_LABELS[order.cancellationReasonCode]
    : order.cancellationReason;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              رقم الطلب
            </p>
            <p className="font-bold" dir="ltr">
              {order.orderNumber}
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              تاريخ الإنشاء: {formatDateTime(order.createdAt)}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              آخر تحديث: {formatDateTime(order.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClass(order.orderStatus)}`}
            >
              {ORDER_STATUS_LABELS[order.orderStatus]}
            </span>
            <span
              className={
                order.paymentStatus === "paid"
                  ? "rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300"
                  : "rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }
            >
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
          </div>
        </div>

        {order.orderStatus === "cancelled" ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <p>سبب الإلغاء: {cancellationReasonLabel || "غير مسجل"}</p>
            {order.cancellationNote ? (
              <p>ملاحظة للعميل: {order.cancellationNote}</p>
            ) : null}
            <p>
              المخزون:{" "}
              {order.stockRestored
                ? "تم إرجاع المخزون."
                : "لم يُسجل إرجاع المخزون."}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="font-bold">الإجراءات</h2>

        {actionError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {actionError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
            {successMessage}
          </p>
        ) : null}

        {hasActions ? (
          showCancelForm && cancellable ? (
            <form
              onSubmit={handleCancelSubmit}
              className="mt-4 space-y-3 rounded-xl border border-red-200 p-4 dark:border-red-900"
            >
              <label className="block space-y-1 text-sm">
                <span className="font-medium">سبب الإلغاء</span>
                <select
                  value={cancelReasonCode}
                  onChange={(event) =>
                    setCancelReasonCode(
                      event.target.value as CancellationReasonCode | "",
                    )
                  }
                  disabled={busyAction !== null}
                  className={fieldClass}
                >
                  <option value="">اختر سبب الإلغاء</option>
                  {CANCELLATION_REASON_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium">
                  {cancelReasonCode === "other"
                    ? "ملاحظة توضح السبب (مطلوبة)"
                    : "ملاحظة للعميل (اختياري)"}
                </span>
                <textarea
                  value={cancelNote}
                  onChange={(event) => setCancelNote(event.target.value)}
                  rows={3}
                  maxLength={CANCELLATION_NOTE_MAX_LENGTH}
                  disabled={busyAction !== null}
                  className={fieldClass}
                />
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {cancelNote.length}/{CANCELLATION_NOTE_MAX_LENGTH}
                </span>
              </label>

              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                هذا السبب سيظهر للعميل
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busyAction !== null}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "cancel"
                    ? "جارٍ الإلغاء..."
                    : "تأكيد الإلغاء"}
                </button>
                <button
                  type="button"
                  onClick={closeCancelForm}
                  disabled={busyAction !== null}
                  className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-white/20"
                >
                  تراجع
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStatus ? (
                <button
                  type="button"
                  onClick={() => void handleNextStatus(nextStatus)}
                  disabled={busyAction !== null}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "status"
                    ? "جارٍ التنفيذ..."
                    : NEXT_ACTION_LABELS[nextStatus]}
                </button>
              ) : null}

              {payable ? (
                <button
                  type="button"
                  onClick={() => void handleCollectPayment()}
                  disabled={busyAction !== null}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "payment"
                    ? "جارٍ التنفيذ..."
                    : "تم تحصيل المبلغ"}
                </button>
              ) : null}

              {cancellable ? (
                <button
                  type="button"
                  onClick={openCancelForm}
                  disabled={busyAction !== null}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  إلغاء الطلب
                </button>
              ) : null}
            </div>
          )
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            لا توجد إجراءات متاحة لهذا الطلب.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="font-bold">بيانات العميل والتوصيل</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            الاسم: <span className="font-medium">{order.recipientName}</span>
          </p>
          <p>
            الهاتف:{" "}
            <span className="font-medium" dir="ltr">
              {order.recipientPhone}
            </span>
          </p>
          <p>
            المدينة:{" "}
            <span className="font-medium">{order.shippingAddress.city}</span>
          </p>
          <p>
            العنوان:{" "}
            <span className="font-medium">
              {order.shippingAddress.addressLine}
            </span>
          </p>
          <p className="sm:col-span-2">
            ملاحظات العميل:{" "}
            <span className="font-medium">
              {order.shippingAddress.notes || "لا توجد"}
            </span>
          </p>
          <p>
            طريقة الدفع:{" "}
            <span className="font-medium">الدفع عند الاستلام</span>
          </p>
          <p>
            حالة الدفع:{" "}
            <span className="font-medium">
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="font-bold">منتجات الطلب</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/15">
                <th className="p-2 font-semibold">المنتج</th>
                <th className="p-2 font-semibold">سعر الوحدة</th>
                <th className="p-2 font-semibold">الكمية</th>
                <th className="p-2 font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr
                  key={`${item.productId}-${index}`}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="p-2">{item.productNameSnapshot}</td>
                  <td className="p-2 whitespace-nowrap">
                    {piastresToEgp(item.unitPriceSnapshot)} ج.م
                  </td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2 whitespace-nowrap">
                    {piastresToEgp(item.lineTotal)} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm dark:border-white/15">
          <div className="flex justify-between gap-3">
            <span>المجموع الفرعي</span>
            <span>{piastresToEgp(order.subtotal)} ج.م</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>رسوم التوصيل</span>
            <span>{piastresToEgp(order.deliveryFee)} ج.م</span>
          </div>
          <div className="flex justify-between gap-3 font-bold">
            <span>الإجمالي</span>
            <span>{piastresToEgp(order.totalAmount)} ج.م</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="font-bold">سجل الحالة والدفع</h2>

        {order.history.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            لا يوجد سجل بعد.
          </p>
        ) : (
          <ol className="mt-4">
            {order.history.map((entry, index) => {
              const isLast = index === order.history.length - 1;

              return (
                <li
                  key={entry.id}
                  className="relative flex gap-3 pb-5 last:pb-0"
                >
                  {!isLast ? (
                    <span className="absolute top-4 bottom-0 right-2 w-px bg-black/10 dark:bg-white/15" />
                  ) : null}
                  <span
                    className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-foreground bg-background"
                    aria-hidden="true"
                  />
                  <div className="text-sm">
                    <p className="font-medium">{historyTitle(entry)}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {historyDetails(entry)}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      بواسطة:{" "}
                      {entry.changedByUserEmail ||
                        entry.changedByUserId ||
                        "النظام"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.reason ? (
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        السبب: {entry.reason}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
