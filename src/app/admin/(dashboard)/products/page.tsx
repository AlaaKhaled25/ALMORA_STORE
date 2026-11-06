import type { Metadata } from "next";
import ProductsManager from "./products-manager";

export const metadata: Metadata = {
  title: "المنتجات — متجري",
};

export default function ProductsPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          إدارة المنتجات والأسعار والمخزون. الأسعار تُدخل بالجنيه المصري.
        </p>
      </div>
      <ProductsManager />
    </main>
  );
}
