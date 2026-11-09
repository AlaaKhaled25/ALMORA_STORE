import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import LogoutButton from "@/components/logout-button";
import ThemeToggle from "@/components/theme-toggle";
import { BRAND } from "@/lib/brand";
import { getAdminSession } from "@/lib/session";

// This layout reads the session cookie, so it must not be prerendered.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin data is always private and must be rendered per request.
  await connection();

  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="ambient-orb absolute -right-24 top-[-6rem] h-80 w-80 rounded-full bg-brand-wine/20" />
        <div className="ambient-orb absolute -left-24 bottom-[-6rem] h-80 w-80 rounded-full bg-brand-sand" />
      </div>
      <header className="glass-panel mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl px-4 py-3">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-extrabold tracking-[0.16em] text-brand-wine"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-wine text-xs text-white shadow-sm shadow-brand-wine/20">
              A
            </span>
            {BRAND.name}
          </Link>
          <span className="hidden h-5 w-px bg-brand-line sm:block" aria-hidden="true" />
          <Link href="/admin" className="hover:text-brand-accent">
            لوحة التحكم
          </Link>
          <Link href="/admin/categories" className="hover:text-brand-accent">
            الفئات
          </Link>
          <Link href="/admin/products" className="hover:text-brand-accent">
            المنتجات
          </Link>
          <Link href="/admin/orders" className="hover:text-brand-accent">
            الطلبات
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
