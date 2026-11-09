"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { CANCELLATION_CONTACT_MESSAGE } from "@/lib/cancellation";
import {
  getLastOrderSnapshot,
  saveLastOrderNumber,
  subscribeLastOrder,
} from "@/lib/last-order";
import { piastresToEgp } from "@/lib/money";
import type { TrackedOrder } from "@/lib/tracking";
import type { OrderStatus } from "@/lib/types";

const getServerLastOrder = () => "";

function formatDateTime(millis: number | null): string {
  if (millis === null) return "غير متاح";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(millis));
}

function readErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string") return error.message;
  }
  return "لم نعثر على طلب بهذه البيانات.";
}

function statusBadgeClass(status: OrderStatus): string {
  if (status === "delivered") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-700 ring-red-600/15";
  }
  if (status === "shipped" || status === "processing") {
    return "bg-blue-50 text-blue-700 ring-blue-600/15";
  }
  return "bg-amber-50 text-amber-700 ring-amber-600/15";
}

function statusIconClass(status: OrderStatus): string {
  if (status === "delivered") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-700";
  }
  if (status === "shipped" || status === "processing") {
    return "bg-blue-50 text-blue-700";
  }
  if (status === "confirmed") {
    return "bg-brand-success/10 text-brand-success";
  }
  return "bg-amber-50 text-amber-700";
}

function StatusIcon({ status }: { status: OrderStatus }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {status === "pending" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2" />
        </>
      ) : null}
      {status === "confirmed" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12 2.3 2.3 4.7-4.7" />
        </>
      ) : null}
      {status === "processing" ? (
        <>
          <path d="M4 7h16v13H4z" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M4 12h16" />
        </>
      ) : null}
      {status === "shipped" ? (
        <>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17" cy="18" r="1.5" />
        </>
      ) : null}
      {status === "delivered" ? (
        <>
          <path d="m4 11 5 5L20 5" />
          <path d="M20 12v7H4v-7" />
        </>
      ) : null}
      {status === "cancelled" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </>
      ) : null}
    </svg>
  );
}

const inputClass =
  "h-12 w-full rounded-2xl border border-brand-line bg-brand-cream/50 px-4 text-sm outline-none transition placeholder:text-brand-muted/60 focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10";

function TrackSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-hidden="true">
      <div className="h-32 animate-pulse rounded-3xl border border-brand-line bg-white" />
      <div className="h-56 animate-pulse rounded-3xl border border-brand-line bg-white" />
      <div className="h-40 animate-pulse rounded-3xl border border-brand-line bg-white" />
    </div>
  );
}

export default function TrackView() {
  const lastOrderNumber = useSyncExternalStore(
    subscribeLastOrder,
    getLastOrderSnapshot,
    getServerLastOrder,
  );

  const [orderNumberInput, setOrderNumberInput] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const orderNumber = orderNumberInput ?? lastOrderNumber;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOrder(null);

    if (orderNumber.trim() === "" || phone.trim() === "") {
      setError("أدخل رقم الطلب ورقم الهاتف.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/store/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          phone,
        }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(readErrorMessage(body));
        return;
      }

      const result = (body as { order?: TrackedOrder } | null)?.order;
      if (!result) {
        setError("لم نعثر على طلب بهذه البيانات.");
        return;
      }

      setOrder(result);
      saveLastOrderNumber(result.orderNumber);
    } catch {
      setError("تعذر تتبع الطلب. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-wine">
          متابعة الطلب
        </p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
          تتبع طلبك
        </h1>
        <p className="mt-2 text-sm leading-7 text-brand-muted">
          أدخل رقم الطلب ورقم الهاتف الذي استخدمته عند الطلب.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        aria-busy={loading}
        className="mt-5 rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold">رقم الطلب</span>
            <input
              type="text"
              value={orderNumber}
              onChange={(event) => setOrderNumberInput(event.target.value)}
              placeholder="ORD-XXXXXXXX"
              autoComplete="off"
              dir="ltr"
              className={`${inputClass} text-start`}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold">رقم الهاتف</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01012345678"
              autoComplete="tel"
              dir="ltr"
              className={`${inputClass} text-start`}
            />
          </label>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl bg-brand-danger/5 p-3 text-sm text-brand-danger"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 min-h-12 w-full rounded-full bg-brand-wine px-6 font-semibold text-white transition hover:bg-brand-wine-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "جارٍ البحث..." : "تتبع الطلب"}
        </button>

        <p className="mt-3 text-center text-xs text-brand-muted">
          لا نخزّن رقم الهاتف في المتصفح. يُستخدم فقط للتحقق من الطلب.
        </p>
      </form>

      {loading && !order ? <TrackSkeleton /> : null}

      {order ? (
        <div className="mt-6 space-y-5">
          <section className="rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand-muted">
                  رقم الطلب
                </p>
                <p className="mt-1 font-extrabold text-brand-wine" dir="ltr">
                  {order.orderNumber}
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  تاريخ الطلب: {formatDateTime(order.createdAt)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${statusBadgeClass(order.status)}`}
              >
                {order.statusLabel}
              </span>
            </div>
          </section>

          {order.status === "cancelled" ? (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
                  <StatusIcon status="cancelled" />
                </span>
                <div>
                  <h2 className="font-bold">
                    {order.cancellation ? "تم إلغاء طلبك" : "تم إلغاء الطلب"}
                  </h2>
                  {order.cancellation ? (
                    <div className="mt-2 space-y-1 text-sm leading-7">
                      <p>السبب: {order.cancellation.reasonLabel}</p>
                      {order.cancellation.note ? (
                        <p>ملاحظات: {order.cancellation.note}</p>
                      ) : null}
                      <p>{CANCELLATION_CONTACT_MESSAGE}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5">
            <h2 className="font-extrabold">حالة الطلب</h2>
            <ol className="mt-5">
              {order.statusHistory.map((event, index) => {
                const isLast = index === order.statusHistory.length - 1;

                return (
                  <li
                    key={`${event.status}-${index}`}
                    className="relative flex gap-3 pb-6 last:pb-0"
                  >
                    {!isLast ? (
                      <span
                        className="absolute top-12 bottom-0 right-5 w-px bg-brand-line"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={`relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${statusIconClass(event.status)}`}
                    >
                      <StatusIcon status={event.status} />
                    </span>
                    <div className="pt-1">
                      <p className="font-semibold">{event.label}</p>
                      <p className="mt-0.5 text-xs text-brand-muted">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5">
            <h2 className="font-extrabold">منتجات الطلب</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {order.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-brand-muted">
                      الكمية: {item.quantity} — سعر الوحدة:{" "}
                      {piastresToEgp(item.unitPrice)} ج.م
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">
                    {piastresToEgp(item.lineTotal)} ج.م
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-brand-line pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted">المجموع الفرعي</span>
                <span>{piastresToEgp(order.subtotal)} ج.م</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-brand-muted">رسوم التوصيل</span>
                <span>{piastresToEgp(order.deliveryFee)} ج.م</span>
              </div>
              <div className="flex justify-between gap-3 text-base font-bold">
                <span>الإجمالي</span>
                <span className="text-brand-wine">
                  {piastresToEgp(order.totalAmount)} ج.م
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-brand-line bg-white p-5 text-sm shadow-sm shadow-brand-ink/5">
            <h2 className="font-extrabold">الدفع والتوصيل</h2>
            <div className="mt-3 space-y-2 leading-7 text-brand-muted">
              <p>
                طريقة الدفع:{" "}
                <span className="font-semibold text-brand-ink">
                  {order.paymentMethodLabel}
                </span>
              </p>
              <p>
                حالة الدفع:{" "}
                <span className="font-semibold text-brand-ink">
                  {order.paymentStatusLabel}
                </span>
              </p>
              <p>
                العنوان: {order.shippingAddress.city} —{" "}
                {order.shippingAddress.addressLine}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
