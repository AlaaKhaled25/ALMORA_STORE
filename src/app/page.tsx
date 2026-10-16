import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold">متجري</h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        مرحبًا بك في المتجر. صفحات المنتجات والتسوق قادمة قريبًا.
      </p>
      <Link
        href="/admin"
        className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-colors hover:opacity-90"
      >
        لوحة التحكم
      </Link>
    </main>
  );
}
