"use client";

import { useEffect, useState } from "react";
import {
  parseCartSnapshot,
  readCartPrices,
  writeCartPrices,
} from "@/lib/cart";
import type { StoreCartValidation } from "@/lib/store";

export type CartPriceChange = {
  productId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
};

type State =
  | {
      key: string;
      data: StoreCartValidation;
      priceChanges: CartPriceChange[];
    }
  | {
      key: string;
      error: string;
    };

function readErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string") return error.message;
  }
  return "تعذر التحقق من السلة.";
}

export function useCartValidation(cartSnapshot: string, refreshToken = 0) {
  const key = `${refreshToken}:${cartSnapshot}`;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const items = parseCartSnapshot(cartSnapshot);
    if (items.length === 0) return;

    let cancelled = false;

    fetch("/api/store/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(readErrorMessage(body));
        return body as StoreCartValidation;
      })
      .then((data) => {
        if (cancelled) return;

        const oldPrices = readCartPrices();
        const nextPrices: Record<string, number> = {};
        const priceChanges: CartPriceChange[] = [];

        for (const item of data.items) {
          if (!item.found) continue;

          nextPrices[item.productId] = item.price;
          const oldPrice = oldPrices[item.productId];

          if (typeof oldPrice === "number" && oldPrice !== item.price) {
            priceChanges.push({
              productId: item.productId,
              name: item.name,
              oldPrice,
              newPrice: item.price,
            });
          }
        }

        writeCartPrices(nextPrices);
        setState({ key, data, priceChanges });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          key,
          error:
            error instanceof Error ? error.message : "تعذر التحقق من السلة.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [cartSnapshot, key]);

  const current = state?.key === key ? state : null;

  return {
    validation:
      current && "data" in current ? current.data : null,
    priceChanges:
      current && "data" in current ? current.priceChanges : [],
    error: current && "error" in current ? current.error : null,
    loading: current === null,
  };
}
