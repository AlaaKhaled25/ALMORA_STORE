import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import AvailabilityBadge from "@/components/store/availability-badge";
import ProductGallery from "@/components/store/product-gallery";
import ProductPurchase from "@/components/store/product-purchase";
import WhatsAppButton from "@/components/store/whatsapp-button";
import { BRAND, DELIVERY_FEE_LABEL } from "@/lib/brand";
import { piastresToEgp } from "@/lib/money";
import { getStoreProductById } from "@/lib/store";

export const instant = false;

const getProduct = cache(getStoreProductById);

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  await connection();

  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: "المنتج غير موجود" };
  }

  return {
    title: product.name,
    description:
      product.description ||
      `اشترِ ${product.name} بسعر ${piastresToEgp(product.price)} ج.م مع الدفع عند الاستلام.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  await connection();

  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10 lg:pb-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
        <Link href="/" className="hover:text-brand-accent">
          الرئيسية
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/collections/${product.categoryId}`}
          className="hover:text-brand-accent"
        >
          {product.categoryName}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="line-clamp-1 text-brand-ink">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <ProductGallery name={product.name} images={product.images} />

        <div className="space-y-5">
          <div>
            <Link
              href={`/collections/${product.categoryId}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-wine hover:underline"
            >
              {product.categoryName}
            </Link>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-extrabold text-brand-wine">
                {piastresToEgp(product.price)}{" "}
                <span className="text-sm font-semibold">ج.م</span>
              </span>
              <AvailabilityBadge availability={product.availability} />
            </div>
          </div>

          <div className="premium-surface rounded-3xl p-4 sm:p-5">
            <ProductPurchase
              productId={product.id}
              price={product.price}
              availability={product.availability}
            />
          </div>

          <div className="rounded-3xl bg-brand-wine-soft p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-wine">
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
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                  <path d="M7 9h.01M17 15h.01" />
                </svg>
              </span>
              <div>
                <h2 className="font-bold">الدفع عند الاستلام</h2>
                <p className="mt-1 text-sm leading-7 text-brand-muted">
                  ادفع نقدًا عند وصول طلبك. رسوم التوصيل {DELIVERY_FEE_LABEL}.
                  ويمكنك تتبع الطلب بسهولة برقم الطلب ورقم الهاتف.
                </p>
              </div>
            </div>
          </div>

          <WhatsAppButton
            className="w-full"
            message={`مرحبًا ${BRAND.name}، أريد الاستفسار عن ${product.name}.`}
          />

          <div>
            <h2 className="text-lg font-bold">تفاصيل المنتج</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-8 text-brand-muted">
              {product.description || "لا يوجد وصف لهذا المنتج."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
