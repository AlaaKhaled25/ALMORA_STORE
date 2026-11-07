"use client";

import { useEffect, useRef, useState } from "react";
import { addToCart, rememberCartPrice } from "@/lib/cart";

type AddToCartButtonProps = {
  productId: string;
  price: number;
  disabled?: boolean;
  variant?: "full" | "small";
};

export default function AddToCartButton({
  productId,
  price,
  disabled = false,
  variant = "full",
}: AddToCartButtonProps) {
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    const result = addToCart(productId, 1);

    if (!result.ok) {
      setStatus("error");
      setMessage(result.message);
      return;
    }

    rememberCartPrice(productId, price);
    setStatus("added");
    setMessage("");

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
        ? "أضف"
        : "أضف إلى السلة";

  const buttonClass =
    variant === "small"
      ? "w-full rounded-full bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
      : "w-full rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400";

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
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {message}
          </p>
        ) : null}
        {variant === "full" && status === "added" ? (
          <p className="mt-2 text-center text-xs text-green-700 dark:text-green-400">
            تمت الإضافة إلى السلة.
          </p>
        ) : null}
      </div>
    </div>
  );
}
