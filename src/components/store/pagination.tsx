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
      className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
    >
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage - 1)}
          className="inline-flex min-h-11 items-center rounded-full border border-brand-line bg-brand-surface px-5 font-semibold transition hover:border-brand-wine/30 hover:bg-brand-wine-soft"
        >
          السابق
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-full border border-brand-line/60 px-5 text-brand-muted/50">
          السابق
        </span>
      )}

      <span className="rounded-full bg-brand-wine-soft px-4 py-2 text-xs font-semibold text-brand-wine">
        صفحة {currentPage} من {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={hrefFor(currentPage + 1)}
          className="inline-flex min-h-11 items-center rounded-full border border-brand-line bg-brand-surface px-5 font-semibold transition hover:border-brand-wine/30 hover:bg-brand-wine-soft"
        >
          التالي
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-full border border-brand-line/60 px-5 text-brand-muted/50">
          التالي
        </span>
      )}
    </nav>
  );
}
