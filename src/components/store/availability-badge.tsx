import type { StoreAvailability } from "@/lib/store";

const styles: Record<StoreAvailability, string> = {
  "متوفر":
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  "كمية محدودة":
    "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  "غير متوفر":
    "bg-zinc-100 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-500/10 dark:text-zinc-300 dark:ring-zinc-400/20",
};

const dotStyles: Record<StoreAvailability, string> = {
  "متوفر": "bg-emerald-500",
  "كمية محدودة": "bg-amber-500",
  "غير متوفر": "bg-zinc-400",
};

export default function AvailabilityBadge({
  availability,
  className = "",
}: {
  availability: StoreAvailability;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[availability]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotStyles[availability]}`}
        aria-hidden="true"
      />
      {availability}
    </span>
  );
}
