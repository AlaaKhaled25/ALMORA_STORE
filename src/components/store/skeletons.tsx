function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-line bg-white">
      <div className="aspect-[4/5] animate-pulse bg-brand-sand" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-brand-sand" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-brand-sand" />
        <div className="h-5 w-1/2 animate-pulse rounded-full bg-brand-sand" />
        <div className="h-11 w-full animate-pulse rounded-full bg-brand-sand" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="جارٍ تحميل المنتجات"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
    >
      <span className="sr-only">جارٍ تحميل المنتجات...</span>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function StorePageSkeleton() {
  return (
    <div
      role="status"
      aria-label="جارٍ تحميل الصفحة"
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
    >
      <span className="sr-only">جارٍ تحميل الصفحة...</span>
      <div className="h-[420px] animate-pulse rounded-[2rem] bg-brand-sand sm:rounded-[2.5rem]" />

      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-2xl border border-brand-line bg-white"
          />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-3xl border border-brand-line bg-white"
          />
        ))}
      </div>

      <div className="mt-10">
        <div className="mb-5 h-8 w-48 animate-pulse rounded-full bg-brand-sand" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="جارٍ تحميل المنتج"
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
    >
      <span className="sr-only">جارٍ تحميل المنتج...</span>
      <div className="h-4 w-56 animate-pulse rounded-full bg-brand-sand" />

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <div className="aspect-square animate-pulse rounded-[2rem] border border-brand-line bg-brand-sand" />
          <div className="mt-3 flex gap-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 w-20 animate-pulse rounded-2xl bg-brand-sand"
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-brand-sand" />
          <div className="h-10 w-4/5 animate-pulse rounded-full bg-brand-sand" />
          <div className="h-8 w-40 animate-pulse rounded-full bg-brand-sand" />
          <div className="h-40 animate-pulse rounded-3xl border border-brand-line bg-white" />
          <div className="h-28 animate-pulse rounded-3xl bg-brand-sand" />
          <div className="h-11 w-full animate-pulse rounded-full bg-brand-sand" />
        </div>
      </div>
    </div>
  );
}
