"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import AvailabilityBadge from "@/components/store/availability-badge";
import CheckoutSteps from "@/components/store/checkout-steps";
import { useCartValidation } from "@/components/store/use-cart-validation";
import {
  getCartSnapshot,
  parseCartSnapshot,
  removeFromCart,
  setCartQuantity,
  subscribeCart,
} from "@/lib/cart";
import {
  CART_MAX_QUANTITY,
  DELIVERY_FEE_PIASTRES,
} from "@/lib/constants";
import { piastresToEgp } from "@/lib/money";

const getServerSnapshot = () => "[]";

function CartLineSkeleton() {
  return (
    <div className="flex gap-4 rounded-3xl border border-brand-line bg-white p-4">
      <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-brand-sand" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-brand-sand" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-brand-sand" />
        <div className="h-10 w-32 animate-pulse rounded-full bg-brand-sand" />
      </div>
    </div>
  );
}

export default function CartView() {
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

  const validationById = new Map(
    (validation?.items ?? []).map((item) => [item.productId, item]),
  );
  const priceChangeById = new Map(
    priceChanges.map((change) => [change.productId, change]),
  );
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <CheckoutSteps current={1} />

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
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
            سلة التسوق فارغة
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-brand-muted">
            أضف بعض المنتجات إلى السلة ثم عُد إلى هنا لإتمام الطلب.
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

  const canCheckout = !!validation && !validation.hasIssues;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <CheckoutSteps current={1} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">سلة التسوق</h1>
          <p className="mt-1 text-sm text-brand-muted">
            عدد القطع: {cartCount}
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-wine hover:underline"
        >
          متابعة التسوق
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.map((item) => {
            const info = validationById.get(item.productId);
            const priceChange = priceChangeById.get(item.productId);
            const isUnavailable = info
              ? !info.found || !info.canFulfill
              : false;

            if (loading && !info) {
              return <CartLineSkeleton key={item.productId} />;
            }

            return (
              <div
                key={item.productId}
                className="rounded-3xl border border-brand-line bg-white p-4 shadow-sm shadow-brand-ink/5"
              >
                <div className="flex gap-4">
                  <Link
                    href={`/products/${item.productId}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-sand"
                  >
                    {info?.imageUrl ? (
                      <Image
                        src={info.imageUrl}
                        alt={info.name || "منتج"}
                        width={180}
                        height={180}
                        sizes="96px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-brand-muted">
                        لا صورة
                      </span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.productId}`}
                          className="line-clamp-2 font-bold hover:text-brand-wine"
                        >
                          {info?.name || "جارٍ التحقق من المنتج..."}
                        </Link>
                        {info ? (
                          <p className="mt-1 text-sm text-brand-muted">
                            سعر الوحدة: {piastresToEgp(info.price)} ج.م
                          </p>
                        ) : (
                          <div className="mt-2 h-3 w-28 animate-pulse rounded-full bg-brand-sand" />
                        )}
                      </div>

                      {info ? (
                        <AvailabilityBadge availability={info.availability} />
                      ) : null}
                    </div>

                    {info?.message ? (
                      <p className="text-sm text-brand-danger">{info.message}</p>
                    ) : null}

                    {priceChange ? (
                      <p className="rounded-xl bg-brand-warning/10 px-3 py-2 text-xs text-brand-warning">
                        تغيّر سعر هذا المنتج من{" "}
                        {piastresToEgp(priceChange.oldPrice)} ج.م إلى{" "}
                        {piastresToEgp(priceChange.newPrice)} ج.م.
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center rounded-full border border-brand-line bg-brand-cream/60 p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCartQuantity(item.productId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label="تقليل الكمية"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:bg-brand-wine-soft disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCartQuantity(item.productId, item.quantity + 1)
                          }
                          disabled={item.quantity >= CART_MAX_QUANTITY}
                          aria-label="زيادة الكمية"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:bg-brand-wine-soft disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {info ? (
                          <span className="font-extrabold text-brand-wine">
                            {piastresToEgp(info.price * item.quantity)} ج.م
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="min-h-11 rounded-full px-2 text-sm font-medium text-brand-danger hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </div>

                    {isUnavailable ? (
                      <p className="text-xs text-brand-danger">
                        عدّل الكمية أو احذف هذا المنتج للمتابعة.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {error ? (
            <div className="rounded-2xl border border-brand-danger/20 bg-brand-danger/5 p-4 text-sm text-brand-danger">
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
        </div>

        <aside className="h-fit rounded-3xl border border-brand-line bg-white p-5 shadow-sm shadow-brand-ink/5 lg:sticky lg:top-40">
          <h2 className="text-lg font-extrabold">ملخص الطلب</h2>

          <div className="mt-4 space-y-3 text-sm">
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
            <div className="flex items-center justify-between gap-3 border-t border-brand-line pt-3 text-base">
              <span className="font-bold">الإجمالي</span>
              <span className="font-extrabold text-brand-wine">
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

          {validation?.hasIssues ? (
            <p className="mt-4 rounded-xl bg-brand-warning/10 p-3 text-xs leading-6 text-brand-warning">
              بعض المنتجات غير متاحة بالكمية المطلوبة. عدّل السلة قبل إتمام
              الطلب.
            </p>
          ) : null}

          {canCheckout ? (
            <Link
              href="/checkout"
              className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-brand-wine px-5 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
            >
              إتمام الطلب
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 min-h-12 w-full rounded-full bg-brand-sand px-5 text-sm font-semibold text-brand-muted"
            >
              {loading ? "جارٍ التحقق..." : "إتمام الطلب"}
            </button>
          )}

          <p className="mt-3 text-center text-xs text-brand-muted">
            الدفع عند الاستلام · رسوم التوصيل واضحة قبل التأكيد.
          </p>
        </aside>
      </div>
    </div>
  );
}
