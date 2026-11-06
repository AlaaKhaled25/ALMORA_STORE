import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";
import { logError } from "@/lib/log-error";
import { SESSION_COOKIE } from "@/lib/constants";

export type AdminSession = {
  uid: string;
  email: string | null;
};

// Only emails listed in ADMIN_EMAILS may access the dashboard.
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

// Verify the session cookie with Firebase and check the admin allowlist.
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );
    if (!isAdminEmail(decoded.email)) return null;
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch (error) {
    // Invalid or expired cookie is normal; log only code + message.
    logError("session.verifySessionCookie", error);
    return null;
  }
}
