import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";

// This layout reads the session cookie, so it must not be prerendered.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <>{children}</>;
}
