"use client";

import { useState } from "react";
import AddToCartButton from "@/components/store/add-to-cart-button";
import { CART_MAX_QUANTITY } from "@/lib/constants";
import { piastresToEgp } from "@/lib/money";
import type { StoreAvailability } from "@/lib/store";

type ProductPurchaseProps = {
  productId: string;
  price: number;
  availability: StoreAvailability;
};

export default function ProductPurchase({
  productId,
  price,
  availability,
}: ProductPurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const disabled = availability === "غير متوفر";

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">الكمية</span>
          <div className="flex items-center rounded-full border border-brand-line bg-brand-surface p-1">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1 || disabled}
              aria-label="تقليل الكمية"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:bg-brand-wine-soft disabled:opacity-40"
            >
              -
            </button>
            <span
              className="w-10 text-center text-sm font-bold"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) => Math.min(CART_MAX_QUANTITY, value + 1))
              }
              disabled={quantity >= CART_MAX_QUANTITY || disabled}
              aria-label="زيادة الكمية"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:bg-brand-wine-soft disabled:opacity-40"
            >
              +
            </button>
          </div>
          <span className="text-xs text-brand-muted">
            حتى {CART_MAX_QUANTITY} قطع
          </span>
        </div>

        <AddToCartButton
          productId={productId}
          price={price}
          quantity={quantity}
          disabled={disabled}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-line bg-brand-surface/95 p-3 pb-safe shadow-[0_-8px_30px_rgba(38,26,31,0.08)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[11px] text-brand-muted">السعر</p>
            <p className="text-base font-extrabold text-brand-wine">
              {piastresToEgp(price)}{" "}
              <span className="text-[11px] font-semibold">ج.م</span>
            </p>
          </div>
          <div className="flex-1">
            <AddToCartButton
              productId={productId}
              price={price}
              quantity={quantity}
              disabled={disabled}
              variant="small"
            />
          </div>
        </div>
      </div>
    </>
  );
}
