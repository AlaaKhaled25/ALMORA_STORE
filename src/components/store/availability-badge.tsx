import type { StoreAvailability } from "@/lib/store";

const styles: Record<StoreAvailability, string> = {
  "متوفر":
    "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  "كمية محدودة":
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "غير متوفر":
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function AvailabilityBadge({
  availability,
}: {
  availability: StoreAvailability;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[availability]}`}
    >
      {availability}
    </span>
  );
}
