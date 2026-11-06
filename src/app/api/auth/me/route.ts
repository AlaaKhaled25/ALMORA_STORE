import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in as an admin.",
        },
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ admin: session });
}
