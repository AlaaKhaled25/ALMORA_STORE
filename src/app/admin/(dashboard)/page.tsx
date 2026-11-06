import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { getAdminSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getAdminSession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">لوحة التحكم</h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        تم تسجيل الدخول بنجاح. إدارة المنتجات والطلبات قادمة قريبًا.
      </p>
      {session?.email ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          مسجل الدخول باسم: {session.email}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-black/10 px-6 py-3 font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          العودة إلى المتجر
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
