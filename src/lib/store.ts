import type { Timestamp } from "firebase-admin/firestore";
import { DELIVERY_FEE_PIASTRES } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";

// Public storefront data. Only active products in active categories are exposed.
// Exact stock numbers never leave this file; the UI gets an availability label.

export const STORE_PAGE_SIZE = 12;

export type StoreAvailability = "متوفر" | "كمية محدودة" | "غير متوفر";
export type StoreSort = "newest" | "price-asc" | "price-desc";

export type StoreCategory = {
  id: string;
  name: string;
  description: string;
};

export type StoreProduct = {
  id: string;
  name: string;
  description: string;
  price: number; // piastres
  availability: StoreAvailability;
  categoryId: string;
  categoryName: string;
  images: { url: string }[];
  createdAt: number | null;
};

export type StoreProductList = {
  products: StoreProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StoreCartItem = {
  productId: string;
  quantity: number;
};

export type StoreCartValidationItem = {
  productId: string;
  quantity: number;
  found: boolean;
  name: string;
  price: number; // piastres
  imageUrl: string | null;
  availability: StoreAvailability;
  canFulfill: boolean;
  message: string | null;
};

export type StoreCartValidation = {
  items: StoreCartValidationItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  hasIssues: boolean;
};

export function getStoreAvailability(
  stockQuantity: number,
): StoreAvailability {
  if (!Number.isFinite(stockQuantity) || stockQuantity <= 0) {
    return "غير متوفر";
  }
  if (stockQuantity <= 5) return "كمية محدودة";
  return "متوفر";
}

// Only keep image URLs, never internal Cloudinary fields.
function toPublicImages(value: unknown): { url: string }[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : null,
    )
    .map((item) =>
      item && typeof item.url === "string" ? { url: item.url } : null,
    )
    .filter((image): image is { url: string } => image !== null);
}

function toStoreProduct(
  id: string,
  data: Record<string, unknown>,
  category: StoreCategory,
): StoreProduct {
  const createdAt = data.createdAt as Timestamp | undefined;

  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    price: Number(data.price ?? 0),
    availability: getStoreAvailability(Number(data.stockQuantity ?? 0)),
    categoryId: category.id,
    categoryName: category.name,
    images: toPublicImages(data.images),
    createdAt: createdAt?.toMillis?.() ?? null,
  };
}

// Active categories only. No index needed: the categories list is small.
export async function getStoreCategories(): Promise<StoreCategory[]> {
  const snapshot = await getAdminDb().collection("categories").get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name ?? ""),
        description: String(data.description ?? ""),
        status: data.status,
      };
    })
    .filter((category) => category.status !== "inactive")
    .map(({ id, name, description }) => ({ id, name, description }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export async function getStoreCategoryById(
  id: string,
): Promise<StoreCategory | null> {
  const doc = await getAdminDb().collection("categories").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data() ?? {};
  if (data.status === "inactive") return null;

  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
  };
}

// Search, filter, sort and pagination happen in code (no composite indexes).
export async function getStoreProducts(
  options: {
    page?: number;
    search?: string;
    sort?: StoreSort;
    categoryId?: string;
  } = {},
): Promise<StoreProductList> {
  const [categories, snapshot] = await Promise.all([
    getStoreCategories(),
    getAdminDb().collection("products").where("status", "==", "active").get(),
  ]);

  const activeCategories = new Map(
    categories.map((category) => [category.id, category]),
  );

  // Keep only products whose category is active.
  let products: StoreProduct[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const category = activeCategories.get(String(data.categoryId ?? ""));
    if (!category) continue;
    products.push(toStoreProduct(doc.id, data, category));
  }

  const search = (options.search ?? "").trim().toLowerCase();
  if (options.categoryId) {
    products = products.filter(
      (product) => product.categoryId === options.categoryId,
    );
  }
  if (search !== "") {
    products = products.filter((product) =>
      product.name.toLowerCase().includes(search),
    );
  }

  const sort = options.sort ?? "newest";
  products.sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });

  const total = products.length;
  const totalPages = Math.ceil(total / STORE_PAGE_SIZE);
  const requestedPage = Math.max(1, Math.floor(options.page ?? 1));
  const page = Math.min(requestedPage, totalPages || 1);
  const start = (page - 1) * STORE_PAGE_SIZE;

  return {
    products: products.slice(start, start + STORE_PAGE_SIZE),
    page,
    pageSize: STORE_PAGE_SIZE,
    total,
    totalPages,
  };
}

// Hidden products (archived) and products in inactive categories return null,
// so the page can show a proper 404.
export async function getStoreProductById(
  id: string,
): Promise<StoreProduct | null> {
  const doc = await getAdminDb().collection("products").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data() ?? {};
  if (data.status !== "active") return null;

  const category = await getStoreCategoryById(String(data.categoryId ?? ""));
  if (!category) return null;

  return toStoreProduct(doc.id, data, category);
}

// Checks a browser cart against current products, prices and stock.
// It returns only public data (no exact stock numbers, no internal image fields).
export async function validateStoreCartItems(
  items: StoreCartItem[],
): Promise<StoreCartValidation> {
  if (items.length === 0) {
    return {
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
      itemCount: 0,
      hasIssues: false,
    };
  }

  const db = getAdminDb();
  const productRefs = items.map((item) =>
    db.collection("products").doc(item.productId),
  );

  const [categories, productDocs] = await Promise.all([
    getStoreCategories(),
    db.getAll(...productRefs),
  ]);

  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const results: StoreCartValidationItem[] = items.map((item, index) => {
    const doc = productDocs[index];
    const data = doc?.exists ? doc.data() ?? {} : null;
    const name = data ? String(data.name ?? "") : "";
    const isVisible =
      !!data &&
      data.status === "active" &&
      activeCategoryIds.has(String(data.categoryId ?? ""));

    if (!isVisible) {
      return {
        productId: item.productId,
        quantity: item.quantity,
        found: false,
        name,
        price: 0,
        imageUrl: null,
        availability: "غير متوفر",
        canFulfill: false,
        message: "هذا المنتج لم يعد متوفرًا.",
      };
    }

    const price = Number(data.price ?? 0);
    const stockQuantity = Number(data.stockQuantity ?? 0);
    const availability = getStoreAvailability(stockQuantity);
    const canFulfill = Number.isFinite(stockQuantity)
      ? stockQuantity >= item.quantity
      : false;

    return {
      productId: item.productId,
      quantity: item.quantity,
      found: true,
      name,
      price,
      imageUrl: toPublicImages(data.images)[0]?.url ?? null,
      availability,
      canFulfill,
      message: canFulfill
        ? null
        : availability === "غير متوفر"
          ? "هذا المنتج غير متوفر حاليًا."
          : "الكمية المطلوبة أكبر من المخزون المتاح.",
    };
  });

  const subtotal = results.reduce(
    (sum, item) => sum + (item.found ? item.price * item.quantity : 0),
    0,
  );
  const deliveryFee = DELIVERY_FEE_PIASTRES;
  const itemCount = results.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items: results,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    itemCount,
    hasIssues: results.some((item) => !item.canFulfill),
  };
}

export function parseStoreSort(value: string | null | undefined): StoreSort {
  if (value === "price-asc" || value === "price-desc") return value;
  return "newest";
}

export function parseStorePage(value: string | null | undefined): number {
  const page = Number(value);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}
