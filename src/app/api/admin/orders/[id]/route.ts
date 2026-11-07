import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { getAdminOrderDetails } from "@/lib/admin-orders";
import { logError } from "@/lib/log-error";
import { requireAdmin } from "@/lib/require-admin";

type RouteParams = { params: Promise<{ id: string }> };

// Admin: one order with its full status/payment history.
export async function GET(_request: Request, { params }: RouteParams) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const { id } = await params;

  try {
    const order = await getAdminOrderDetails(id);
    if (!order) {
      return apiError(404, "NOT_FOUND", "الطلب غير موجود.");
    }

    return NextResponse.json({ order });
  } catch (error) {
    logError("admin/orders/[id]", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل تفاصيل الطلب.");
  }
}
