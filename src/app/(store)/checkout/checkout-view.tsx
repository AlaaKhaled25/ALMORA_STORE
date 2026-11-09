"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import CheckoutSteps from "@/components/store/checkout-steps";
import CopyOrderButton from "@/components/store/copy-order-button";
import { useCartValidation } from "@/components/store/use-cart-validation";
import type { ApiErrorDetail } from "@/lib/api-errors";
import { DELIVERY_FEE_LABEL } from "@/lib/brand";
import {
  clearCart,
  getCartSnapshot,
  parseCartSnapshot,
  subscribeCart,
} from "@/lib/cart";
import { validateCheckoutCustomer } from "@/lib/checkout";
import { DELIVERY_FEE_PIASTRES } from "@/lib/constants";
import { saveLastOrderNumber } from "@/lib/last-order";
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
  "h-12 w-full rounded-2xl border border-brand-line bg-brand-cream/50 px-4 text-sm outline-none transition placeholder:text-brand-muted/60 focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10";
const textareaClass =
  "w-full rounded-2xl border border-brand-line bg-brand-cream/50 px-4 py-3 text-sm outline-none transition placeholder:text-brand-muted/60 focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10";
const errorInputClass = "border-brand-danger focus:border-brand-danger";

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
    if (
      !idempotencyRef.current ||
      idempotencyRef.current.signature !== signature
    ) {
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
      saveLastOrderNumber(order.orderNumber);
      clearCart();
    } catch {
      setSubmitError("تعذر إرسال الطلب. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <CheckoutSteps current={3} />

        <div className="mt-5 overflow-hidden rounded-[2rem] border border-brand-success/20 bg-white shadow-xl shadow-brand-success/5">
          <div className="bg-gradient-to-b from-brand-success/10 to-transparent p-6 text-center sm:p-8">
            <span className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-success text-white shadow-lg shadow-brand-success/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-9 w-9"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </span>
            <p className="mt-5 text-sm font-semibold text-brand-success">
              تم إنشاء الطلب بنجاح
            </p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              شكرًا لك، وصلنا طلبك.
            </h1>
            <p className="mt-2 text-sm leading-7 text-brand-muted">
              سنتواصل معك لتأكيد الطلب. الدفع عند الاستلام.
            </p>
          </div>

          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="rounded-2xl border border-brand-line bg-brand-cream/70 p-4 text-center">
              <p className="text-xs font-semibold text-brand-muted">رقم الطلب</p>
              <p
                dir="ltr"
                className="mt-1 text-2xl font-extrabold tracking-wide text-brand-wine"
              >
                {success.orderNumber}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <CopyOrderButton orderNumber={success.orderNumber} />
              <Link
                href="/track"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-wine px-6 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
              >
                تتبع طلبك
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-brand-line p-4 sm:p-5">
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
                    <span className="font-semibold">
                      {piastresToEgp(item.lineTotal)} ج.م
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-2 border-t border-brand-line pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-brand-muted">المجموع الفرعي</span>
                  <span>{piastresToEgp(success.subtotal)} ج.م</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-brand-muted">رسوم التوصيل</span>
                  <span>{piastresToEgp(success.deliveryFee)} ج.م</span>
                </div>
                <div className="flex justify-between gap-3 text-base font-bold">
                  <span>الإجمالي</span>
                  <span className="text-brand-wine">
                    {piastresToEgp(success.totalAmount)} ج.م
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-brand-line pt-3 text-sm">
                <p className="font-semibold">{success.recipientName}</p>
                <p dir="ltr" className="text-start text-brand-muted">
                  {success.recipientPhone}
                </p>
                <p className="text-brand-muted">
                  {success.shippingAddress.city} —{" "}
                  {success.shippingAddress.addressLine}
                </p>
                {success.shippingAddress.notes ? (
                  <p className="text-brand-muted">
                    ملاحظات: {success.shippingAddress.notes}
                  </p>
                ) : null}
              </div>
            </div>

            <Link
              href="/products"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-wine hover:underline"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <CheckoutSteps current={2} />

        <div className="mt-5 rounded-[2rem] border border-brand-line bg-white p-8 text-center sm:p-12">
          <span className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-wine-soft text-brand-wine">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-9 w-9"
              aria-hidden="true"
            >
              <path d="M6 8h12l1 12H5L6 8Z" />
              <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
            السلة فارغة
          </h1>
          <p className="mt-2 text-sm leading-7 text-brand-muted">
            أضف منتجات إلى السلة قبل إتمام الطلب.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-wine px-7 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
          >
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <CheckoutSteps current={2} />

      <div className="mt-5">
        <h1 className="text-3xl font-extrabold sm:text-4xl">إتمام الطلب</h1>
        <p className="mt-1 text-sm text-brand-muted">
          أدخل بيانات التوصيل بالأسفل. الدفع عند الاستلام.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5 sm:p-6"
        >
          <h2 className="text-lg font-extrabold">بيانات التوصيل</h2>

          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold">
                الاسم الكامل <span className="text-brand-danger">*</span>
              </span>
              <input
                type="text"
                value={form.recipientName}
                onChange={(event) =>
                  updateField("recipientName", event.target.value)
                }
                autoComplete="name"
                aria-invalid={!!fieldError("recipientName")}
                aria-describedby={
                  fieldError("recipientName") ? "recipientName-error" : undefined
                }
                className={`${inputClass} ${
                  fieldError("recipientName") ? errorInputClass : ""
                }`}
              />
              {fieldError("recipientName") ? (
                <span
                  id="recipientName-error"
                  className="block text-xs text-brand-danger"
                >
                  {fieldError("recipientName")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold">
                رقم الهاتف <span className="text-brand-danger">*</span>
              </span>
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
                aria-invalid={!!fieldError("recipientPhone")}
                aria-describedby={
                  fieldError("recipientPhone")
                    ? "recipientPhone-error"
                    : undefined
                }
                className={`${inputClass} text-start ${
                  fieldError("recipientPhone") ? errorInputClass : ""
                }`}
              />
              {fieldError("recipientPhone") ? (
                <span
                  id="recipientPhone-error"
                  className="block text-xs text-brand-danger"
                >
                  {fieldError("recipientPhone")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold">
                المحافظة / المدينة <span className="text-brand-danger">*</span>
              </span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                autoComplete="address-level1"
                aria-invalid={!!fieldError("city")}
                aria-describedby={
                  fieldError("city") ? "city-error" : undefined
                }
                className={`${inputClass} ${
                  fieldError("city") ? errorInputClass : ""
                }`}
              />
              {fieldError("city") ? (
                <span id="city-error" className="block text-xs text-brand-danger">
                  {fieldError("city")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold">
                العنوان بالتفصيل <span className="text-brand-danger">*</span>
              </span>
              <textarea
                value={form.addressLine}
                onChange={(event) =>
                  updateField("addressLine", event.target.value)
                }
                autoComplete="street-address"
                rows={3}
                aria-invalid={!!fieldError("addressLine")}
                aria-describedby={
                  fieldError("addressLine") ? "addressLine-error" : undefined
                }
                className={`${textareaClass} ${
                  fieldError("addressLine") ? errorInputClass : ""
                }`}
              />
              {fieldError("addressLine") ? (
                <span
                  id="addressLine-error"
                  className="block text-xs text-brand-danger"
                >
                  {fieldError("addressLine")}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold">ملاحظات إضافية (اختياري)</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={2}
                aria-invalid={!!fieldError("notes")}
                aria-describedby={
                  fieldError("notes") ? "notes-error" : undefined
                }
                className={`${textareaClass} ${
                  fieldError("notes") ? errorInputClass : ""
                }`}
              />
              {fieldError("notes") ? (
                <span
                  id="notes-error"
                  className="block text-xs text-brand-danger"
                >
                  {fieldError("notes")}
                </span>
              ) : null}
            </label>
          </div>

          {submitError ? (
            <p
              aria-live="polite"
              className="mt-4 rounded-xl bg-brand-danger/5 p-3 text-sm text-brand-danger"
            >
              {submitError}
            </p>
          ) : null}

          <div className="mt-5 rounded-2xl bg-brand-wine-soft p-4 text-sm leading-7 text-brand-muted">
            <span className="font-bold text-brand-ink">الدفع عند الاستلام.</span>{" "}
            لن تدفع الآن. رسوم التوصيل {DELIVERY_FEE_LABEL} وتظهر في ملخص الطلب.
          </div>

          <button
            type="submit"
            disabled={!canSubmit || !!error}
            className="mt-5 min-h-12 w-full rounded-full bg-brand-wine px-6 font-semibold text-white transition hover:bg-brand-wine-dark disabled:cursor-not-allowed disabled:bg-brand-sand disabled:text-brand-muted"
          >
            {submitting ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"}
          </button>
        </form>

        <aside className="h-fit rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5 lg:sticky lg:top-40">
          <h2 className="text-lg font-extrabold">ملخص الطلب</h2>

          <ul className="mt-4 space-y-3 text-sm">
            {items.map((item) => {
              const info = validationById.get(item.productId);

              return (
                <li key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-brand-sand">
                    {info?.imageUrl ? (
                      <Image
                        src={info.imageUrl}
                        alt={info.name || "منتج"}
                        width={96}
                        height={96}
                        sizes="48px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-brand-muted">
                        لا صورة
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {info?.name || "جارٍ التحقق..."}
                    </p>
                    <p className="text-xs text-brand-muted">
                      الكمية: {item.quantity}
                    </p>
                  </div>
                  {info ? (
                    <span className="shrink-0 font-semibold">
                      {piastresToEgp(info.price * item.quantity)} ج.م
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {priceChanges.length > 0 ? (
            <p className="mt-4 rounded-xl bg-brand-warning/10 p-3 text-xs leading-6 text-brand-warning">
              تغيّرت أسعار بعض المنتجات. تم تحديث الإجمالي بالأسعار الحالية.
            </p>
          ) : null}

          <div className="mt-4 space-y-3 border-t border-brand-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-brand-muted">المجموع الفرعي</span>
              <span className="font-semibold">
                {validation ? (
                  `${piastresToEgp(validation.subtotal)} ج.م`
                ) : (
                  <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-brand-sand" />
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-brand-muted">رسوم التوصيل</span>
              <span className="font-semibold">
                {piastresToEgp(
                  validation?.deliveryFee ?? DELIVERY_FEE_PIASTRES,
                )}{" "}
                ج.م
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-base font-bold">
              <span>الإجمالي</span>
              <span className="text-brand-wine">
                {validation ? (
                  `${piastresToEgp(validation.total)} ج.م`
                ) : (
                  <span className="inline-block h-5 w-20 animate-pulse rounded-full bg-brand-sand" />
                )}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2" aria-hidden="true">
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-brand-sand" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-brand-sand" />
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl bg-brand-danger/5 p-3 text-xs text-brand-danger">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRefreshToken((value) => value + 1)}
                className="mt-2 font-semibold underline"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : null}

          {validation?.hasIssues ? (
            <p className="mt-4 rounded-xl bg-brand-warning/10 p-3 text-xs leading-6 text-brand-warning">
              بعض المنتجات غير متاحة بالكمية المطلوبة. عدّل السلة قبل إتمام
              الطلب.
            </p>
          ) : null}

          <p className="mt-4 text-center text-xs text-brand-muted">
            الدفع عند الاستلام · {DELIVERY_FEE_LABEL} رسوم توصيل.
          </p>
        </aside>
      </div>
    </div>
  );
}
