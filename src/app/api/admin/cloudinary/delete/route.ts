import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { logError } from "@/lib/log-error";
import { requireAdmin } from "@/lib/require-admin";

// Admin-only: delete one image from Cloudinary by its public id.
export async function POST(request: Request) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "صيغة الطلب غير صحيحة.");
  }

  const publicId = (body as Record<string, unknown> | null)?.publicId;
  if (typeof publicId !== "string" || publicId.trim() === "") {
    return apiError(400, "VALIDATION_ERROR", "معرّف الصورة مطلوب.", [
      { field: "publicId", message: "معرّف الصورة مطلوب." },
    ]);
  }

  try {
    const result = await deleteCloudinaryImage(publicId.trim());
    if (!result.deleted) {
      return apiError(
        502,
        "INTERNAL_ERROR",
        result.warning ?? "تعذر حذف الصورة من Cloudinary.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("cloudinary/delete", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر حذف الصورة.");
  }
}
