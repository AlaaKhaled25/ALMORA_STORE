"use client";

import { useEffect, useRef, useState } from "react";
import { useStoreUI } from "@/components/store/store-ui-provider";

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function CopyOrderButton({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const { showToast } = useStoreUI();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    let ok = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderNumber);
        ok = true;
      } else {
        ok = fallbackCopy(orderNumber);
      }
    } catch {
      ok = fallbackCopy(orderNumber);
    }

    if (!ok) {
      showToast("تعذر نسخ رقم الطلب. يمكنك تحديده ونسخه يدويًا.", "error");
      return;
    }

    setCopied(true);
    showToast("تم نسخ رقم الطلب.");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-line bg-white px-5 text-sm font-semibold text-brand-ink transition hover:border-brand-wine/30 hover:bg-brand-wine-soft"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        {copied ? (
          <path d="m5 12 4 4L19 6" />
        ) : (
          <>
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </>
        )}
      </svg>
      {copied ? "تم النسخ" : "نسخ رقم الطلب"}
    </button>
  );
}
