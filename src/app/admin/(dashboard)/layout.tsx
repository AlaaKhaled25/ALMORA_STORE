import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { getAdminSession } from "@/lib/session";

// This layout reads the session cookie, so it must not be prerendered.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/15">
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/admin" className="hover:underline">
            لوحة التحكم
          </Link>
          <Link href="/admin/categories" className="hover:underline">
            الفئات
          </Link>
        </nav>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
