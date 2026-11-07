import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import { getStoreCategories } from "@/lib/store";

// Public: active categories only. Reading the request keeps this route dynamic.
export async function GET(request: Request) {
  void new URL(request.url);

  try {
    const categories = await getStoreCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    logError("store/categories", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل الفئات.");
  }
}
