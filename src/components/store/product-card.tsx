import Image from "next/image";
import Link from "next/link";
import AvailabilityBadge from "@/components/store/availability-badge";
import { piastresToEgp } from "@/lib/money";
import type { StoreProduct } from "@/lib/store";

export default function ProductCard({ product }: { product: StoreProduct }) {
  const mainImage = product.images[0];
  const isOutOfStock = product.availability === "غير متوفر";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/60 transition hover:shadow-md dark:border-white/15 dark:bg-white/5"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={product.name}
            width={600}
            height={600}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            لا صورة
          </div>
        )}

        {isOutOfStock ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs text-white">
            غير متوفر
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-bold">
            {piastresToEgp(product.price)} ج.م
          </span>
          <AvailabilityBadge availability={product.availability} />
        </div>
      </div>
    </Link>
  );
}
