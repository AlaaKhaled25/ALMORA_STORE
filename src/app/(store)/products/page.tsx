import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import Filters from "@/components/store/filters";
import Pagination from "@/components/store/pagination";
import ProductCard from "@/components/store/product-card";
import {
  getStoreCategories,
  getStoreProducts,
  parseStorePage,
  parseStoreSort,
} from "@/lib/store";

export const instant = false;

export const metadata: Metadata = {
  title: "كل المنتجات | متجري",
  description: "تصفح كل منتجات متجري مع البحث والترتيب والتصفية حسب الفئة.",
};

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    category?: string;
    page?: string;
  }>;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  await connection();

  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 100);
  const sort = parseStoreSort(params.sort);
  const category = params.category?.trim() ?? "";
  const page = parseStorePage(params.page);

  const [categories, result] = await Promise.all([
    getStoreCategories(),
    getStoreProducts({
      page,
      search,
      sort,
      categoryId: category || undefined,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">كل المنتجات</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            عدد النتائج: {result.total}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <Filters
          action="/products"
          categories={categories}
          showCategory
          category={category}
          sort={sort}
          search={search}
        />
      </div>

      {search ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          نتائج البحث عن:{" "}
          <span className="font-semibold text-foreground">{search}</span>
        </p>
      ) : null}

      {result.products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-black/10 p-8 text-center dark:border-white/15">
          <p className="font-medium">لا توجد منتجات مطابقة.</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            جرّب كلمة بحث أخرى أو أزل عوامل التصفية.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
          >
            عرض كل المنتجات
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <Pagination
        basePath="/products"
        currentPage={result.page}
        totalPages={result.totalPages}
        query={{ search, sort, category }}
      />
    </div>
  );
}
