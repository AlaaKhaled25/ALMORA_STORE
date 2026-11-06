import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/require-admin";
import { writeAuditLog } from "@/lib/audit-log";
import {
  categoriesRef,
  findCategoryBySameName,
  validateCategoryFields,
} from "@/lib/categories";

type RouteParams = { params: Promise<{ id: string }> };

// Edit a category's name and description.
export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const { id } = await params;

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
    const docRef = categoriesRef().doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return apiError(404, "NOT_FOUND", "الفئة غير موجودة.");
    }

    const current = snapshot.data() ?? {};

    const duplicate = await findCategoryBySameName(validation.value.name, id);
    if (duplicate) {
      return apiError(409, "CONFLICT", "توجد فئة بنفس الاسم.");
    }

    await docRef.update({
      name: validation.value.name,
      description: validation.value.description,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: session,
      action: "category.update",
      entityType: "category",
      entityId: id,
      beforeData: {
        name: String(current.name ?? ""),
        description: String(current.description ?? ""),
        status: current.status === "inactive" ? "inactive" : "active",
      },
      afterData: {
        name: validation.value.name,
        description: validation.value.description,
        status: current.status === "inactive" ? "inactive" : "active",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update category:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحديث الفئة.");
  }
}
