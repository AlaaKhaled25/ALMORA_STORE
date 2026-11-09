import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import RegisterServiceWorker from "@/components/pwa/register-service-worker";
import { BRAND, BRAND_CSS_VARIABLES } from "@/lib/brand";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.wine,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
      style={BRAND_CSS_VARIABLES as CSSProperties}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
