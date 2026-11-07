import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import ProductCard from "@/components/store/product-card";
import { getStoreCategories, getStoreProducts } from "@/lib/store";

export const instant = false;

export const metadata: Metadata = {
  title: "متجري — تسوق أونلاين مع الدفع عند الاستلام",
  description:
    "تصفح أحدث المنتجات والفئات في متجري، بأسعار بالجنيه المصري والدفع عند الاستلام.",
};

export default async function StoreHomePage() {
  // Render on demand so admin changes appear immediately.
  await connection();

  const [categories, latest] = await Promise.all([
    getStoreCategories(),
    getStoreProducts({ sort: "newest" }),
  ]);
  const products = latest.products.slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="rounded-3xl border border-black/10 bg-gradient-to-l from-black/[0.03] to-transparent p-6 sm:p-10 dark:border-white/15 dark:from-white/[0.06]">
        <h1 className="text-3xl font-bold sm:text-4xl">
          مرحبًا بك في متجري
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          تسوق أحدث المنتجات بأسعار بالجنيه المصري، مع الدفع عند الاستلام.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          تسوق الآن
        </Link>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">الفئات</h2>
          <Link
            href="/products"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            كل المنتجات
          </Link>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-2xl border border-black/10 p-6 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
            لا توجد فئات متاحة حاليًا.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="rounded-2xl border border-black/10 px-4 py-5 text-center font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">أحدث المنتجات</h2>
          <Link
            href="/products?sort=newest"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            عرض الكل
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="rounded-2xl border border-black/10 p-6 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
            لا توجد منتجات متاحة حاليًا. تابعنا قريبًا.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
