import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/require-admin";
import { writeAuditLog } from "@/lib/audit-log";
import { getCategoryById } from "@/lib/categories";
import { productsRef, validateProductFields } from "@/lib/products";

type RouteParams = { params: Promise<{ id: string }> };

// Edit a product's fields. Status changes use the /status route.
export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "صيغة الطلب غير صحيحة.");
  }

  const validation = validateProductFields(body);
  if (!validation.ok) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "يرجى تصحيح الحقول المطلوبة.",
      validation.details,
    );
  }

  try {
    const docRef = productsRef().doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return apiError(404, "NOT_FOUND", "المنتج غير موجود.");
    }

    const current = snapshot.data() ?? {};

    const category = await getCategoryById(validation.value.categoryId);
    if (!category.exists) {
      return apiError(400, "VALIDATION_ERROR", "الفئة غير موجودة.", [
        { field: "categoryId", message: "اختر فئة موجودة." },
      ]);
    }
    if (!category.isActive) {
      return apiError(400, "VALIDATION_ERROR", "الفئة غير مفعّلة.", [
        { field: "categoryId", message: "اختر فئة نشطة." },
      ]);
    }

    await docRef.update({
      name: validation.value.name,
      description: validation.value.description,
      price: validation.value.price,
      stockQuantity: validation.value.stockQuantity,
      categoryId: validation.value.categoryId,
      images: validation.value.images,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const status = current.status === "archived" ? "archived" : "active";

    const currentImages = Array.isArray(current.images)
      ? (current.images as { publicId?: unknown }[])
          .map((image) => String(image.publicId ?? ""))
          .filter(Boolean)
      : [];

    await writeAuditLog({
      actor: session,
      action: "product.update",
      entityType: "product",
      entityId: id,
      beforeData: {
        name: String(current.name ?? ""),
        price: Number(current.price ?? 0),
        stockQuantity: Number(current.stockQuantity ?? 0),
        categoryId: String(current.categoryId ?? ""),
        status,
        imagePublicIds: currentImages,
      },
      afterData: {
        name: validation.value.name,
        price: validation.value.price,
        stockQuantity: validation.value.stockQuantity,
        categoryId: validation.value.categoryId,
        status,
        imagePublicIds: validation.value.images.map((image) => image.publicId),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update product:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحديث المنتج.");
  }
}
