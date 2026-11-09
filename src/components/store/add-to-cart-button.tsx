"use client";

import { useEffect, useRef, useState } from "react";
import { useStoreUI } from "@/components/store/store-ui-provider";
import { addToCart, rememberCartPrice } from "@/lib/cart";

type AddToCartButtonProps = {
  productId: string;
  price: number;
  quantity?: number;
  disabled?: boolean;
  variant?: "full" | "small";
};

export default function AddToCartButton({
  productId,
  price,
  quantity = 1,
  disabled = false,
  variant = "full",
}: AddToCartButtonProps) {
  const { openCartDrawer, showToast } = useStoreUI();
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    const result = addToCart(productId, quantity);

    if (!result.ok) {
      setStatus("error");
      setMessage(result.message);
      return;
    }

    rememberCartPrice(productId, price);
    setStatus("added");
    setMessage("");
    showToast("تمت إضافة المنتج إلى السلة.");
    openCartDrawer();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 1500);
  }

  const label = disabled
    ? "غير متوفر"
    : status === "added"
      ? variant === "small"
        ? "تمت الإضافة"
        : "تمت الإضافة إلى السلة"
      : variant === "small"
        ? "أضف للسلة"
        : "أضف إلى السلة";

  const buttonClass =
    variant === "small"
      ? "min-h-11 w-full rounded-full bg-brand-wine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-wine-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-brand-sand disabled:text-brand-muted"
      : "min-h-12 w-full rounded-full bg-brand-wine px-6 py-3 font-semibold text-white shadow-sm shadow-brand-wine/20 transition hover:bg-brand-wine-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-brand-sand disabled:text-brand-muted disabled:shadow-none";

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={buttonClass}
      >
        {label}
      </button>

      <div aria-live="polite">
        {status === "error" && message ? (
          <p className="mt-1 text-xs text-brand-danger">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
