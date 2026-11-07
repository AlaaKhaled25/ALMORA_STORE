import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        قد يكون المنتج غير متاح أو تم حذفه، أو أن الرابط غير صحيح.
      </p>
      <Link
        href="/"
        className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        العودة للرئيسية
      </Link>
    </main>
  );
}
