// Log only non-secret fields from an error: code and message.
// Never log raw errors, tokens, keys, passwords, or env values.
export function logError(context: string, error: unknown): void {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "unknown";
  const message =
    error instanceof Error ? error.message : "unknown error";

  console.error(`[${context}] code=${code} message=${message}`);
}
