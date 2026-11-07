import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AdminSession } from "@/lib/session";

export const AUDIT_LOGS_COLLECTION = "auditLogs";

export type AuditLogInput = {
  actor: AdminSession;
  action: string; // e.g. "order.status_change"
  entityType: string; // e.g. "order"
  entityId: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
};

function buildAuditLogData(input: AuditLogInput) {
  return {
    actorUid: input.actor.uid,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeData: input.beforeData ?? null,
    afterData: input.afterData ?? null,
    createdAt: FieldValue.serverTimestamp(),
  };
}

// Write one audit record for an important admin action.
// Do not call this for every small request; only meaningful changes.
export async function writeAuditLog(input: AuditLogInput): Promise<string> {
  const doc = await getAdminDb()
    .collection(AUDIT_LOGS_COLLECTION)
    .add(buildAuditLogData(input));

  return doc.id;
}

// Use this when the audit record must be atomic with the order change.
export function writeAuditLogInTransaction(
  transaction: Transaction,
  input: AuditLogInput,
): string {
  const ref = getAdminDb().collection(AUDIT_LOGS_COLLECTION).doc();
  transaction.set(ref, buildAuditLogData(input));
  return ref.id;
}
