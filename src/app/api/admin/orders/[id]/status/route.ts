import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import {
  cancelOrder,
  changeOrderStatus,
} from "@/lib/order-actions";
import { isOrderStatus } from "@/lib/order-status";
import { requireAdmin } from "@/lib/require-admin";

type RouteParams = { params: Promise<{ id: string }> };

// Admin: move one step forward, or cancel with a customer-facing reason.
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

  const input =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const status = input.status;
  const reason =
    typeof input.reason === "string" ? input.reason.trim() : "";
  const cancellationReasonCode =
    typeof input.cancellationReasonCode === "string"
      ? input.cancellationReasonCode.trim()
      : "";
  const cancellationNote =
    typeof input.cancellationNote === "string"
      ? input.cancellationNote.trim()
      : "";

  if (!isOrderStatus(status)) {
    return apiError(400, "VALIDATION_ERROR", "حالة الطلب غير صحيحة.", [
      { field: "status", message: "اختر حالة صالحة." },
    ]);
  }

  if (status !== "cancelled" && reason.length > 500) {
    return apiError(400, "VALIDATION_ERROR", "سبب التحديث طويل جدًا.", [
      { field: "reason", message: "الحد الأقصى 500 حرف." },
    ]);
  }

  try {
    const result =
      status === "cancelled"
        ? await cancelOrder(
            id,
            cancellationReasonCode,
            cancellationNote,
            session,
          )
        : await changeOrderStatus(id, status, session, reason);

    if (!result.ok) {
      return apiError(
        result.status,
        result.code,
        result.message,
        result.details ?? [],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("admin/orders/[id]/status", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحديث حالة الطلب.");
  }
}
