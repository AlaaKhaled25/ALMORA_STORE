import { logEnvPresence } from "@/lib/env-status";

// Runs once when the server starts. Logs env var presence (never values).
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  logEnvPresence();
}
