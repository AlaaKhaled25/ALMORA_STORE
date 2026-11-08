"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  PRODUCT_IMAGES_MAX,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_TYPES,
} from "@/lib/constants";
import { egpToPiastres, piastresToEgp } from "@/lib/money";
import type {
  CategoryView,
  ProductImage,
  ProductStatus,
  ProductView,
} from "@/lib/types";

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

const filterClass =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

type ProductFormSnapshot = {
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  categoryId: string;
  images: ProductImage[];
};

type Toast = {
  message: string;
  tone: "success" | "warning";
};

function makeFormSnapshot(values: ProductFormSnapshot): string {
  return JSON.stringify(values);
}

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

// Client-side image checks for fast feedback. The server validates again on save.
function getImageProblem(file: File): string | null {
  if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "الصور المسموح بها هي JPG أو PNG أو WEBP فقط.";
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "حجم كل صورة يجب ألا يتجاوز 5 ميجابايت.";
  }
  return null;
}

// Pure data fetches: no React state here, so they are safe to start from an effect.
async function fetchProducts(): Promise<ProductView[]> {
  const response = await fetch("/api/admin/products", { cache: "no-store" });

  if (response.status === 401) throw new UnauthorizedError("Unauthorized");
  if (!response.ok) throw new Error(await readErrorMessage(response));

  const data = await response.json();
  return data.products ?? [];
}

async function fetchCategories(): Promise<CategoryView[]> {
  const response = await fetch("/api/admin/categories", { cache: "no-store" });

  if (response.status === 401) throw new UnauthorizedError("Unauthorized");
  if (!response.ok) throw new Error(await readErrorMessage(response));

  const data = await response.json();
  return data.categories ?? [];
}

export default function ProductsManager() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formBaseline, setFormBaseline] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  const [images, setImages] = useState<ProductImage[]>([]);
  const [originalImages, setOriginalImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestCloseFormRef = useRef<() => void>(() => {});

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const reloadData = useCallback(async () => {
    try {
      const [productList, categoryList] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
      setListError(null);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        router.replace("/admin/login");
        return;
      }
      setListError(
        error instanceof Error ? error.message : "تعذر تحميل البيانات.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    // setState happens inside promise callbacks, after the requests start.
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([productList, categoryList]) => {
        if (cancelled) return;
        setProducts(productList);
        setCategories(categoryList);
        setListError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof UnauthorizedError) {
          router.replace("/admin/login");
          return;
        }
        setListError(
          error instanceof Error ? error.message : "تعذر تحميل البيانات.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isFormOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestCloseFormRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormOpen]);

  useEffect(() => {
    requestCloseFormRef.current = requestCloseForm;
  });

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setStockQuantity("");
    setCategoryId("");
    setEditingId(null);
    setFormError(null);
    setImages([]);
    setOriginalImages([]);
    setImageError(null);
  }

  function startEdit(product: ProductView) {
    const nextPrice = piastresToEgp(product.price);
    const nextStock = String(product.stockQuantity);

    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPrice(nextPrice);
    setStockQuantity(nextStock);
    setCategoryId(product.categoryId);
    setFormError(null);
    setToast(null);
    setImages([...product.images]);
    setOriginalImages([...product.images]);
    setImageError(null);
    setFormBaseline(
      makeFormSnapshot({
        name: product.name,
        description: product.description,
        price: nextPrice,
        stockQuantity: nextStock,
        categoryId: product.categoryId,
        images: product.images,
      }),
    );
    setIsFormOpen(true);
  }

  function openCreateForm() {
    resetForm();
    setFormBaseline(
      makeFormSnapshot({
        name: "",
        description: "",
        price: "",
        stockQuantity: "",
        categoryId: "",
        images: [],
      }),
    );
    setToast(null);
    setIsFormOpen(true);
  }

  function closeFormImmediately() {
    setIsFormOpen(false);
    resetForm();
    setFormBaseline("");
  }

  function requestCloseForm() {
    if (saving || uploading) return;

    const currentSnapshot = makeFormSnapshot({
      name,
      description,
      price,
      stockQuantity,
      categoryId,
      images,
    });

    if (formBaseline !== "" && currentSnapshot !== formBaseline) {
      if (
        !window.confirm(
          "لديك تغييرات غير محفوظة. هل تريد إغلاق النموذج؟",
        )
      ) {
        return;
      }
    }

    closeFormImmediately();
  }

  function categoryName(id: string): string {
    return categories.find((category) => category.id === id)?.name ?? "غير معروف";
  }

  function makeMainImage(publicId: string) {
    setImages((current) => {
      const chosen = current.find((image) => image.publicId === publicId);
      if (!chosen) return current;
      return [
        chosen,
        ...current.filter((image) => image.publicId !== publicId),
      ];
    });
  }

  function removeImage(publicId: string) {
    setImages((current) =>
      current.filter((image) => image.publicId !== publicId),
    );
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setImageError(null);

    const remaining = PRODUCT_IMAGES_MAX - images.length;
    if (remaining <= 0) {
      setImageError(`يمكن إضافة ${PRODUCT_IMAGES_MAX} صور كحد أقصى.`);
      return;
    }

    if (files.length > remaining) {
      setImageError(`يمكن إضافة ${PRODUCT_IMAGES_MAX} صور كحد أقصى.`);
    }

    const accepted: File[] = [];
    for (const file of files.slice(0, remaining)) {
      const problem = getImageProblem(file);
      if (problem) {
        setImageError(problem);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    setUploading(true);

    try {
      // Ask our backend for signed upload data. The secret stays on the server.
      const signatureResponse = await fetch(
        "/api/admin/cloudinary/signature",
        { method: "POST" },
      );

      if (signatureResponse.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!signatureResponse.ok) {
        throw new Error(await readErrorMessage(signatureResponse));
      }

      const signature = await signatureResponse.json();
      const uploaded: ProductImage[] = [];

      // Upload each file directly from the browser to Cloudinary.
      for (const file of accepted) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signature.apiKey);
        formData.append("timestamp", String(signature.timestamp));
        formData.append("folder", signature.folder);
        formData.append("allowed_formats", signature.allowedFormats);
        formData.append("signature", signature.signature);

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
          { method: "POST", body: formData },
        );
        const cloudinaryData = await cloudinaryResponse
          .json()
          .catch(() => null);

        if (
          !cloudinaryResponse.ok ||
          typeof cloudinaryData?.secure_url !== "string" ||
          typeof cloudinaryData?.public_id !== "string"
        ) {
          throw new Error("تعذر رفع إحدى الصور. حاول مرة أخرى.");
        }

        uploaded.push({
          url: cloudinaryData.secure_url,
          publicId: cloudinaryData.public_id,
        });
      }

      setImages((current) =>
        [...current, ...uploaded].slice(0, PRODUCT_IMAGES_MAX),
      );
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "تعذر رفع الصور.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setToast(null);

    if (uploading) {
      setFormError("انتظر حتى ينتهي رفع الصور.");
      return;
    }

    // Quick client hints. The server does the real validation.
    if (name.trim() === "") {
      setFormError("اسم المنتج مطلوب.");
      return;
    }

    const pricePiastres = egpToPiastres(price);
    if (pricePiastres === null) {
      setFormError("اكتب السعر بالجنيه المصري، مثل 150.50.");
      return;
    }
    if (pricePiastres <= 0) {
      setFormError("السعر يجب أن يكون أكبر من صفر.");
      return;
    }

    if (!/^\d+$/.test(stockQuantity.trim())) {
      setFormError("الكمية يجب أن تكون عددًا صحيحًا غير سالب.");
      return;
    }

    if (categoryId === "") {
      setFormError("اختر فئة.");
      return;
    }

    const selectedCategory = categories.find(
      (category) => category.id === categoryId,
    );
    if (!selectedCategory || selectedCategory.status !== "active") {
      setFormError("اختر فئة نشطة.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/products/${editingId}`
          : "/api/admin/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            price,
            stockQuantity,
            categoryId,
            images,
          }),
        },
      );

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      // Images removed while editing are deleted from Cloudinary after saving.
      const wasEditing = editingId !== null;
      const removedImages = wasEditing
        ? originalImages.filter(
            (original) =>
              !images.some((image) => image.publicId === original.publicId),
          )
        : [];

      closeFormImmediately();
      setToast({
        message: wasEditing
          ? "تم تحديث المنتج بنجاح."
          : "تمت إضافة المنتج بنجاح.",
        tone: "success",
      });
      setSaving(false);
      await reloadData();

      if (removedImages.length > 0) {
        let deleteFailed = false;

        for (const image of removedImages) {
          const deleteResponse = await fetch("/api/admin/cloudinary/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicId: image.publicId }),
          });

          if (!deleteResponse.ok) deleteFailed = true;
        }

        if (deleteFailed) {
          setToast({
            message:
              "تم حفظ المنتج، لكن تعذر حذف بعض الصور من Cloudinary. يمكنك المحاولة لاحقًا.",
            tone: "warning",
          });
        }
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "تعذر حفظ المنتج.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(product: ProductView) {
    const nextStatus = product.status === "active" ? "archived" : "active";
    const question =
      nextStatus === "archived"
        ? `هل تريد أرشفة المنتج "${product.name}"؟`
        : `هل تريد إلغاء أرشفة المنتج "${product.name}"؟`;

    if (!window.confirm(question)) return;

    setStatusChangingId(product.id);
    setListError(null);

    try {
      const response = await fetch(
        `/api/admin/products/${product.id}/status`,
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

      await reloadData();
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "تعذر تغيير حالة المنتج.",
      );
    } finally {
      setStatusChangingId(null);
    }
  }

  // Filtering happens in the browser, so Firestore needs no composite index.
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    if (categoryFilter !== "all" && product.categoryId !== categoryFilter) {
      return false;
    }
    if (statusFilter !== "all" && product.status !== statusFilter) {
      return false;
    }
    if (
      normalizedSearch !== "" &&
      !product.name.toLowerCase().includes(normalizedSearch)
    ) {
      return false;
    }
    return true;
  });

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const selectedCategoryInactive = selectedCategory?.status === "inactive";
  const hasActiveCategories = categories.some(
    (category) => category.status === "active",
  );
  const formCategoryOptions = categories.filter(
    (category) => category.status === "active" || category.id === categoryId,
  );

  return (
    <>
      {isFormOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={requestCloseForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            className="flex h-full w-full flex-col overflow-y-auto bg-background shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/10 bg-background p-4 dark:border-white/15">
              <h2 id="product-form-title" className="text-lg font-semibold">
                {editingId ? "تعديل منتج" : "إضافة منتج"}
              </h2>
              <button
                type="button"
                onClick={requestCloseForm}
                disabled={saving || uploading}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
              >
                إغلاق
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 sm:p-5"
            >
          <label className="block space-y-1 text-sm">
            <span className="font-medium">اسم المنتج</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              placeholder="مثال: قميص قطني"
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">الوصف (اختياري)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="وصف مختصر للمنتج"
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">السعر (جنيه مصري)</span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
              placeholder="150.50"
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">الكمية في المخزون</span>
            <input
              type="text"
              inputMode="numeric"
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              required
              placeholder="0"
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">الفئة</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              className={fieldClass}
            >
              <option value="" disabled>
                اختر فئة
              </option>
              {formCategoryOptions.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                  disabled={category.status !== "active"}
                >
                  {category.name}
                  {category.status === "inactive" ? " (غير نشطة)" : ""}
                </option>
              ))}
            </select>
            {!hasActiveCategories ? (
              <span className="block text-xs text-amber-700 dark:text-amber-400">
                لا توجد فئات نشطة. فعّل فئة أولًا من صفحة الفئات.
              </span>
            ) : null}
            {selectedCategoryInactive ? (
              <span className="block text-xs text-amber-700 dark:text-amber-400">
                فئة هذا المنتج غير مفعّلة. اختر فئة نشطة لحفظ التعديل.
              </span>
            ) : null}
          </label>

          <div className="space-y-2 text-sm">
            <span className="block font-medium">
              صور المنتج (حتى 5 صور، JPG/PNG/WEBP، 5 ميجابايت لكل صورة)
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
              disabled={uploading || images.length >= PRODUCT_IMAGES_MAX}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || images.length >= PRODUCT_IMAGES_MAX}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
              >
                {uploading ? "جارٍ رفع الصور..." : "إضافة صور"}
              </button>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {images.length} / {PRODUCT_IMAGES_MAX}
              </span>
            </div>

            {images.length === 0 ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                لم تُضف صور بعد. الصورة الأولى ستكون الصورة الرئيسية.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {images.map((image, index) => (
                  <div
                    key={image.publicId}
                    className="space-y-2 rounded-lg border border-black/10 p-2 dark:border-white/15"
                  >
                    <Image
                      src={image.url}
                      alt={`صورة المنتج ${index + 1}`}
                      width={240}
                      height={240}
                      className="h-24 w-full rounded object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 text-xs">
                      {index === 0 ? (
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          الصورة الرئيسية
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeMainImage(image.publicId)}
                          className="rounded border border-black/10 px-2 py-1 font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          اجعلها رئيسية
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(image.publicId)}
                        className="rounded border border-red-200 px-2 py-1 font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {imageError ? (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {imageError}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {formError}
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
                  : "إضافة المنتج"}
            </button>

            <button
              type="button"
              onClick={requestCloseForm}
              disabled={saving || uploading}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
            >
              إلغاء
            </button>
          </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">قائمة المنتجات</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {visibleProducts.length} من {products.length} منتج
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            إضافة منتج
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث باسم المنتج..."
            aria-label="بحث باسم المنتج"
            className={`${filterClass} min-w-[200px] flex-1`}
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className={filterClass}
            aria-label="تصفية حسب الفئة"
          >
            <option value="all">كل الفئات</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | ProductStatus)
            }
            className={filterClass}
            aria-label="تصفية حسب الحالة"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            جارٍ تحميل المنتجات...
          </p>
        ) : listError ? (
          <div className="space-y-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <p role="alert">{listError}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void reloadData();
              }}
              className="rounded-lg border border-red-300 px-3 py-1.5 font-medium dark:border-red-800"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            لا توجد منتجات بعد
          </p>
        ) : visibleProducts.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            لا توجد منتجات مطابقة للتصفية.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/15">
                  <th className="p-2 font-semibold">المنتج</th>
                  <th className="p-2 font-semibold">الفئة</th>
                  <th className="p-2 font-semibold">السعر</th>
                  <th className="p-2 font-semibold">المخزون</th>
                  <th className="p-2 font-semibold">الحالة</th>
                  <th className="p-2 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-black/5 last:border-0 dark:border-white/10"
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded bg-black/5 text-[10px] text-zinc-500 dark:bg-white/10">
                            لا صورة
                          </span>
                        )}
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-zinc-600 dark:text-zinc-400">
                      {categoryName(product.categoryId)}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {piastresToEgp(product.price)} ج.م
                    </td>
                    <td className="p-2">
                      {product.stockQuantity <= 5 ? (
                        <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          {product.stockQuantity} — كمية منخفضة
                        </span>
                      ) : (
                        product.stockQuantity
                      )}
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          product.status === "active"
                            ? "rounded-full bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }
                      >
                        {product.status === "active" ? "نشط" : "مؤرشف"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleArchive(product)}
                          disabled={statusChangingId === product.id}
                          className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          {statusChangingId === product.id
                            ? "جارٍ..."
                            : product.status === "active"
                              ? "أرشفة"
                              : "إلغاء الأرشفة"}
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

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-4 bottom-4 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-6 sm:max-w-md ${
            toast.tone === "success" ? "bg-green-700" : "bg-amber-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
