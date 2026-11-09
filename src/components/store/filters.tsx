import Link from "next/link";
import type { StoreCategory, StoreSort } from "@/lib/store";

type FiltersProps = {
  action: string;
  categories: StoreCategory[];
  showCategory?: boolean;
  category?: string;
  sort: StoreSort;
  search?: string;
};

const selectClass =
  "h-11 w-full rounded-full border border-brand-line bg-brand-cream/60 px-4 text-sm outline-none transition focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10";

export default function Filters({
  action,
  categories,
  showCategory = false,
  category = "",
  sort,
  search = "",
}: FiltersProps) {
  return (
    <form
      action={action}
      method="get"
      className="rounded-3xl border border-brand-line bg-white p-4 shadow-sm shadow-brand-ink/5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {search ? <input type="hidden" name="q" value={search} /> : null}

        {showCategory ? (
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-brand-ink">الفئة</span>
            <select
              name="category"
              defaultValue={category}
              className={selectClass}
            >
              <option value="">كل الفئات</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-brand-ink">الترتيب</span>
          <select name="sort" defaultValue={sort} className={selectClass}>
            <option value="newest">الأحدث</option>
            <option value="price-asc">السعر: من الأقل للأعلى</option>
            <option value="price-desc">السعر: من الأعلى للأقل</option>
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand-wine px-5 text-sm font-semibold text-white transition hover:bg-brand-wine-dark sm:flex-none"
          >
            تطبيق
          </button>
          <Link
            href={action}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-brand-line px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-wine-soft sm:flex-none"
          >
            إعادة ضبط
          </Link>
        </div>
      </div>
    </form>
  );
}
