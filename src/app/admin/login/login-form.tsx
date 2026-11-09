"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";

function translateAuthError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found"
    ) {
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }
    if (code === "auth/too-many-requests") {
      return "محاولات تسجيل دخول كثيرة. يرجى المحاولة لاحقًا.";
    }
    if (code === "auth/invalid-api-key") {
      return "إعدادات Firebase غير صحيحة. راجع ملف .env.local.";
    }
  }
  return "تعذر تسجيل الدخول. حاول مرة أخرى.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Load Firebase only when the user submits, to keep this page prerenderable.
      const [{ signInWithEmailAndPassword }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase-client"),
      ]);

      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const code = data?.error?.code;
        setError(
          code === "FORBIDDEN"
            ? "هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم."
            : "تعذر إنشاء جلسة الدخول. حاول مرة أخرى.",
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (authError) {
      setError(translateAuthError(authError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <Image
        src="/images/almora-admin.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-wine-dark/95 via-[#120c10]/90 to-black/95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(230,164,189,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(109,31,60,0.4),transparent_40%)]" />

      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <ThemeToggle tone="overlay" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-5 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-7 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-wine/60 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative space-y-2 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-extrabold tracking-[0.18em] text-white shadow-lg shadow-black/20">
            A
          </span>
          <h1 className="text-2xl font-extrabold tracking-[0.16em]">ALMORA</h1>
          <p className="text-sm text-white/65">لوحة إدارة ألمورا</p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-white/80">البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/50 focus:ring-4 focus:ring-white/10"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-white/80">كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/50 focus:ring-4 focus:ring-white/10"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-300/20 bg-red-500/15 px-3 py-2 text-sm text-red-100"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-brand-wine shadow-lg shadow-black/20 transition hover:bg-brand-wine-soft disabled:opacity-60"
        >
          {loading ? "جارٍ تسجيل الدخول..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
