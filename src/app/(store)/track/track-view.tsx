"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
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

const inputClass =
  "w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

export default function TrackView() {
  const lastOrderNumber = useSyncExternalStore(
    subscribeLastOrder,
    getLastOrderSnapshot,
    getServerLastOrder,
  );

  // null means "use the remembered order number"; typing switches to local state.
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold sm:text-3xl">تتبع طلبك</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        أدخل رقم الطلب ورقم الهاتف الذي استخدمته عند الطلب.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 rounded-2xl border border-black/10 p-5 dark:border-white/15"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">رقم الطلب</span>
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

          <label className="block space-y-1 text-sm">
            <span className="font-medium">رقم الهاتف</span>
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
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "جارٍ البحث..." : "تتبع الطلب"}
        </button>

        <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
          لا نخزّن رقم الهاتف في المتصفح. يُستخدم فقط للتحقق من الطلب.
        </p>
      </form>

      {order ? (
        <div className="mt-6 space-y-5">
          <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  رقم الطلب
                </p>
                <p className="font-bold" dir="ltr">
                  {order.orderNumber}
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  تاريخ الطلب: {formatDateTime(order.createdAt)}
                </p>
              </div>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClass(order.status)}`}
              >
                {order.statusLabel}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
            <h2 className="font-bold">حالة الطلب</h2>
            <ol className="mt-4">
              {order.statusHistory.map((event, index) => {
                const isLast = index === order.statusHistory.length - 1;

                return (
                  <li
                    key={`${event.status}-${index}`}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {!isLast ? (
                      <span className="absolute top-4 bottom-0 right-2 w-px bg-black/10 dark:bg-white/15" />
                    ) : null}
                    <span
                      className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-foreground bg-background"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium">{event.label}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
            <h2 className="font-bold">منتجات الطلب</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {order.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      الكمية: {item.quantity} — سعر الوحدة:{" "}
                      {piastresToEgp(item.unitPrice)} ج.م
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {piastresToEgp(item.lineTotal)} ج.م
                  </span>
                </li>
              ))}
            </ul>

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

          <section className="rounded-2xl border border-black/10 p-5 text-sm dark:border-white/15">
            <h2 className="font-bold">الدفع والتوصيل</h2>
            <div className="mt-3 space-y-2">
              <p>
                طريقة الدفع: <span className="font-medium">{order.paymentMethodLabel}</span>
              </p>
              <p>
                حالة الدفع:{" "}
                <span className="font-medium">{order.paymentStatusLabel}</span>
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
