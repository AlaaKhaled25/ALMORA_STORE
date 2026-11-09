import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import ProductCard from "@/components/store/product-card";
import { BRAND, DELIVERY_FEE_LABEL } from "@/lib/brand";
import { piastresToEgp } from "@/lib/money";
import { getStoreCategories, getStoreProducts } from "@/lib/store";

export const instant = false;

export const metadata: Metadata = {
  title: BRAND.tagline,
  description: BRAND.description,
};

const trustItems = [
  {
    title: "الدفع عند الاستلام",
    description: "ادفع بعد وصول طلبك.",
    icon: "cash",
  },
  {
    title: "تتبع طلبك بسهولة",
    description: "تابع حالة الطلب برقم الطلب ورقم الهاتف.",
    icon: "route",
  },
  {
    title: "رسوم توصيل واضحة",
    description: `رسوم التوصيل ${DELIVERY_FEE_LABEL}.`,
    icon: "truck",
  },
] as const;

function TrustIcon({ icon }: { icon: (typeof trustItems)[number]["icon"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {icon === "cash" ? (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7 9h.01M17 15h.01" />
        </>
      ) : null}
      {icon === "route" ? (
        <>
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="6" r="2" />
          <path d="M8 18h5a4 4 0 0 0 0-8H9a3 3 0 0 1 0-6h5" />
        </>
      ) : null}
      {icon === "truck" ? (
        <>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17" cy="18" r="1.5" />
        </>
      ) : null}
    </svg>
  );
}

function CategoryGlyph({ index }: { index: number }) {
  const variant = index % 3;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {variant === 0 ? (
        <>
          <path d="M6 8h12l1 12H5L6 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </>
      ) : null}
      {variant === 1 ? (
        <>
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
          <path d="m18 16 .8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z" />
        </>
      ) : null}
      {variant === 2 ? (
        <>
          <path d="M4 7h16v13H4z" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M4 12h16" />
        </>
      ) : null}
    </svg>
  );
}

export default async function StoreHomePage() {
  await connection();

  const [categories, latest] = await Promise.all([
    getStoreCategories(),
    getStoreProducts({ sort: "newest" }),
  ]);
  const products = latest.products.slice(0, 8);
  const heroProduct = products[0];
  const heroImage = heroProduct?.images[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-brand-wine text-white shadow-2xl shadow-brand-wine/20 sm:rounded-[2.5rem]">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-1/3 h-80 w-80 rounded-full bg-brand-wine-dark/80 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {BRAND.name} · {BRAND.nameArabic}
            </p>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.25] sm:text-5xl lg:text-6xl">
              تفاصيل مختارة
              <span className="mt-2 block text-brand-wine-soft">
                تليق بك.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-8 text-white/80 sm:text-base">
              اكتشف منتجات مختارة بعناية، بأسعار واضحة بالجنيه المصري، ودفع
              عند الاستلام. تجربة شراء بسيطة من أول نظرة حتى باب البيت.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-bold text-brand-wine transition hover:bg-brand-wine-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                تسوق الآن
              </Link>
              <Link
                href="/track"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                تتبع طلبك
              </Link>
            </div>

            <p className="mt-5 text-xs font-medium text-white/70">
              الدفع عند الاستلام · رسوم التوصيل {DELIVERY_FEE_LABEL}
            </p>
          </div>

          {heroProduct ? (
            <div className="relative mx-auto w-full max-w-sm lg:ms-auto">
              <div
                className="absolute -inset-4 rounded-[2.5rem] bg-white/10 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative rounded-[2rem] border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-brand-wine-dark">
                  {heroImage ? (
                    <Image
                      src={heroImage.url}
                      alt={heroProduct.name}
                      width={720}
                      height={900}
                      priority
                      sizes="(max-width: 1024px) 90vw, 360px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-6xl font-extrabold tracking-[0.2em] text-white/30">
                      A
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/95 p-4 text-brand-ink shadow-xl shadow-brand-ink/20">
                  <p className="text-[11px] font-semibold text-brand-muted">
                    من أحدث المنتجات
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm font-bold">
                    {heroProduct.name}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-brand-wine">
                    {piastresToEgp(heroProduct.price)}{" "}
                    <span className="text-xs">ج.م</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section
        aria-label="مزايا الشراء"
        className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3"
      >
        {trustItems.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-2xl border border-brand-line bg-white/80 p-4"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-wine-soft text-brand-wine">
              <TrustIcon icon={item.icon} />
            </span>
            <div>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-brand-muted">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10 sm:mt-14">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-wine">
              تسوق حسب الفئة
            </p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">الفئات</h2>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-wine hover:underline"
          >
            كل المنتجات
          </Link>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-3xl border border-brand-line bg-white p-6 text-center text-sm text-brand-muted">
            لا توجد فئات متاحة حاليًا.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="group flex min-h-32 flex-col justify-between rounded-3xl border border-brand-line bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-wine/20 hover:shadow-lg hover:shadow-brand-ink/5"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-wine-soft text-brand-wine transition group-hover:bg-brand-wine group-hover:text-white">
                  <CategoryGlyph index={index} />
                </span>
                <div className="mt-5">
                  <h3 className="font-bold">{category.name}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-brand-muted">
                    {category.description || "تصفح المنتجات"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 sm:mt-14">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-wine">
              وصل حديثًا
            </p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              أحدث المنتجات
            </h2>
          </div>
          <Link
            href="/products?sort=newest"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-wine hover:underline"
          >
            عرض الكل
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-brand-line bg-white p-10 text-center">
            <p className="font-bold">لا توجد منتجات متاحة حاليًا.</p>
            <p className="mt-2 text-sm text-brand-muted">
              تابعنا قريبًا، نضيف منتجات جديدة باستمرار.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
