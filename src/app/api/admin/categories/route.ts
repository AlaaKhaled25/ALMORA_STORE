import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/require-admin";
import { writeAuditLog } from "@/lib/audit-log";
import {
  categoriesRef,
  findCategoryBySameName,
  toCategoryView,
  validateCategoryFields,
} from "@/lib/categories";

// List all categories (newest first, sorted in code to avoid an index).
export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  try {
    const snapshot = await categoriesRef().get();
    const categories = snapshot.docs
      .map((doc) => toCategoryView(doc.id, doc.data()))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to list categories:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل الفئات.");
  }
}

// Create a category. New categories start as active.
export async function POST(request: Request) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "صيغة الطلب غير صحيحة.");
  }

  const validation = validateCategoryFields(body);
  if (!validation.ok) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "يرجى تصحيح الحقول المطلوبة.",
      validation.details,
    );
  }

  try {
    const duplicate = await findCategoryBySameName(validation.value.name);
    if (duplicate) {
      return apiError(409, "CONFLICT", "توجد فئة بنفس الاسم.");
    }

    const docRef = categoriesRef().doc();
    await docRef.set({
      name: validation.value.name,
      description: validation.value.description,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: session,
      action: "category.create",
      entityType: "category",
      entityId: docRef.id,
      afterData: {
        name: validation.value.name,
        description: validation.value.description,
        status: "active",
      },
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر إنشاء الفئة.");
  }
}
