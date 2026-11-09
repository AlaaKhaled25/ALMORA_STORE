import Link from "next/link";
import { BRAND, DELIVERY_FEE_LABEL, whatsappUrl } from "@/lib/brand";

export default function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-brand-line bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-wine text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M5 19 12 5l7 14" />
                <path d="M8.5 14h7" />
              </svg>
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-[0.18em] text-brand-wine">
                {BRAND.name}
              </p>
              <p className="text-xs text-brand-muted">{BRAND.nameArabic}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-brand-muted">
            {BRAND.description}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold">روابط سريعة</h2>
          <nav className="mt-3 flex flex-col gap-1 text-sm text-brand-muted">
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center hover:text-brand-wine"
            >
              كل المنتجات
            </Link>
            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center hover:text-brand-wine"
            >
              سلة التسوق
            </Link>
            <Link
              href="/track"
              className="inline-flex min-h-11 items-center hover:text-brand-wine"
            >
              تتبع طلبك
            </Link>
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold">الدفع والتوصيل</h2>
          <div className="mt-3 space-y-2 text-sm text-brand-muted">
            <p>الدفع عند الاستلام.</p>
            <p>رسوم التوصيل: {DELIVERY_FEE_LABEL}.</p>
            <a
              href={whatsappUrl(`مرحبًا ${BRAND.name}، لدي سؤال.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-wine hover:underline"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1 0 12.04 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12.04 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5 0-.2 0-.3-.1-.5-.1-.2-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.2-.2-.2-.5-.4Z" />
              </svg>
              اسألنا على واتساب
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-center text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-start">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. جميع الحقوق محفوظة.
          </p>
          <p>الأسعار بالجنيه المصري.</p>
        </div>
      </div>
    </footer>
  );
}
