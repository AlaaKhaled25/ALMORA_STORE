"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { CategoryView } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

// Read the message from our standard error format.
async function readErrorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  const details = data?.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map((detail: { message?: string }) => detail.message)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }

  return data?.error?.message ?? "حدث خطأ غير متوقع.";
}

// Thrown when the API says the admin session is missing or expired.
class UnauthorizedError extends Error {}

// Pure data fetch: no React state here, so it is safe to start from an effect.
async function fetchCategories(): Promise<CategoryView[]> {
  const response = await fetch("/api/admin/categories", { cache: "no-store" });

  if (response.status === 401) {
    throw new UnauthorizedError("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = await response.json();
  return data.categories ?? [];
}

export default function CategoriesManager() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const list = await fetchCategories();
      setCategories(list);
      setListError(null);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        router.replace("/admin/login");
        return;
      }
      setListError(
        error instanceof Error ? error.message : "تعذر تحميل الفئات.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    // setState happens inside promise callbacks, after the request starts.
    fetchCategories()
      .then((list) => {
        if (cancelled) return;
        setCategories(list);
        setListError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof UnauthorizedError) {
          router.replace("/admin/login");
          return;
        }
        setListError(
          error instanceof Error ? error.message : "تعذر تحميل الفئات.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
    setFormError(null);
  }

  function startEdit(category: CategoryView) {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Quick client hint. The server does the real validation.
    if (name.trim() === "") {
      setFormError("اسم الفئة مطلوب.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/categories/${editingId}`
          : "/api/admin/categories",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        },
      );

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setSuccessMessage(
        editingId ? "تم تحديث الفئة بنجاح." : "تمت إضافة الفئة بنجاح.",
      );
      resetForm();
      await loadCategories();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "تعذر حفظ الفئة.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(category: CategoryView) {
    const nextStatus = category.status === "active" ? "inactive" : "active";
    const question =
      nextStatus === "inactive"
        ? `هل تريد إيقاف الفئة "${category.name}"؟`
        : `هل تريد تفعيل الفئة "${category.name}"؟`;

    if (!window.confirm(question)) return;

    setStatusChangingId(category.id);
    setListError(null);

    try {
      const response = await fetch(
        `/api/admin/categories/${category.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadCategories();
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "تعذر تغيير حالة الفئة.",
      );
    } finally {
      setStatusChangingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? "تعديل فئة" : "إضافة فئة"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">اسم الفئة</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              placeholder="مثال: ملابس"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">الوصف (اختياري)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="وصف مختصر للفئة"
              className={inputClass}
            />
          </label>

          {formError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {formError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {successMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving
                ? "جارٍ الحفظ..."
                : editingId
                  ? "حفظ التعديلات"
                  : "إضافة"}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                إلغاء
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="mb-4 text-lg font-semibold">قائمة الفئات</h2>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            جارٍ تحميل الفئات...
          </p>
        ) : listError ? (
          <div className="space-y-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <p role="alert">{listError}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadCategories();
              }}
              className="rounded-lg border border-red-300 px-3 py-1.5 font-medium dark:border-red-800"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            لا توجد فئات بعد
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/15">
                  <th className="p-2 font-semibold">الاسم</th>
                  <th className="p-2 font-semibold">الوصف</th>
                  <th className="p-2 font-semibold">الحالة</th>
                  <th className="p-2 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-black/5 last:border-0 dark:border-white/10"
                  >
                    <td className="p-2 font-medium">{category.name}</td>
                    <td className="p-2 text-zinc-600 dark:text-zinc-400">
                      {category.description || "—"}
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          category.status === "active"
                            ? "rounded-full bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }
                      >
                        {category.status === "active" ? "نشطة" : "غير نشطة"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(category)}
                          disabled={statusChangingId === category.id}
                          className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          {statusChangingId === category.id
                            ? "جارٍ..."
                            : category.status === "active"
                              ? "إيقاف"
                              : "تفعيل"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
