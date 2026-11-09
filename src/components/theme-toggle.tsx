"use client";

function toggleTheme() {
  const root = document.documentElement;
  const next = !root.classList.contains("dark");

  root.classList.toggle("dark", next);
  root.style.colorScheme = next ? "dark" : "light";

  try {
    localStorage.setItem("almora-theme", next ? "dark" : "light");
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

const toneStyles = {
  default:
    "border-brand-line bg-brand-surface/80 text-brand-ink shadow-sm shadow-brand-ink/5 hover:border-brand-wine/30 hover:bg-brand-wine-soft",
  overlay: "border-white/20 bg-white/10 text-white hover:bg-white/20",
} as const;

export default function ThemeToggle({
  className = "",
  tone = "default",
}: {
  className?: string;
  tone?: keyof typeof toneStyles;
}) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="تبديل الوضع الليلي"
      title="تبديل الوضع الليلي"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border backdrop-blur transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-wine ${toneStyles[tone]} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 dark:hidden"
        aria-hidden="true"
      >
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden h-5 w-5 dark:block"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
