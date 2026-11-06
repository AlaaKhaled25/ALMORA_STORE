import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ApiErrorDetail } from "@/lib/api-errors";
import type { CategoryStatus, CategoryView } from "@/lib/types";

export const CATEGORIES_COLLECTION = "categories";
export const CATEGORY_NAME_MAX_LENGTH = 60;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 300;

export function categoriesRef() {
  return getAdminDb().collection(CATEGORIES_COLLECTION);
}

// Compare names while ignoring extra spaces and letter case.
export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export type CategoryFields = {
  name: string;
  description: string;
};

// Server-side validation for create and edit.
export function validateCategoryFields(body: unknown): {
  ok: boolean;
  value: CategoryFields;
  details: ApiErrorDetail[];
} {
  const details: ApiErrorDetail[] = [];
  const value: CategoryFields = { name: "", description: "" };

  if (typeof body !== "object" || body === null) {
    details.push({ message: "صيغة الطلب غير صحيحة." });
    return { ok: false, value, details };
  }

  const input = body as Record<string, unknown>;

  if (typeof input.name !== "string" || input.name.trim() === "") {
    details.push({ field: "name", message: "اسم الفئة مطلوب." });
  } else {
    value.name = input.name.trim().replace(/\s+/g, " ");
    if (value.name.length > CATEGORY_NAME_MAX_LENGTH) {
      details.push({
        field: "name",
        message: `اسم الفئة يجب ألا يتجاوز ${CATEGORY_NAME_MAX_LENGTH} حرفًا.`,
      });
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      details.push({
        field: "description",
        message: "الوصف يجب أن يكون نصًا.",
      });
    } else {
      value.description = input.description.trim();
      if (value.description.length > CATEGORY_DESCRIPTION_MAX_LENGTH) {
        details.push({
          field: "description",
          message: `الوصف يجب ألا يتجاوز ${CATEGORY_DESCRIPTION_MAX_LENGTH} حرفًا.`,
        });
      }
    }
  }

  return { ok: details.length === 0, value, details };
}

export function isValidCategoryStatus(
  value: unknown,
): value is CategoryStatus {
  return value === "active" || value === "inactive";
}

// Read all categories and compare in code. The collection is small, so this
// avoids Firestore composite indexes.
export async function findCategoryBySameName(
  name: string,
  excludeId?: string,
) {
  const snapshot = await categoriesRef().get();
  const target = normalizeCategoryName(name);

  return (
    snapshot.docs.find(
      (doc) =>
        doc.id !== excludeId &&
        normalizeCategoryName(String(doc.data().name ?? "")) === target,
    ) ?? null
  );
}

// Convert a Firestore document into the safe shape sent to the browser.
export function toCategoryView(
  id: string,
  data: Record<string, unknown>,
): CategoryView {
  const createdAt = data.createdAt as Timestamp | undefined;
  const updatedAt = data.updatedAt as Timestamp | undefined;

  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "inactive" ? "inactive" : "active",
    createdAt: createdAt?.toMillis?.() ?? null,
    updatedAt: updatedAt?.toMillis?.() ?? null,
  };
}

// Read one category by document id (single-doc read, no index needed).
export async function getCategoryById(categoryId: string): Promise<{
  exists: boolean;
  isActive: boolean;
}> {
  const snapshot = await categoriesRef().doc(categoryId).get();

  if (!snapshot.exists) {
    return { exists: false, isActive: false };
  }

  const data = snapshot.data() ?? {};
  return { exists: true, isActive: data.status !== "inactive" };
}
