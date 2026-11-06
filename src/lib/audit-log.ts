import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AdminSession } from "@/lib/session";

type AuditLogInput = {
  actor: AdminSession;
  action: string; // e.g. "product.create"
  entityType: string; // e.g. "product"
  entityId: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
};

// Write one audit record for an important admin action.
// Do not call this for every small request; only meaningful changes.
export async function writeAuditLog(input: AuditLogInput): Promise<string> {
  const doc = await getAdminDb().collection("auditLogs").add({
    actorUid: input.actor.uid,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeData: input.beforeData ?? null,
    afterData: input.afterData ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return doc.id;
}
