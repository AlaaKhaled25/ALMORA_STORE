import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import { createStoreOrder } from "@/lib/orders";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Public: creates a COD order. Guest checkout only.
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientIp(request));
  if (!rateLimit.allowed) {
    const response = apiError(
      429,
      "RATE_LIMITED",
      "عدد محاولات الطلب كبير. حاول مرة أخرى بعد قليل.",
      [],
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "صيغة الطلب غير صحيحة.");
  }

  try {
    const result = await createStoreOrder(body);

    if (!result.ok) {
      return apiError(
        result.status,
        result.code,
        result.message,
        result.details ?? [],
        result.extra ?? {},
      );
    }

    return NextResponse.json(
      { order: result.order, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    logError("store/orders", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر إنشاء الطلب.");
  }
}
