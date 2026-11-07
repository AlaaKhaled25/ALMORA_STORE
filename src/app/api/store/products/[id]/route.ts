import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import { getStoreProductById } from "@/lib/store";

type RouteParams = { params: Promise<{ id: string }> };

// Public: one visible product, or 404.
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const product = await getStoreProductById(id);
    if (!product) {
      return apiError(404, "NOT_FOUND", "المنتج غير موجود.");
    }

    return NextResponse.json({ product });
  } catch (error) {
    logError("store/product", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل المنتج.");
  }
}
