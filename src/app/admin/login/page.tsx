import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — متجري",
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
