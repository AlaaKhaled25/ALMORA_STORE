import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/require-admin";
import { writeAuditLog } from "@/lib/audit-log";
import { categoriesRef, isValidCategoryStatus } from "@/lib/categories";

type RouteParams = { params: Promise<{ id: string }> };

// Activate or deactivate a category. We never hard-delete categories.
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

  const status = (body as Record<string, unknown> | null)?.status;
  if (!isValidCategoryStatus(status)) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "الحالة يجب أن تكون active أو inactive.",
      [{ field: "status", message: "قيمة الحالة غير صحيحة." }],
    );
  }

  try {
    const docRef = categoriesRef().doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return apiError(404, "NOT_FOUND", "الفئة غير موجودة.");
    }

    const current = snapshot.data() ?? {};
    const previousStatus = current.status === "inactive" ? "inactive" : "active";

    // Nothing to change.
    if (previousStatus === status) {
      return NextResponse.json({ ok: true, status });
    }

    await docRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: session,
      action: "category.status_change",
      entityType: "category",
      entityId: id,
      beforeData: { status: previousStatus },
      afterData: { status },
    });

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("Failed to change category status:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تغيير حالة الفئة.");
  }
}
