import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import { collectPayment } from "@/lib/order-actions";
import { requireAdmin } from "@/lib/require-admin";

type RouteParams = { params: Promise<{ id: string }> };

// Admin: record COD collection. Allowed only after delivery.
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

  if (input.paymentStatus !== "paid") {
    return apiError(400, "VALIDATION_ERROR", "حالة الدفع غير صحيحة.", [
      { field: "paymentStatus", message: "القيمة المسموح بها هي paid." },
    ]);
  }

  try {
    const result = await collectPayment(id, session);
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
    logError("admin/orders/[id]/payment", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تسجيل تحصيل المبلغ.");
  }
}
