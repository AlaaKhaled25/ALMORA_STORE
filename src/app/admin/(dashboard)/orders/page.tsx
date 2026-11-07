import type { Metadata } from "next";
import OrdersManager from "./orders-manager";

export const metadata: Metadata = {
  title: "الطلبات — متجري",
};

export default function OrdersPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الطلبات</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          متابعة الطلبات وتحديث حالاتها وحالة الدفع.
        </p>
      </div>
      <OrdersManager />
    </main>
  );
}
