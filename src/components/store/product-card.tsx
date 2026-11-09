import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/store/add-to-cart-button";
import AvailabilityBadge from "@/components/store/availability-badge";
import { piastresToEgp } from "@/lib/money";
import type { StoreProduct } from "@/lib/store";

export default function ProductCard({ product }: { product: StoreProduct }) {
  const mainImage = product.images[0];
  const isOutOfStock = product.availability === "غير متوفر";

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-brand-line bg-brand-surface transition duration-300 hover:-translate-y-1 hover:border-brand-wine/20 hover:shadow-xl hover:shadow-brand-ink/10">
      <Link
        href={`/product/${product.id}`}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-wine"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-brand-sand">
          {mainImage ? (
            <Image
              src={mainImage.url}
              alt={product.name}
              width={700}
              height={875}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-brand-muted">
              لا صورة
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/25 to-transparent p-3">
            <AvailabilityBadge availability={product.availability} />
          </div>

          {isOutOfStock ? (
            <span className="absolute inset-x-0 bottom-0 bg-brand-ink/80 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">
              غير متوفر
            </span>
          ) : null}
        </div>

        <div className="p-4 pb-2">
          <p className="text-[11px] font-semibold text-brand-muted">
            {product.categoryName}
          </p>
          <h3 className="mt-1 line-clamp-2 min-h-14 text-base font-bold leading-7 transition-colors group-hover:text-brand-accent">
            {product.name}
          </h3>
          <p className="mt-3 text-lg font-extrabold text-brand-wine">
            {piastresToEgp(product.price)}{" "}
            <span className="text-xs font-semibold">ج.م</span>
          </p>
        </div>
      </Link>

      <div className="px-4 pb-4 pt-2">
        <AddToCartButton
          productId={product.id}
          price={product.price}
          disabled={isOutOfStock}
          variant="small"
        />
      </div>
    </article>
  );
}
