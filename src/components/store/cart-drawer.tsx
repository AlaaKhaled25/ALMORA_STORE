"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import AvailabilityBadge from "@/components/store/availability-badge";
import { useCartValidation } from "@/components/store/use-cart-validation";
import { DELIVERY_FEE_LABEL } from "@/lib/brand";
import {
  getCartSnapshot,
  parseCartSnapshot,
  removeFromCart,
  setCartQuantity,
  subscribeCart,
} from "@/lib/cart";
import { CART_MAX_QUANTITY } from "@/lib/constants";
import { piastresToEgp } from "@/lib/money";

const getServerSnapshot = () => "[]";

function DrawerSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex gap-3">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-brand-sand" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-brand-sand" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-brand-sand" />
            <div className="h-8 w-24 animate-pulse rounded-full bg-brand-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cartSnapshot = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerSnapshot,
  );
  const items = parseCartSnapshot(cartSnapshot);
  const { validation, error, loading } = useCartValidation(cartSnapshot);

  const validationById = new Map(
    (validation?.items ?? []).map((item) => [item.productId, item]),
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const canCheckout = !!validation && !validation.hasIssues && items.length > 0;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="إغلاق السلة"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 h-full w-full cursor-default bg-brand-ink/45 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="animate-drawer-in absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-brand-surface shadow-2xl shadow-brand-ink/25"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-line px-4 py-3">
          <div>
            <h2 id="cart-drawer-title" className="text-lg font-bold">
              سلة التسوق
            </h2>
            <p className="text-xs text-brand-muted">
              {itemCount > 0 ? `${itemCount} قطعة في السلة` : "السلة فارغة"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق السلة"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-muted transition hover:bg-brand-sand hover:text-brand-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-wine-soft text-brand-wine">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                  <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
              </span>
              <div>
                <p className="font-bold">سلة التسوق فارغة</p>
                <p className="mt-1 text-sm text-brand-muted">
                  اكتشف منتجاتنا المختارة وابدأ التسوق.
                </p>
              </div>
              <Link
                href="/products"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-wine px-6 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
              >
                تصفح المنتجات
              </Link>
            </div>
          ) : loading ? (
            <DrawerSkeleton />
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const info = validationById.get(item.productId);

                return (
                  <li
                    key={item.productId}
                    className="rounded-2xl border border-brand-line bg-white p-3"
                  >
                    <div className="flex gap-3">
                      <Link
                        href={`/products/${item.productId}`}
                        onClick={onClose}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-sand"
                      >
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
                          <span className="flex h-full items-center justify-center text-xs text-brand-muted">
                            لا صورة
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.productId}`}
                            onClick={onClose}
                            className="line-clamp-2 text-sm font-semibold hover:text-brand-wine"
                          >
                            {info?.name || "جارٍ التحقق..."}
                          </Link>
                          {info ? (
                            <AvailabilityBadge availability={info.availability} />
                          ) : null}
                        </div>

                        {info ? (
                          <p className="mt-1 text-sm font-bold text-brand-wine">
                            {piastresToEgp(info.price * item.quantity)} ج.م
                          </p>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCartQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                )
                              }
                              disabled={item.quantity <= 1}
                              aria-label="تقليل الكمية"
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-line text-lg disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCartQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                )
                              }
                              disabled={item.quantity >= CART_MAX_QUANTITY}
                              aria-label="زيادة الكمية"
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-line text-lg disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="min-h-11 rounded-full px-2 text-xs font-medium text-brand-danger hover:underline"
                          >
                            حذف
                          </button>
                        </div>

                        {info?.message ? (
                          <p className="mt-2 text-xs text-brand-danger">
                            {info.message}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {error ? (
            <p className="mt-4 rounded-xl bg-brand-danger/10 p-3 text-xs text-brand-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-brand-line bg-brand-cream/70 px-4 py-4 pb-safe">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-brand-muted">المجموع الفرعي</span>
              <span className="font-semibold">
                {validation ? `${piastresToEgp(validation.subtotal)} ج.م` : "..."}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-brand-muted">رسوم التوصيل</span>
              <span className="font-semibold">
                {validation
                  ? `${piastresToEgp(validation.deliveryFee)} ج.م`
                  : DELIVERY_FEE_LABEL}
              </span>
            </div>
          </div>

          {validation?.hasIssues ? (
            <p className="mt-3 rounded-xl bg-brand-warning/10 p-3 text-xs text-brand-warning">
              بعض المنتجات غير متاحة بالكمية المطلوبة. عدّل السلة للمتابعة.
            </p>
          ) : null}

          {canCheckout ? (
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-brand-wine px-5 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
            >
              إتمام الطلب
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 min-h-11 w-full rounded-full bg-brand-sand px-5 text-sm font-semibold text-brand-muted"
            >
              إتمام الطلب
            </button>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-brand-muted">
            <span>الدفع عند الاستلام</span>
            <Link
              href="/cart"
              onClick={onClose}
              className="font-semibold text-brand-wine hover:underline"
            >
              عرض السلة
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
