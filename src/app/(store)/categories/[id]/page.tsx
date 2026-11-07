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
    return { title: "الفئة غير موجودة | متجري" };
  }

  return {
    title: `${category.name} | متجري`,
    description:
      category.description || `تسوق ${category.name} من متجري.`,
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          الرئيسية
        </Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="mt-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>
        {category.description ? (
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            {category.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
        <div className="mt-8 rounded-2xl border border-black/10 p-8 text-center dark:border-white/15">
          <p className="font-medium">لا توجد منتجات في هذه الفئة حاليًا.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
          >
            تصفح كل المنتجات
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
        basePath={`/categories/${category.id}`}
        currentPage={result.page}
        totalPages={result.totalPages}
        query={{ sort }}
      />
    </div>
  );
}
