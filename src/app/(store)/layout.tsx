import type { ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import StoreUIProvider from "@/components/store/store-ui-provider";
import { BRAND } from "@/lib/brand";

// Storefront must always reflect the latest admin changes.
export const instant = false;

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default async function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Render on demand so admin changes appear immediately (no stale cache).
  await connection();

  return (
    <StoreUIProvider>
      <div className="flex min-h-screen flex-col bg-brand-cream text-brand-ink">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </div>
    </StoreUIProvider>
  );
}
