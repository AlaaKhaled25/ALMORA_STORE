import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: `تسجيل الدخول — ${BRAND.name}`,
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
