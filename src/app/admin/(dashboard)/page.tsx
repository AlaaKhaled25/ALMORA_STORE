import Link from "next/link";
import { getAdminSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getAdminSession();

  return (
    <main className="space-y-5">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        إدارة المنتجات والطلبات قادمة قريبًا.
      </p>
      {session?.email ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          مسجل الدخول باسم: {session.email}
        </p>
      ) : null}
      <Link
        href="/admin/categories"
        className="inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        إدارة الفئات
      </Link>
    </main>
  );
}
