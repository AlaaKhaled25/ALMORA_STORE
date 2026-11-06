"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-black/10 p-8 shadow-sm dark:border-white/15"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">تسجيل دخول الإدارة</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ادخل ببيانات حساب المسؤول
          </p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/20"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/20"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "جارٍ تسجيل الدخول..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
