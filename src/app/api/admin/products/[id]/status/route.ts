import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/require-admin";
import { writeAuditLog } from "@/lib/audit-log";
import { isValidProductStatus, productsRef } from "@/lib/products";

type RouteParams = { params: Promise<{ id: string }> };

// Archive or unarchive a product. We never hard-delete products.
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
  if (!isValidProductStatus(status)) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "الحالة يجب أن تكون active أو archived.",
      [{ field: "status", message: "قيمة الحالة غير صحيحة." }],
    );
  }

  try {
    const docRef = productsRef().doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return apiError(404, "NOT_FOUND", "المنتج غير موجود.");
    }

    const current = snapshot.data() ?? {};
    const previousStatus = current.status === "archived" ? "archived" : "active";

    // Nothing to change.
    if (previousStatus === status) {
      return NextResponse.json({ ok: true, status });
    }

    await docRef.update({
      status,
      // Keep archivedAt only while the product is archived.
      archivedAt:
        status === "archived"
          ? FieldValue.serverTimestamp()
          : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: session,
      action: status === "archived" ? "product.archive" : "product.unarchive",
      entityType: "product",
      entityId: id,
      beforeData: { status: previousStatus },
      afterData: { status },
    });

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("Failed to change product status:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تغيير حالة المنتج.");
  }
}
