"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CartDrawer from "@/components/store/cart-drawer";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type StoreUIContextValue = {
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
};

const StoreUIContext = createContext<StoreUIContextValue | null>(null);

export function useStoreUI(): StoreUIContextValue {
  const value = useContext(StoreUIContext);
  if (!value) {
    throw new Error("useStoreUI must be used inside StoreUIProvider.");
  }
  return value;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const toastStyles: Record<ToastTone, string> = {
  success: "border-brand-success/25 bg-brand-surface text-brand-ink",
  error: "border-brand-danger/25 bg-brand-surface text-brand-ink",
  info: "border-brand-wine/20 bg-brand-surface text-brand-ink",
};

const toastDotStyles: Record<ToastTone, string> = {
  success: "bg-brand-success",
  error: "bg-brand-danger",
  info: "bg-brand-wine",
};

export default function StoreUIProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = makeId();
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      const timer = setTimeout(() => dismissToast(id), 3200);
      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const openCartDrawer = useCallback(() => setCartOpen(true), []);
  const closeCartDrawer = useCallback(() => setCartOpen(false), []);

  const value = useMemo<StoreUIContextValue>(
    () => ({
      openCartDrawer,
      closeCartDrawer,
      showToast,
    }),
    [closeCartDrawer, openCartDrawer, showToast],
  );

  return (
    <StoreUIContext.Provider value={value}>
      {children}

      <CartDrawer open={cartOpen} onClose={closeCartDrawer} />

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl shadow-brand-ink/10 ${toastStyles[toast.tone]}`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${toastDotStyles[toast.tone]}`}
              aria-hidden="true"
            />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="إغلاق التنبيه"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-muted transition hover:bg-brand-sand hover:text-brand-ink"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </StoreUIContext.Provider>
  );
}
