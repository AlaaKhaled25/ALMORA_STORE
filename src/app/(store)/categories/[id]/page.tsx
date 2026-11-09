import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Filters from "@/components/store/filters";
import Pagination from "@/components/store/pagination";
import ProductCard from "@/components/store/product-card";
import {
  getStoreCategoryById,
  getStoreProducts,
  parseStorePage,
  parseStoreSort,
} from "@/lib/store";

export const instant = false;

const getCategory = cache(getStoreCategoryById);

type CategoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  await connection();

  const { id } = await params;
  const category = await getCategory(id);

  if (!category) {
    return { title: "الفئة غير موجودة" };
  }

  return {
    title: category.name,
    description: category.description || `تسوق ${category.name} من متجرنا.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  await connection();

  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  const query = await searchParams;
  const sort = parseStoreSort(query.sort);
  const page = parseStorePage(query.page);
  const result = await getStoreProducts({
    page,
    sort,
    categoryId: id,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
        <Link href="/" className="hover:text-brand-wine">
          الرئيسية
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="hover:text-brand-wine">
          كل المنتجات
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-brand-ink">{category.name}</span>
      </nav>

      <div className="mt-4">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
        {category.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-brand-muted">
            {category.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-brand-muted">
          عدد النتائج: {result.total}
        </p>
      </div>

      <div className="mt-5">
        <Filters
          action={`/categories/${category.id}`}
          categories={[]}
          sort={sort}
        />
      </div>

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
              <path d="M4 7h16v13H4z" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </span>
          <p className="mt-4 font-bold">
            لا توجد منتجات في هذه الفئة حاليًا.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-wine px-6 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
          >
            تصفح كل المنتجات
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
        basePath={`/categories/${category.id}`}
        currentPage={result.page}
        totalPages={result.totalPages}
        query={{ sort }}
      />
    </div>
  );
}
