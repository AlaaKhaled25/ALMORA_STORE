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
      <div className="relative flex min-h-screen flex-col bg-brand-cream text-brand-ink">
        <div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="ambient-orb absolute -right-24 top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-brand-wine/30" />
          <div className="ambient-orb absolute -left-32 top-1/3 h-[22rem] w-[22rem] rounded-full bg-brand-wine-soft" />
          <div className="ambient-orb absolute bottom-[-10rem] right-1/3 h-[24rem] w-[24rem] rounded-full bg-brand-sand" />
          <div className="premium-grid absolute inset-0 opacity-40" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <StoreHeader />
          <main className="flex-1">{children}</main>
          <StoreFooter />
        </div>
      </div>
    </StoreUIProvider>
  );
}
