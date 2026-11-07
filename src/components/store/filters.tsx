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
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

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
      className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 sm:flex-row sm:items-end dark:border-white/15"
    >
      {search ? <input type="hidden" name="q" value={search} /> : null}

      {showCategory ? (
        <label className="block space-y-1 text-sm sm:w-56">
          <span className="font-medium">الفئة</span>
          <select name="category" defaultValue={category} className={selectClass}>
            <option value="">كل الفئات</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block space-y-1 text-sm sm:w-56">
        <span className="font-medium">الترتيب</span>
        <select name="sort" defaultValue={sort} className={selectClass}>
          <option value="newest">الأحدث</option>
          <option value="price-asc">السعر: من الأقل للأعلى</option>
          <option value="price-desc">السعر: من الأعلى للأقل</option>
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          تطبيق
        </button>
        <Link
          href={action}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          إعادة ضبط
        </Link>
      </div>
    </form>
  );
}
