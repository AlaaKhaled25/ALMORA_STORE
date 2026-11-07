import Link from "next/link";

type PaginationProps = {
  basePath: string;
  currentPage: number;
  totalPages: number;
  query?: {
    search?: string;
    sort?: string;
    category?: string;
  };
};

export default function Pagination({
  basePath,
  currentPage,
  totalPages,
  query,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    if (query?.search) params.set("q", query.search);
    if (query?.sort && query.sort !== "newest") {
      params.set("sort", query.sort);
    }
    if (query?.category) params.set("category", query.category);
    if (page > 1) params.set("page", String(page));

    const suffix = params.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  }

  return (
    <nav
      aria-label="التنقل بين الصفحات"
      className="mt-8 flex items-center justify-center gap-3 text-sm"
    >
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage - 1)}
          className="rounded-full border border-black/10 px-4 py-2 font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          السابق
        </Link>
      ) : (
        <span className="rounded-full border border-black/5 px-4 py-2 text-zinc-400 dark:border-white/10">
          السابق
        </span>
      )}

      <span className="text-zinc-600 dark:text-zinc-400">
        صفحة {currentPage} من {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={hrefFor(currentPage + 1)}
          className="rounded-full border border-black/10 px-4 py-2 font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          التالي
        </Link>
      ) : (
        <span className="rounded-full border border-black/5 px-4 py-2 text-zinc-400 dark:border-white/10">
          التالي
        </span>
      )}
    </nav>
  );
}
