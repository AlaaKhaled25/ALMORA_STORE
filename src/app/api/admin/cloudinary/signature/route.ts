import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { createUploadSignature } from "@/lib/cloudinary";
import { logError } from "@/lib/log-error";
import { requireAdmin } from "@/lib/require-admin";

// Admin-only: returns signed upload data. The API secret never leaves the server.
export async function POST() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  try {
    return NextResponse.json(createUploadSignature());
  } catch (error) {
    logError("cloudinary/signature", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تجهيز رفع الصور.");
  }
}
