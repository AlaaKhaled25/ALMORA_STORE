import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { getAdminSession, type AdminSession } from "@/lib/session";

type RequireAdminResult =
  | { session: AdminSession; response: null }
  | { session: null; response: NextResponse };

// Reuse the Phase 1 session check. Use this at the start of every admin API route:
//   const { session, response } = await requireAdmin();
//   if (!session) return response;
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await getAdminSession();

  if (!session) {
    return {
      session: null,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "You must be logged in as an admin.",
      ),
    };
  }

  return { session, response: null };
}
