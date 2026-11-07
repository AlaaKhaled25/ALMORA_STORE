import Link from "next/link";
import { getStoreCategories } from "@/lib/store";

export default async function StoreHeader() {
  const categories = await getStoreCategories();

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-background/90 backdrop-blur dark:border-white/15">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="text-xl font-bold">
            متجري
          </Link>

          <form
            action="/products"
            method="get"
            className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:flex-1"
          >
            <input
              type="search"
              name="q"
              placeholder="ابحث عن منتج..."
              aria-label="بحث عن منتج"
              className="w-full rounded-full border border-black/15 bg-transparent px-4 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              بحث
            </button>
          </form>

          <span
            aria-label="السلة قريبًا"
            title="السلة قريبًا"
            className="order-2 ms-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-zinc-600 sm:order-3 dark:border-white/15 dark:text-zinc-300"
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
          </span>
        </div>

        <nav
          aria-label="فئات المتجر"
          className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm"
        >
          <Link
            href="/products"
            className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            كل المنتجات
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
