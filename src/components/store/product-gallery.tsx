"use client";

import Image from "next/image";
import { useState } from "react";

type ProductGalleryProps = {
  name: string;
  images: { url: string }[];
};

export default function ProductGallery({ name, images }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex] ?? images[0];

  return (
    <div>
      <div className="group relative aspect-square overflow-hidden rounded-[2rem] border border-brand-line bg-brand-sand">
        {selected ? (
          <Image
            src={selected.url}
            alt={name}
            width={1000}
            height={1000}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand-muted">
            لا صورة
          </div>
        )}

        {images.length > 1 ? (
          <span className="pointer-events-none absolute bottom-4 left-4 hidden rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-brand-ink shadow-sm backdrop-blur lg:inline-flex">
            مرّر المؤشر للتكبير
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          aria-label="صور المنتج"
        >
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`عرض صورة ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-brand-sand transition ${
                selectedIndex === index
                  ? "border-brand-wine"
                  : "border-transparent hover:border-brand-wine/30"
              }`}
            >
              <Image
                src={image.url}
                alt={`${name} - صورة ${index + 1}`}
                width={160}
                height={160}
                sizes="80px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
