import { DELIVERY_FEE_PIASTRES } from "@/lib/constants";
import { piastresToEgp } from "@/lib/money";

// Store identity and visual tokens live here.
// Change the name, colors, or WhatsApp number in this one file.
export const BRAND = {
  name: "ALMORA",
  nameArabic: "ألمورا",
  tagline: "قطع مختارة بعناية",
  description:
    "تسوق منتجات مختارة بعناية بأسعار واضحة، مع الدفع عند الاستلام وتتبع سهل للطلب.",
  colors: {
    wine: "#6d1f3c",
    wineDark: "#4b1329",
    wineSoft: "#f6eaf0",
    cream: "#fbf8f5",
    sand: "#f2ebe5",
    surface: "#ffffff",
    ink: "#261a1f",
    muted: "#74666c",
    line: "#e8ddd7",
    success: "#1d7a5c",
    warning: "#9a5b13",
    danger: "#b4233b",
  },
  whatsappNumber:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "+201088346667",
  deliveryFee: DELIVERY_FEE_PIASTRES,
} as const;

export const BRAND_CSS_VARIABLES = {
  "--brand-wine": BRAND.colors.wine,
  "--brand-wine-dark": BRAND.colors.wineDark,
  "--brand-wine-soft": BRAND.colors.wineSoft,
  "--brand-cream": BRAND.colors.cream,
  "--brand-sand": BRAND.colors.sand,
  "--brand-surface": BRAND.colors.surface,
  "--brand-ink": BRAND.colors.ink,
  "--brand-muted": BRAND.colors.muted,
  "--brand-line": BRAND.colors.line,
  "--brand-success": BRAND.colors.success,
  "--brand-warning": BRAND.colors.warning,
  "--brand-danger": BRAND.colors.danger,
} as const;

export const DELIVERY_FEE_LABEL = `${piastresToEgp(BRAND.deliveryFee)} ج.م`;

export function whatsappUrl(message?: string): string {
  const digits = BRAND.whatsappNumber.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
