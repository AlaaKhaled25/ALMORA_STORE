import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { logError } from "@/lib/log-error";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { findTrackedOrder } from "@/lib/tracking";

const GENERIC_NOT_FOUND = "لم نعثر على طلب بهذه البيانات.";

// Public: order number + phone number must both match.
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`track:${getClientIp(request)}`);
  if (!rateLimit.allowed) {
    const response = apiError(
      429,
      "RATE_LIMITED",
      "عدد محاولات التتبع كبير. حاول مرة أخرى بعد قليل.",
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

  const input =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  try {
    const order = await findTrackedOrder(input.orderNumber, input.phone);

    if (!order) {
      return apiError(404, "NOT_FOUND", GENERIC_NOT_FOUND);
    }

    return NextResponse.json({ order });
  } catch (error) {
    logError("store/orders/track", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تتبع الطلب.");
  }
}
