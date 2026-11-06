import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ApiErrorDetail } from "@/lib/api-errors";
import {
  CLOUDINARY_FOLDER,
  getCloudinaryCloudName,
} from "@/lib/cloudinary";
import { PRODUCT_IMAGES_MAX } from "@/lib/constants";
import { egpToPiastres } from "@/lib/money";
import type { ProductImage, ProductStatus, ProductView } from "@/lib/types";

export const PRODUCTS_COLLECTION = "products";
export const PRODUCT_NAME_MAX_LENGTH = 100;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 1000;

export function productsRef() {
  return getAdminDb().collection(PRODUCTS_COLLECTION);
}

export type ProductFields = {
  name: string;
  description: string;
  price: number; // piastres
  stockQuantity: number;
  categoryId: string;
  images: ProductImage[];
};

// Images must be in our Cloudinary account and our product folder.
function validateProductImages(
  input: unknown,
  details: ApiErrorDetail[],
): ProductImage[] {
  if (input === undefined || input === null) return [];

  if (!Array.isArray(input)) {
    details.push({ field: "images", message: "صيغة الصور غير صحيحة." });
    return [];
  }

  if (input.length > PRODUCT_IMAGES_MAX) {
    details.push({
      field: "images",
      message: `يمكن إضافة ${PRODUCT_IMAGES_MAX} صور كحد أقصى.`,
    });
  }

  const cloudName = getCloudinaryCloudName();
  const uploadPathPrefix = `/${cloudName}/image/upload/`;
  const seenPublicIds = new Set<string>();
  const images: ProductImage[] = [];

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) {
      details.push({ field: "images", message: "صيغة إحدى الصور غير صحيحة." });
      continue;
    }

    const item = raw as Record<string, unknown>;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const publicId =
      typeof item.publicId === "string" ? item.publicId.trim() : "";

    if (!url || !publicId) {
      details.push({ field: "images", message: "بيانات إحدى الصور ناقصة." });
      continue;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      details.push({ field: "images", message: "رابط إحدى الصور غير صحيح." });
      continue;
    }

    const belongsToOurAccount =
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "res.cloudinary.com" &&
      parsedUrl.pathname.startsWith(uploadPathPrefix) &&
      parsedUrl.pathname.includes(publicId);
    const inOurFolder = publicId.startsWith(`${CLOUDINARY_FOLDER}/`);

    if (!belongsToOurAccount || !inOurFolder) {
      details.push({
        field: "images",
        message: "رابط الصورة غير صالح أو لا ينتمي إلى حساب Cloudinary الخاص بالمتجر.",
      });
      continue;
    }

    if (seenPublicIds.has(publicId)) {
      details.push({
        field: "images",
        message: "لا يمكن استخدام نفس الصورة أكثر من مرة.",
      });
      continue;
    }

    seenPublicIds.add(publicId);
    images.push({ url, publicId });
  }

  return images;
}

// Server-side validation for create and edit.
export function validateProductFields(body: unknown): {
  ok: boolean;
  value: ProductFields;
  details: ApiErrorDetail[];
} {
  const details: ApiErrorDetail[] = [];
  const value: ProductFields = {
    name: "",
    description: "",
    price: 0,
    stockQuantity: 0,
    categoryId: "",
    images: [],
  };

  if (typeof body !== "object" || body === null) {
    details.push({ message: "صيغة الطلب غير صحيحة." });
    return { ok: false, value, details };
  }

  const input = body as Record<string, unknown>;

  // Name is required.
  if (typeof input.name !== "string" || input.name.trim() === "") {
    details.push({ field: "name", message: "اسم المنتج مطلوب." });
  } else {
    value.name = input.name.trim().replace(/\s+/g, " ");
    if (value.name.length > PRODUCT_NAME_MAX_LENGTH) {
      details.push({
        field: "name",
        message: `اسم المنتج يجب ألا يتجاوز ${PRODUCT_NAME_MAX_LENGTH} حرفًا.`,
      });
    }
  }

  // Description is optional.
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      details.push({
        field: "description",
        message: "الوصف يجب أن يكون نصًا.",
      });
    } else {
      value.description = input.description.trim();
      if (value.description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
        details.push({
          field: "description",
          message: `الوصف يجب ألا يتجاوز ${PRODUCT_DESCRIPTION_MAX_LENGTH} حرفًا.`,
        });
      }
    }
  }

  // Price arrives in EGP and is stored as integer piastres.
  if (
    input.price === undefined ||
    input.price === null ||
    input.price === ""
  ) {
    details.push({ field: "price", message: "السعر مطلوب." });
  } else if (
    typeof input.price !== "string" &&
    typeof input.price !== "number"
  ) {
    details.push({ field: "price", message: "السعر غير صحيح." });
  } else {
    const piastres = egpToPiastres(input.price);
    if (piastres === null) {
      details.push({
        field: "price",
        message:
          "اكتب السعر بالجنيه المصري، مثل 150.50 (رقم موجب بحد أقصى منزلتين عشريتين).",
      });
    } else if (piastres <= 0) {
      details.push({
        field: "price",
        message: "السعر يجب أن يكون أكبر من صفر.",
      });
    } else {
      value.price = piastres;
    }
  }

  // Stock must be a non-negative integer.
  const rawStock = input.stockQuantity;
  if (rawStock === undefined || rawStock === null || rawStock === "") {
    details.push({
      field: "stockQuantity",
      message: "الكمية في المخزون مطلوبة.",
    });
  } else {
    const stockText =
      typeof rawStock === "number"
        ? String(rawStock)
        : typeof rawStock === "string"
          ? rawStock.trim()
          : "";

    if (!/^\d+$/.test(stockText) || !Number.isSafeInteger(Number(stockText))) {
      details.push({
        field: "stockQuantity",
        message: "الكمية يجب أن تكون عددًا صحيحًا غير سالب.",
      });
    } else {
      value.stockQuantity = Number(stockText);
    }
  }

  // Category is required. Existence and active status are checked in the route.
  if (
    typeof input.categoryId !== "string" ||
    input.categoryId.trim() === ""
  ) {
    details.push({ field: "categoryId", message: "الفئة مطلوبة." });
  } else {
    value.categoryId = input.categoryId.trim();
  }

  // Images are optional, but every URL must belong to our Cloudinary account.
  value.images = validateProductImages(input.images, details);

  return { ok: details.length === 0, value, details };
}

function toProductImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      url: String(item.url ?? ""),
      publicId: String(item.publicId ?? ""),
    }))
    .filter((image) => image.url !== "" && image.publicId !== "");
}

export function isValidProductStatus(value: unknown): value is ProductStatus {
  return value === "active" || value === "archived";
}

// Convert a Firestore document into the safe shape sent to the browser.
export function toProductView(
  id: string,
  data: Record<string, unknown>,
): ProductView {
  const createdAt = data.createdAt as Timestamp | undefined;
  const updatedAt = data.updatedAt as Timestamp | undefined;

  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    price: Number(data.price ?? 0),
    stockQuantity: Number(data.stockQuantity ?? 0),
    categoryId: String(data.categoryId ?? ""),
    status: data.status === "archived" ? "archived" : "active",
    images: toProductImages(data.images),
    createdAt: createdAt?.toMillis?.() ?? null,
    updatedAt: updatedAt?.toMillis?.() ?? null,
  };
}
