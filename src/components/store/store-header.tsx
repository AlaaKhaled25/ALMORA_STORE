import Link from "next/link";
import CartLink from "@/components/store/cart-link";
import { BRAND } from "@/lib/brand";
import { getStoreCategories } from "@/lib/store";

export default async function StoreHeader() {
  const categories = await getStoreCategories();

  return (
    <header className="sticky top-0 z-30 border-b border-brand-line/80 bg-brand-cream/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-wine"
            aria-label={`${BRAND.name} — الصفحة الرئيسية`}
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-wine text-white shadow-sm shadow-brand-wine/20 transition group-hover:bg-brand-wine-dark">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M5 19 12 5l7 14" />
                <path d="M8.5 14h7" />
                <circle cx="12" cy="20" r="0.8" fill="currentColor" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-[0.18em] text-brand-wine">
                {BRAND.name}
              </span>
              <span className="mt-1 text-[11px] font-medium text-brand-muted">
                {BRAND.nameArabic} · {BRAND.tagline}
              </span>
            </span>
          </Link>

          <form
            action="/products"
            method="get"
            role="search"
            className="hidden flex-1 items-center gap-2 sm:flex"
          >
            <div className="relative flex-1">
              <span
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="h-5 w-5"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                type="search"
                name="q"
                placeholder="ابحث عن منتج..."
                aria-label="بحث عن منتج"
                className="h-11 w-full rounded-full border border-brand-line bg-white/80 py-2 pe-11 ps-4 text-sm outline-none transition placeholder:text-brand-muted/70 focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand-wine px-5 text-sm font-semibold text-white transition hover:bg-brand-wine-dark"
            >
              بحث
            </button>
          </form>

          <CartLink className="ms-auto sm:ms-0" />
        </div>

        <form
          action="/products"
          method="get"
          role="search"
          className="flex items-center gap-2 pb-3 sm:hidden"
        >
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              placeholder="ابحث عن منتج..."
              aria-label="بحث عن منتج"
              className="h-11 w-full rounded-full border border-brand-line bg-white/80 py-2 pe-11 ps-4 text-sm outline-none transition placeholder:text-brand-muted/70 focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10"
            />
          </div>
          <button
            type="submit"
            aria-label="بحث"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-wine text-white transition hover:bg-brand-wine-dark"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </form>

        <nav
          aria-label="فئات المتجر"
          className="flex gap-2 overflow-x-auto pb-3 text-sm [scrollbar-width:none]"
        >
          <Link
            href="/products"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-brand-wine px-4 font-semibold text-white transition hover:bg-brand-wine-dark"
          >
            كل المنتجات
          </Link>
          <Link
            href="/track"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-brand-line bg-white/70 px-4 font-medium text-brand-ink transition hover:border-brand-wine/30 hover:bg-brand-wine-soft"
          >
            تتبع طلبك
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-brand-line bg-white/70 px-4 font-medium text-brand-ink transition hover:border-brand-wine/30 hover:bg-brand-wine-soft"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
