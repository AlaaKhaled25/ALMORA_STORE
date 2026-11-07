"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import AvailabilityBadge from "@/components/store/availability-badge";
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
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-black/10 p-8 text-center dark:border-white/15">
          <h1 className="text-2xl font-bold">سلة التسوق فارغة</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            أضف بعض المنتجات إلى السلة ثم عُد إلى هنا.
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

  const canCheckout = !!validation && !validation.hasIssues;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">سلة التسوق</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            عدد القطع: {cartCount}
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          متابعة التسوق
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {items.map((item) => {
            const info = validationById.get(item.productId);
            const priceChange = priceChangeById.get(item.productId);
            const isUnavailable = info
              ? !info.found || !info.canFulfill
              : false;

            return (
              <div
                key={item.productId}
                className="rounded-2xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                    {info?.imageUrl ? (
                      <Image
                        src={info.imageUrl}
                        alt={info.name || "منتج"}
                        width={160}
                        height={160}
                        sizes="80px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                        لا صورة
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold">
                          {info?.name || "جارٍ التحقق من المنتج..."}
                        </h2>
                        {info ? (
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            سعر الوحدة: {piastresToEgp(info.price)} ج.م
                          </p>
                        ) : null}
                      </div>

                      {info ? (
                        <AvailabilityBadge availability={info.availability} />
                      ) : null}
                    </div>

                    {info?.message ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {info.message}
                      </p>
                    ) : null}

                    {priceChange ? (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        تغيّر سعر هذا المنتج من{" "}
                        {piastresToEgp(priceChange.oldPrice)} ج.م إلى{" "}
                        {piastresToEgp(priceChange.newPrice)} ج.م.
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCartQuantity(item.productId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label="تقليل الكمية"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/15 text-lg leading-none disabled:opacity-40 dark:border-white/20"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCartQuantity(item.productId, item.quantity + 1)
                          }
                          disabled={item.quantity >= CART_MAX_QUANTITY}
                          aria-label="زيادة الكمية"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/15 text-lg leading-none disabled:opacity-40 dark:border-white/20"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {info ? (
                          <span className="font-bold">
                            {piastresToEgp(info.price * item.quantity)} ج.م
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-sm text-red-600 hover:underline dark:text-red-400"
                        >
                          حذف
                        </button>
                      </div>
                    </div>

                    {isUnavailable ? (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        عدّل الكمية أو احذف هذا المنتج للمتابعة.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
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
        </div>

        <aside className="h-fit rounded-2xl border border-black/10 p-5 dark:border-white/15">
          <h2 className="text-lg font-bold">ملخص الطلب</h2>

          <div className="mt-4 space-y-3 text-sm">
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
            <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-base dark:border-white/15">
              <span className="font-bold">الإجمالي</span>
              <span className="font-bold">
                {validation ? `${piastresToEgp(validation.total)} ج.م` : "..."}
              </span>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
              جارٍ التحقق من الأسعار والمخزون...
            </p>
          ) : null}

          {validation?.hasIssues ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              بعض المنتجات غير متاحة بالكمية المطلوبة. عدّل السلة قبل إتمام
              الطلب.
            </p>
          ) : null}

          {canCheckout ? (
            <Link
              href="/checkout"
              className="mt-5 block rounded-full bg-foreground px-5 py-3 text-center text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              إتمام الطلب
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-full bg-zinc-200 px-5 py-3 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              إتمام الطلب
            </button>
          )}

          <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
            الدفع عند الاستلام.
          </p>
        </aside>
      </div>
    </div>
  );
}
