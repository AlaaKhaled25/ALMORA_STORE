import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { validateCartItems } from "@/lib/checkout";
import { logError } from "@/lib/log-error";
import { validateStoreCartItems } from "@/lib/store";

// Public: checks the browser cart against current products, prices and stock.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "صيغة الطلب غير صحيحة.");
  }

  const input =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  const parsed = validateCartItems(input?.items, { allowEmpty: true });

  if (!parsed.ok) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "صيغة السلة غير صحيحة.",
      parsed.details,
    );
  }

  try {
    const result = await validateStoreCartItems(parsed.value);
    return NextResponse.json(result);
  } catch (error) {
    logError("store/cart/validate", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر التحقق من السلة.");
  }
}
