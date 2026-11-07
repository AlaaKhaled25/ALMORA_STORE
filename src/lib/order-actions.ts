import {
  Timestamp,
  type DocumentReference,
} from "firebase-admin/firestore";
import type { ApiErrorCode, ApiErrorDetail } from "@/lib/api-errors";
import { readOrderItems } from "@/lib/admin-orders";
import { writeAuditLogInTransaction } from "@/lib/audit-log";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  canCancelOrder,
  canCollectPayment,
  getNextOrderStatus,
  isOrderStatus,
  isPaymentStatus,
  ORDER_STATUS_LABELS,
} from "@/lib/order-status";
import {
  ORDERS_COLLECTION,
  ORDER_STATUS_HISTORY_COLLECTION,
} from "@/lib/orders";
import type { AdminSession } from "@/lib/session";
import type { OrderStatus } from "@/lib/types";

export type AdminOrderActionResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: ApiErrorCode;
      message: string;
      details?: ApiErrorDetail[];
    };

function failure(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): AdminOrderActionResult {
  return { ok: false, status, code, message, ...(details ? { details } : {}) };
}

function readCurrentStatus(data: Record<string, unknown>): OrderStatus | null {
  return isOrderStatus(data.orderStatus) ? data.orderStatus : null;
}

// Move one step forward in the status flow.
export async function changeOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor: AdminSession,
  reason?: string,
): Promise<AdminOrderActionResult> {
  const db = getAdminDb();
  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
  const historyRef = db.collection(ORDER_STATUS_HISTORY_COLLECTION);

  return db.runTransaction<AdminOrderActionResult>(async (transaction) => {
    // Re-read inside the transaction so concurrent admins see the latest state.
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      return failure(404, "NOT_FOUND", "الطلب غير موجود.");
    }

    const data = orderDoc.data() ?? {};
    const currentStatus = readCurrentStatus(data);
    if (!currentStatus) {
      return failure(409, "CONFLICT", "حالة الطلب الحالية غير صالحة.");
    }

    const expectedStatus = getNextOrderStatus(currentStatus);
    if (!expectedStatus || expectedStatus !== nextStatus) {
      return failure(
        409,
        "CONFLICT",
        `لا يمكن تغيير حالة الطلب من "${ORDER_STATUS_LABELS[currentStatus]}" إلى "${ORDER_STATUS_LABELS[nextStatus]}".`,
        [{ field: "status", message: "انتقال الحالة غير مسموح." }],
      );
    }

    const trimmedReason = reason?.trim() ?? "";
    const now = Timestamp.now();

    transaction.update(orderRef, {
      orderStatus: nextStatus,
      updatedAt: now,
    });

    transaction.set(historyRef.doc(), {
      orderId,
      orderNumber: String(data.orderNumber ?? orderId),
      previousStatus: currentStatus,
      newStatus: nextStatus,
      changedByUserId: actor.uid,
      changedByUserEmail: actor.email,
      action: "status.change",
      reason: trimmedReason || "تم تحديث حالة الطلب",
      createdAt: now,
    });

    writeAuditLogInTransaction(transaction, {
      actor,
      action: "order.status_change",
      entityType: "order",
      entityId: orderId,
      beforeData: { orderStatus: currentStatus },
      afterData: {
        orderStatus: nextStatus,
        reason: trimmedReason || null,
      },
    });

    return { ok: true };
  });
}

// Cancel and restore stock in one transaction.
// Archived products and inactive categories do not block stock restoration.
export async function cancelOrder(
  orderId: string,
  reason: string,
  actor: AdminSession,
): Promise<AdminOrderActionResult> {
  const trimmedReason = reason.trim();
  if (trimmedReason === "") {
    return failure(400, "VALIDATION_ERROR", "سبب الإلغاء مطلوب.", [
      { field: "reason", message: "اكتب سبب الإلغاء." },
    ]);
  }
  if (trimmedReason.length > 500) {
    return failure(400, "VALIDATION_ERROR", "سبب الإلغاء طويل جدًا.", [
      { field: "reason", message: "الحد الأقصى 500 حرف." },
    ]);
  }

  const db = getAdminDb();
  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
  const productsRef = db.collection("products");
  const historyRef = db.collection(ORDER_STATUS_HISTORY_COLLECTION);

  return db.runTransaction<AdminOrderActionResult>(async (transaction) => {
    // Re-read inside the transaction: a second click sees the cancelled order.
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      return failure(404, "NOT_FOUND", "الطلب غير موجود.");
    }

    const data = orderDoc.data() ?? {};
    const currentStatus = readCurrentStatus(data);
    if (!currentStatus) {
      return failure(409, "CONFLICT", "حالة الطلب الحالية غير صالحة.");
    }

    if (!canCancelOrder(currentStatus)) {
      return failure(
        409,
        "CONFLICT",
        `لا يمكن إلغاء الطلب في حالته الحالية: ${ORDER_STATUS_LABELS[currentStatus]}.`,
        [{ field: "status", message: "إلغاء الطلب غير مسموح في هذه الحالة." }],
      );
    }

    // Extra guard. The status check above already blocks repeated cancellations.
    if (data.stockRestored === true) {
      return failure(
        409,
        "CONFLICT",
        "تمت استعادة مخزون هذا الطلب مسبقًا.",
      );
    }

    // Read all products before any write. Status/category is intentionally ignored.
    const items = readOrderItems(data.items);
    const productDocs: {
      ref: DocumentReference;
      exists: boolean;
      stockQuantity: number;
      quantity: number;
      productId: string;
    }[] = [];

    for (const item of items) {
      const ref = productsRef.doc(item.productId);
      const snapshot = await transaction.get(ref);
      const stock = Number(snapshot.data()?.stockQuantity ?? 0);

      productDocs.push({
        ref,
        exists: snapshot.exists,
        stockQuantity:
          Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0,
        quantity: item.quantity,
        productId: item.productId,
      });
    }

    const now = Timestamp.now();
    const restoredItems: { productId: string; quantity: number }[] = [];

    transaction.update(orderRef, {
      orderStatus: "cancelled",
      stockRestored: true,
      cancellationReason: trimmedReason,
      cancelledAt: now,
      updatedAt: now,
    });

    for (const product of productDocs) {
      if (!product.exists) continue;

      transaction.update(product.ref, {
        stockQuantity: product.stockQuantity + product.quantity,
        updatedAt: now,
      });
      restoredItems.push({
        productId: product.productId,
        quantity: product.quantity,
      });
    }

    transaction.set(historyRef.doc(), {
      orderId,
      orderNumber: String(data.orderNumber ?? orderId),
      previousStatus: currentStatus,
      newStatus: "cancelled",
      changedByUserId: actor.uid,
      changedByUserEmail: actor.email,
      action: "order.cancel",
      reason: trimmedReason,
      createdAt: now,
    });

    writeAuditLogInTransaction(transaction, {
      actor,
      action: "order.cancel",
      entityType: "order",
      entityId: orderId,
      beforeData: {
        orderStatus: currentStatus,
        stockRestored: data.stockRestored === true,
      },
      afterData: {
        orderStatus: "cancelled",
        stockRestored: true,
        reason: trimmedReason,
        restoredItems,
      },
    });

    return { ok: true };
  });
}

// COD collection is separate from delivery status.
export async function collectPayment(
  orderId: string,
  actor: AdminSession,
): Promise<AdminOrderActionResult> {
  const db = getAdminDb();
  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
  const historyRef = db.collection(ORDER_STATUS_HISTORY_COLLECTION);

  return db.runTransaction<AdminOrderActionResult>(async (transaction) => {
    // Re-read inside the transaction so two admins cannot both collect.
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      return failure(404, "NOT_FOUND", "الطلب غير موجود.");
    }

    const data = orderDoc.data() ?? {};
    const currentStatus = readCurrentStatus(data);
    const currentPaymentStatus = isPaymentStatus(data.paymentStatus)
      ? data.paymentStatus
      : null;

    if (!currentStatus || !currentPaymentStatus) {
      return failure(409, "CONFLICT", "حالة الطلب أو الدفع غير صالحة.");
    }

    if (currentStatus === "cancelled") {
      return failure(
        409,
        "CONFLICT",
        "لا يمكن تحصيل مبلغ طلب ملغي.",
      );
    }

    if (currentPaymentStatus === "paid") {
      return failure(409, "CONFLICT", "تم تحصيل المبلغ مسبقًا.");
    }

    if (!canCollectPayment(currentStatus, currentPaymentStatus)) {
      return failure(
        409,
        "CONFLICT",
        "لا يمكن تحصيل المبلغ قبل تسليم الطلب.",
        [{ field: "paymentStatus", message: "الطلب لم يُسلَّم بعد." }],
      );
    }

    const now = Timestamp.now();

    transaction.update(orderRef, {
      paymentStatus: "paid",
      updatedAt: now,
    });

    // Payment-only event: same order status, different payment status.
    transaction.set(historyRef.doc(), {
      orderId,
      orderNumber: String(data.orderNumber ?? orderId),
      previousStatus: currentStatus,
      newStatus: currentStatus,
      changedByUserId: actor.uid,
      changedByUserEmail: actor.email,
      action: "payment.collected",
      paymentStatusBefore: "unpaid",
      paymentStatusAfter: "paid",
      reason: "تم تحصيل المبلغ",
      createdAt: now,
    });

    writeAuditLogInTransaction(transaction, {
      actor,
      action: "order.payment_collected",
      entityType: "order",
      entityId: orderId,
      beforeData: {
        orderStatus: currentStatus,
        paymentStatus: currentPaymentStatus,
      },
      afterData: {
        orderStatus: currentStatus,
        paymentStatus: "paid",
      },
    });

    return { ok: true };
  });
}
