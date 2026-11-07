import type { Metadata } from "next";
import Link from "next/link";
import OrderDetailsView from "./order-details-view";

export const metadata: Metadata = {
  title: "تفاصيل الطلب — متجري",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← العودة إلى الطلبات
        </Link>
        <h1 className="mt-2 text-2xl font-bold">تفاصيل الطلب</h1>
      </div>
      <OrderDetailsView orderId={id} />
    </main>
  );
}
