import type { Metadata } from "next";
import { connection } from "next/server";
import CartView from "./cart-view";

export const instant = false;

export const metadata: Metadata = {
  title: "سلة التسوق",
  description: "راجع منتجات سلة التسوق وتأكد من الأسعار قبل إتمام الطلب.",
};

export default async function CartPage() {
  await connection();
  return <CartView />;
}
