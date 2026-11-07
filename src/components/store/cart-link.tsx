"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getCartCountSnapshot,
  subscribeCart,
} from "@/lib/cart";

const getServerCount = () => 0;

export default function CartLink({ className = "" }: { className?: string }) {
  const count = useSyncExternalStore(
    subscribeCart,
    getCartCountSnapshot,
    getServerCount,
  );

  return (
    <Link
      href="/cart"
      aria-label={`السلة (${count})`}
      title="السلة"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-zinc-600 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10 ${className}`}
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
        <span className="absolute -top-1 -left-1 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-bold leading-5 text-background">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
