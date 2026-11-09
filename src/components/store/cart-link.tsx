"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useStoreUI } from "@/components/store/store-ui-provider";
import {
  getCartCountSnapshot,
  subscribeCart,
} from "@/lib/cart";

const getServerCount = () => 0;

export default function CartLink({ className = "" }: { className?: string }) {
  const { openCartDrawer } = useStoreUI();
  const count = useSyncExternalStore(
    subscribeCart,
    getCartCountSnapshot,
    getServerCount,
  );
  const previousCountRef = useRef(count);
  const hasMountedRef = useRef(false);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousCountRef.current = count;
      return;
    }

    if (count <= previousCountRef.current) {
      previousCountRef.current = count;
      return;
    }

    previousCountRef.current = count;
    setBump(true);
    const timer = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <button
      type="button"
      onClick={openCartDrawer}
      aria-label={`فتح السلة (${count} قطعة)`}
      title="السلة"
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-line bg-white/80 text-brand-ink transition hover:border-brand-wine/30 hover:bg-brand-wine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-wine ${bump ? "animate-cart-bump" : ""} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
      </svg>

      {count > 0 ? (
        <span className="absolute -top-1 -left-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-wine px-1 text-[11px] font-bold leading-5 text-white shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
