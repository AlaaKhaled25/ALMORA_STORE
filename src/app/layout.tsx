import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import RegisterServiceWorker from "@/components/pwa/register-service-worker";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "متجري",
  description: "متجر إلكتروني بسيط — الدفع عند الاستلام",
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
