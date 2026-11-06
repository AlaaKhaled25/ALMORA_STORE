let alreadyLogged = false;

// Startup check: report PRESENT/MISSING only. Never log the values.
export function logEnvPresence(): void {
  if (alreadyLogged) return;
  alreadyLogged = true;

  const names = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "ADMIN_EMAILS",
  ];

  for (const name of names) {
    console.log(
      `[env] ${name}: ${process.env[name] ? "PRESENT" : "MISSING"}`,
    );
  }
}
