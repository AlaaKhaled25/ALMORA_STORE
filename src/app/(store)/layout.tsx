import type { ReactNode } from "react";
import { connection } from "next/server";
import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";

// Storefront must always reflect the latest admin changes.
export const instant = false;

export default async function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Render on demand so admin changes appear immediately (no stale cache).
  await connection();

  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  );
}
