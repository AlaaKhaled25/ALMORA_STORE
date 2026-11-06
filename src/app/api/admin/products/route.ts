import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/require-admin";
import { writeAuditLog } from "@/lib/audit-log";
import { getCategoryById } from "@/lib/categories";
import {
  productsRef,
  toProductView,
  validateProductFields,
} from "@/lib/products";

// List all products, active and archived (sorted in code, no index).
export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  try {
    const snapshot = await productsRef().get();
    const products = snapshot.docs
      .map((doc) => toProductView(doc.id, doc.data()))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Failed to list products:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر تحميل المنتجات.");
  }
}

// Create a product. New products start as active.
export async function POST(request: Request) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

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

    const docRef = productsRef().doc();
    await docRef.set({
      name: validation.value.name,
      description: validation.value.description,
      price: validation.value.price,
      stockQuantity: validation.value.stockQuantity,
      categoryId: validation.value.categoryId,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: session,
      action: "product.create",
      entityType: "product",
      entityId: docRef.id,
      afterData: {
        name: validation.value.name,
        price: validation.value.price,
        stockQuantity: validation.value.stockQuantity,
        categoryId: validation.value.categoryId,
        status: "active",
      },
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return apiError(500, "INTERNAL_ERROR", "تعذر إنشاء المنتج.");
  }
}
