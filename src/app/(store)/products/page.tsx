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
  title: "كل المنتجات",
  description: "تصفح كل المنتجات مع البحث والترتيب والتصفية حسب الفئة.",
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
        <Link href="/" className="hover:text-brand-wine">
          الرئيسية
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-brand-ink">كل المنتجات</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">كل المنتجات</h1>
          <p className="mt-2 text-sm text-brand-muted">
            عدد النتائج: {result.total}
          </p>
        </div>
        <Link
          href="/track"
          className="inline-flex min-h-11 items-center rounded-full border border-brand-line bg-white px-4 text-sm font-semibold text-brand-ink transition hover:border-brand-wine/30 hover:bg-brand-wine-soft"
        >
          تتبع طلبك
        </Link>
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
        <p className="mt-4 text-sm text-brand-muted">
          نتائج البحث عن:{" "}
          <span className="font-semibold text-brand-ink">{search}</span>
        </p>
      ) : null}

      {result.products.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-brand-line bg-white p-10 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-wine-soft text-brand-wine">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <p className="mt-4 font-bold">لا توجد منتجات مطابقة.</p>
          <p className="mt-1 text-sm text-brand-muted">
            جرّب كلمة بحث أخرى أو أزل عوامل التصفية.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-wine px-6 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
          >
            عرض كل المنتجات
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
