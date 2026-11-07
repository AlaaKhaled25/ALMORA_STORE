import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import AddToCartButton from "@/components/store/add-to-cart-button";
import AvailabilityBadge from "@/components/store/availability-badge";
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
    return { title: "المنتج غير موجود | متجري" };
  }

  return {
    title: `${product.name} | متجري`,
    description:
      product.description ||
      `اشترِ ${product.name} من متجري بسعر ${piastresToEgp(product.price)} ج.م.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  await connection();

  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [mainImage, ...gallery] = product.images;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          الرئيسية
        </Link>
        <span>/</span>
        <Link
          href={`/categories/${product.categoryId}`}
          className="hover:underline"
        >
          {product.categoryName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-black/10 bg-zinc-100 dark:border-white/15 dark:bg-zinc-900">
            {mainImage ? (
              <Image
                src={mainImage.url}
                alt={product.name}
                width={900}
                height={900}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                لا صورة
              </div>
            )}
          </div>

          {gallery.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {gallery.map((image, index) => (
                <div
                  key={image.url}
                  className="relative aspect-square overflow-hidden rounded-xl border border-black/10 bg-zinc-100 dark:border-white/15 dark:bg-zinc-900"
                >
                  <Image
                    src={image.url}
                    alt={`${product.name} - صورة ${index + 2}`}
                    width={200}
                    height={200}
                    sizes="20vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {product.categoryName}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {product.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold">
              {piastresToEgp(product.price)} ج.م
            </span>
            <AvailabilityBadge availability={product.availability} />
          </div>

          <p className="whitespace-pre-line leading-8 text-zinc-700 dark:text-zinc-300">
            {product.description || "لا يوجد وصف لهذا المنتج."}
          </p>

          <AddToCartButton
            productId={product.id}
            price={product.price}
            disabled={product.availability === "غير متوفر"}
          />

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            الدفع عند الاستلام.
          </p>
        </div>
      </div>
    </div>
  );
}
