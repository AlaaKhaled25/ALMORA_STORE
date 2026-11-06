import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ApiErrorDetail } from "@/lib/api-errors";
import { egpToPiastres } from "@/lib/money";
import type { ProductStatus, ProductView } from "@/lib/types";

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
};

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

  return { ok: details.length === 0, value, details };
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
    createdAt: createdAt?.toMillis?.() ?? null,
    updatedAt: updatedAt?.toMillis?.() ?? null,
  };
}
