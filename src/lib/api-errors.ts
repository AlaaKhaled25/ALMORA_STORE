import { NextResponse } from "next/server";

// Standard API error format from the PRD:
// { "error": { "code": "...", "message": "...", "details": [] } }
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "INTERNAL_ERROR";

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

// Build a JSON error response with the correct HTTP status.
export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details: ApiErrorDetail[] = [],
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}
