import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/session";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export async function POST(request: Request) {
  let idToken: unknown;

  try {
    const body = await request.json();
    idToken = body?.idToken;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
        },
      },
      { status: 400 },
    );
  }

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "idToken is required.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "This account is not allowed to access the dashboard.",
          },
        },
        { status: 403 },
      );
    }

    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Failed to create admin session:", error);
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TOKEN",
          message: "Could not verify the login token.",
        },
      },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
