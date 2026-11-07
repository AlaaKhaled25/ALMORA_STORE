import Link from "next/link";

export default function StoreFooter() {
  return (
    <footer className="mt-12 border-t border-black/10 dark:border-white/15">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-center text-sm text-zinc-600 sm:px-6 dark:text-zinc-400">
        <p className="text-base font-bold text-foreground">متجري</p>
        <p>تسوق أونلاين بسهولة — الدفع عند الاستلام.</p>
        <nav className="flex justify-center gap-4">
          <Link href="/" className="hover:underline">
            الرئيسية
          </Link>
          <Link href="/products" className="hover:underline">
            كل المنتجات
          </Link>
          <Link href="/track" className="hover:underline">
            تتبع طلبك
          </Link>
        </nav>
      </div>
    </footer>
  );
}
