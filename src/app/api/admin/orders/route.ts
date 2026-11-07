import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { listAdminOrders } from "@/lib/admin-orders";
import { logError } from "@/lib/log-error";
import { requireAdmin } from "@/lib/require-admin";

// Admin: list all orders. Filtering/sorting/pagination happen in the browser.
export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  try {
    const orders = await listAdminOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    logError("admin/orders", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل الطلبات.");
  }
}
