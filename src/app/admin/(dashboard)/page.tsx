import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { piastresToEgp } from "@/lib/money";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import { getAdminSession } from "@/lib/session";

export const instant = false;

export const metadata: Metadata = {
  title: "لوحة التحكم — متجري",
};

const cardClass =
  "rounded-2xl border border-black/10 p-5 dark:border-white/15";

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMoney(piastres: number): string {
  return `${piastresToEgp(piastres)} ج.م`;
}

function formatDate(millis: number | null): string {
  if (millis === null) return "غير معروف";
  return dateFormatter.format(new Date(millis));
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className={cardClass}>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function AdminPage() {
  // The dashboard shows live totals, so it must render on every request.
  await connection();

  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getDashboardData();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ملخص سريع للطلبات والمخزون في متجرك.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="إجمالي الطلبات" value={data.totalOrders} />
        <SummaryCard
          label="طلبات اليوم"
          value={data.todayOrders}
          hint="بتوقيت القاهرة"
        />
        <SummaryCard label="المنتجات النشطة" value={data.activeProducts} />
        <SummaryCard
          label="الإيرادات المحصّلة"
          value={formatMoney(data.collectedRevenue)}
        />
        <SummaryCard
          label="إيرادات متوقعة"
          value={formatMoney(data.expectedRevenue)}
        />
        <SummaryCard
          label="مخزون منخفض"
          value={data.lowStockCount}
          hint="منتجات نشطة، 5 أو أقل"
        />
      </section>

      <section className="rounded-2xl border border-black/10 bg-black/[.03] p-4 text-sm leading-7 dark:border-white/15 dark:bg-white/[.05]">
        <h2 className="font-bold">تعريف الإيرادات</h2>
        <p>
          <strong>الإيرادات المحصّلة:</strong> مجموع إجمالي الطلبات المدفوعة
          وغير الملغاة.
        </p>
        <p>
          <strong>إيرادات متوقعة:</strong> مجموع إجمالي الطلبات غير المدفوعة
          التي حالتها: قيد الانتظار، مؤكد، قيد التجهيز، أو تم الشحن.
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          الطلبات الملغاة لا تُحسب في أي إيراد.
        </p>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">عدد الطلبات حسب الحالة</h2>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            عرض كل الطلبات
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ORDER_STATUSES.map((status) => (
            <div
              key={status}
              className="rounded-xl border border-black/10 p-3 dark:border-white/15"
            >
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {ORDER_STATUS_LABELS[status]}
              </p>
              <p className="mt-1 text-xl font-bold">
                {data.statusCounts[status]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">المنتجات منخفضة المخزون</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              منتجات نشطة مخزونها 5 أو أقل.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            عرض كل المنتجات
          </Link>
        </div>

        {data.lowStockProducts.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            لا توجد منتجات نشطة بمخزون منخفض.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-black/10 dark:divide-white/15">
            {data.lowStockProducts.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium">{product.name}</span>
                <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">
                  متبقي {product.stockQuantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">أحدث 10 طلبات</h2>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            عرض كل الطلبات
          </Link>
        </div>

        {data.recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            لا توجد طلبات بعد.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-black/10 dark:divide-white/15">
            {data.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              >
                <div className="min-w-0">
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {order.recipientName} · {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span>{formatMoney(order.totalAmount)}</span>
                  <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
                    {ORDER_STATUS_LABELS[order.orderStatus]}
                  </span>
                  <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
