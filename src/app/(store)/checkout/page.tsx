import type { Metadata } from "next";
import { connection } from "next/server";
import CheckoutView from "./checkout-view";

export const instant = false;

export const metadata: Metadata = {
  title: "إتمام الطلب | متجري",
  description: "أدخل بيانات التوصيل ثم أكّد الطلب مع الدفع عند الاستلام.",
};

export default async function CheckoutPage() {
  await connection();
  return <CheckoutView />;
}
