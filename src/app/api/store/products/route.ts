import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import {
  getStoreProducts,
  parseStorePage,
  parseStoreSort,
} from "@/lib/store";

// Public: active products in active categories only.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseStorePage(searchParams.get("page"));
  const sort = parseStoreSort(searchParams.get("sort"));
  const search = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const categoryId = searchParams.get("category")?.trim() || undefined;

  try {
    const result = await getStoreProducts({
      page,
      search,
      sort,
      categoryId,
    });

    return NextResponse.json(result);
  } catch (error) {
    logError("store/products", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل المنتجات.");
  }
}
