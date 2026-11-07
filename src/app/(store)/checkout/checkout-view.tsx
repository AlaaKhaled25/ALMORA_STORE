"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useCartValidation } from "@/components/store/use-cart-validation";
import type { ApiErrorDetail } from "@/lib/api-errors";
import {
  clearCart,
  getCartSnapshot,
  parseCartSnapshot,
  subscribeCart,
} from "@/lib/cart";
import { validateCheckoutCustomer } from "@/lib/checkout";
import { DELIVERY_FEE_PIASTRES } from "@/lib/constants";
import { piastresToEgp } from "@/lib/money";
import type { OrderConfirmation } from "@/lib/orders";

const getServerSnapshot = () => "[]";

type FormState = {
  recipientName: string;
  recipientPhone: string;
  city: string;
  addressLine: string;
  notes: string;
};

const emptyForm: FormState = {
  recipientName: "",
  recipientPhone: "",
  city: "",
  addressLine: "",
  notes: "",
};

type ApiErrorBody = {
  code: string;
  message: string;
  details: ApiErrorDetail[];
};

function readApiError(body: unknown): ApiErrorBody {
  if (typeof body === "object" && body !== null) {
    const error = (
      body as {
        error?: { code?: unknown; message?: unknown; details?: unknown };
      }
    ).error;

    return {
      code: typeof error?.code === "string" ? error.code : "",
      message:
        typeof error?.message === "string"
          ? error.message
          : "تعذر إنشاء الطلب.",
      details: Array.isArray(error?.details)
        ? (error.details as ApiErrorDetail[])
        : [],
    };
  }

  return {
    code: "",
    message: "تعذر إنشاء الطلب.",
    details: [],
  };
}

const inputClass =
  "w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

export default function CheckoutView() {
  const cartSnapshot = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerSnapshot,
  );
  const items = parseCartSnapshot(cartSnapshot);
  const [refreshToken, setRefreshToken] = useState(0);
  const { validation, priceChanges, error, loading } = useCartValidation(
    cartSnapshot,
    refreshToken,
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<ApiErrorDetail[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<OrderConfirmation | null>(null);

  const idempotencyRef = useRef<{ signature: string; key: string } | null>(
    null,
  );

  const validationById = new Map(
    (validation?.items ?? []).map((item) => [item.productId, item]),
  );
  const canSubmit =
    !!validation && !validation.hasIssues && items.length > 0 && !submitting;

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) =>
      previous.filter((detail) => detail.field !== field),
    );
    setSubmitError("");
  }

  function fieldError(field: string): string | undefined {
    return formErrors.find((detail) => detail.field === field)?.message;
  }

  function getIdempotencyKey(signature: string): string {
    if (!idempotencyRef.current || idempotencyRef.current.signature !== signature) {
      idempotencyRef.current = {
        signature,
        key: crypto.randomUUID(),
      };
    }
    return idempotencyRef.current.key;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const customer = validateCheckoutCustomer(form);
    if (!customer.ok) {
      setFormErrors(customer.details);
      setSubmitError("يرجى تصحيح الحقول المطلوبة.");
      return;
    }

    if (!validation) {
      setSubmitError("انتظر حتى يتم التحقق من السلة ثم حاول مرة أخرى.");
      return;
    }

    if (validation.hasIssues) {
      setSubmitError("عدّل السلة أولًا لأن بعض المنتجات غير متاحة.");
      return;
    }

    setFormErrors([]);
    setSubmitting(true);

    try {
      const response = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          recipientName: customer.value.recipientName,
          recipientPhone: customer.value.recipientPhone,
          city: customer.value.city,
          addressLine: customer.value.addressLine,
          notes: customer.value.notes,
          idempotencyKey: getIdempotencyKey(cartSnapshot),
          expectedTotal: validation.total,
        }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const apiErrorBody = readApiError(body);
        setFormErrors(apiErrorBody.details);
        setSubmitError(apiErrorBody.message);

        if (response.status === 409) {
          setRefreshToken((value) => value + 1);
        }
        return;
      }

      const order = (body as { order?: OrderConfirmation } | null)?.order;
      if (!order) {
        setSubmitError("تم إرسال الطلب لكن تعذر قراءة تأكيد الطلب.");
        return;
      }

      setSuccess(order);
      clearCart();
    } catch {
      setSubmitError("تعذر إرسال الطلب. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-green-900 sm:p-8 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
          <p className="text-sm font-medium">تم إنشاء الطلب بنجاح.</p>
          <h1 className="mt-2 text-2xl font-bold">
            رقم الطلب: <span dir="ltr">{success.orderNumber}</span>
          </h1>
          <p className="mt-2 text-sm">
            الدفع عند الاستلام. سنتواصل معك لتأكيد الطلب.
          </p>

          <div className="mt-6 rounded-2xl bg-white/70 p-4 text-foreground dark:bg-black/20">
            <h2 className="font-bold">تفاصيل الطلب</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {success.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-center justify-between gap-3"
                >
                  <span>
                    {item.productNameSnapshot} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {piastresToEgp(item.lineTotal)} ج.م
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-black/10 pt-3 text-sm dark:border-white/15">
              <div className="flex justify-between gap-3">
                <span>المجموع الفرعي</span>
                <span>{piastresToEgp(success.subtotal)} ج.م</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>رسوم التوصيل</span>
                <span>{piastresToEgp(success.deliveryFee)} ج.م</span>
              </div>
              <div className="flex justify-between gap-3 font-bold">
                <span>الإجمالي</span>
                <span>{piastresToEgp(success.totalAmount)} ج.م</span>
              </div>
            </div>

            <div className="mt-4 border-t border-black/10 pt-3 text-sm dark:border-white/15">
              <p className="font-medium">{success.recipientName}</p>
              <p dir="ltr" className="text-start">
                {success.recipientPhone}
              </p>
              <p>
                {success.shippingAddress.city} —{" "}
                {success.shippingAddress.addressLine}
              </p>
              {success.shippingAddress.notes ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  ملاحظات: {success.shippingAddress.notes}
                </p>
              ) : null}
            </div>
          </div>

          <Link
            href="/products"
            className="mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
          >
            متابعة التسوق
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-black/10 p-8 text-center dark:border-white/15">
          <h1 className="text-2xl font-bold">السلة فارغة</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            أضف منتجات إلى السلة قبل إتمام الطلب.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
          >
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold sm:text-3xl">إتمام الطلب</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        الدفع عند الاستلام. أدخل بيانات التوصيل بالأسفل.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-black/10 p-5 dark:border-white/15"
        >
          <h2 className="text-lg font-bold">بيانات التوصيل</h2>

          <div className="mt-4 space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">الاسم الكامل</span>
              <input
                type="text"
                value={form.recipientName}
                onChange={(event) =>
                  updateField("recipientName", event.target.value)
                }
                autoComplete="name"
                className={inputClass}
              />
              {fieldError("recipientName") ? (
                <span className="block text-xs text-red-600 dark:text-red-400">
                  {fieldError("recipientName")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">رقم الهاتف</span>
              <input
                type="tel"
                inputMode="tel"
                value={form.recipientPhone}
                onChange={(event) =>
                  updateField("recipientPhone", event.target.value)
                }
                autoComplete="tel"
                placeholder="01012345678"
                dir="ltr"
                className={`${inputClass} text-start`}
              />
              {fieldError("recipientPhone") ? (
                <span className="block text-xs text-red-600 dark:text-red-400">
                  {fieldError("recipientPhone")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">المحافظة / المدينة</span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                autoComplete="address-level1"
                className={inputClass}
              />
              {fieldError("city") ? (
                <span className="block text-xs text-red-600 dark:text-red-400">
                  {fieldError("city")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">العنوان بالتفصيل</span>
              <textarea
                value={form.addressLine}
                onChange={(event) =>
                  updateField("addressLine", event.target.value)
                }
                autoComplete="street-address"
                rows={3}
                className={inputClass}
              />
              {fieldError("addressLine") ? (
                <span className="block text-xs text-red-600 dark:text-red-400">
                  {fieldError("addressLine")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">ملاحظات إضافية (اختياري)</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={2}
                className={inputClass}
              />
              {fieldError("notes") ? (
                <span className="block text-xs text-red-600 dark:text-red-400">
                  {fieldError("notes")}
                </span>
              ) : null}
            </label>
          </div>

          {submitError ? (
            <p
              aria-live="polite"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || !!error}
            className="mt-5 w-full rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
          >
            {submitting ? "جارٍ إرسال الطلب..." : "تأكيد الطلب (الدفع عند الاستلام)"}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-black/10 p-5 dark:border-white/15">
          <h2 className="text-lg font-bold">ملخص الطلب</h2>

          <ul className="mt-4 space-y-3 text-sm">
            {items.map((item) => {
              const info = validationById.get(item.productId);

              return (
                <li
                  key={item.productId}
                  className="flex items-center gap-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                    {info?.imageUrl ? (
                      <Image
                        src={info.imageUrl}
                        alt={info.name || "منتج"}
                        width={96}
                        height={96}
                        sizes="48px"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {info?.name || "جارٍ التحقق..."}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      الكمية: {item.quantity}
                    </p>
                  </div>
                  {info ? (
                    <span className="shrink-0 font-medium">
                      {piastresToEgp(info.price * item.quantity)} ج.م
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {priceChanges.length > 0 ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              تغيّرت أسعار بعض المنتجات. تم تحديث الإجمالي بالأسعار الحالية.
            </p>
          ) : null}

          <div className="mt-4 space-y-3 border-t border-black/10 pt-4 text-sm dark:border-white/15">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-600 dark:text-zinc-400">
                المجموع الفرعي
              </span>
              <span className="font-medium">
                {validation
                  ? `${piastresToEgp(validation.subtotal)} ج.م`
                  : "..."}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-600 dark:text-zinc-400">
                رسوم التوصيل
              </span>
              <span className="font-medium">
                {piastresToEgp(
                  validation?.deliveryFee ?? DELIVERY_FEE_PIASTRES,
                )}{" "}
                ج.م
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-base font-bold">
              <span>الإجمالي</span>
              <span>
                {validation ? `${piastresToEgp(validation.total)} ج.م` : "..."}
              </span>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
              جارٍ التحقق من الأسعار والمخزون...
            </p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRefreshToken((value) => value + 1)}
                className="mt-2 font-medium underline"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : null}

          {validation?.hasIssues ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              بعض المنتجات غير متاحة بالكمية المطلوبة. عدّل السلة قبل إتمام
              الطلب.
            </p>
          ) : null}

          <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            الدفع عند الاستلام.
          </p>
        </aside>
      </div>
    </div>
  );
}
