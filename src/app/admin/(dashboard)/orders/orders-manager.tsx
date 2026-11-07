"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { piastresToEgp } from "@/lib/money";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import type { AdminOrderListItem, OrderStatus } from "@/lib/types";

const PAGE_SIZE = 10;

const fieldClass =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

async function readErrorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  const details = data?.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map((detail: { message?: string }) => detail.message)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }

  return data?.error?.message ?? "حدث خطأ غير متوقع.";
}

class UnauthorizedError extends Error {}

async function fetchOrders(): Promise<AdminOrderListItem[]> {
  const response = await fetch("/api/admin/orders", { cache: "no-store" });

  if (response.status === 401) throw new UnauthorizedError("Unauthorized");
  if (!response.ok) throw new Error(await readErrorMessage(response));

  const data = await response.json();
  return data.orders ?? [];
}

function formatDate(millis: number | null): string {
  if (millis === null) return "غير متاح";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
  }).format(new Date(millis));
}

function dateStartMillis(value: string): number | null {
  if (value === "") return null;
  const millis = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(millis) ? millis : null;
}

function dateEndMillis(value: string): number | null {
  if (value === "") return null;
  const millis = new Date(`${value}T23:59:59.999`).getTime();
  return Number.isFinite(millis) ? millis : null;
}

function statusBadgeClass(status: OrderStatus): string {
  if (status === "delivered") {
    return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }
  if (status === "shipped" || status === "processing") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }
  return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
}

export default function OrdersManager() {
  const router = useRouter();

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const reloadData = useCallback(async () => {
    try {
      const orderList = await fetchOrders();
      setOrders(orderList);
      setListError(null);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        router.replace("/admin/login");
        return;
      }
      setListError(
        error instanceof Error ? error.message : "تعذر تحميل الطلبات.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    // setState happens in the promise callbacks, after the request starts.
    fetchOrders()
      .then((orderList) => {
        if (cancelled) return;
        setOrders(orderList);
        setListError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof UnauthorizedError) {
          router.replace("/admin/login");
          return;
        }
        setListError(
          error instanceof Error ? error.message : "تعذر تحميل الطلبات.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const searchText = search.trim().toLowerCase();
  const fromMillis = dateStartMillis(fromDate);
  const toMillis = dateEndMillis(toDate);

  // Filtering and pagination are in code, so Firestore needs no index.
  const filteredOrders = orders.filter((order) => {
    if (
      statusFilter !== "all" &&
      order.orderStatus !== statusFilter
    ) {
      return false;
    }

    if (
      searchText !== "" &&
      !order.orderNumber.toLowerCase().includes(searchText)
    ) {
      return false;
    }

    if (fromMillis !== null) {
      if (order.createdAt === null || order.createdAt < fromMillis) {
        return false;
      }
    }

    if (toMillis !== null) {
      if (order.createdAt === null || order.createdAt > toMillis) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">بحث برقم الطلب</span>
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="ORD-XXXXXXXX"
            dir="ltr"
            className={`${fieldClass} text-start`}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">الحالة</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | OrderStatus);
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="all">كل الحالات</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">من تاريخ</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">إلى تاريخ</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          />
        </label>

        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          مسح التصفية
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          جارٍ تحميل الطلبات...
        </p>
      ) : listError ? (
        <div className="space-y-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <p role="alert">{listError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void reloadData();
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 font-medium dark:border-red-800"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          لا توجد طلبات بعد.
        </p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          لا توجد طلبات مطابقة للتصفية.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/15">
                  <th className="p-2 font-semibold">رقم الطلب</th>
                  <th className="p-2 font-semibold">العميل</th>
                  <th className="p-2 font-semibold">الهاتف</th>
                  <th className="p-2 font-semibold">الإجمالي</th>
                  <th className="p-2 font-semibold">حالة الطلب</th>
                  <th className="p-2 font-semibold">حالة الدفع</th>
                  <th className="p-2 font-semibold">تاريخ الإنشاء</th>
                  <th className="p-2 font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-black/5 last:border-0 dark:border-white/10"
                  >
                    <td className="p-2 font-medium" dir="ltr">
                      {order.orderNumber}
                    </td>
                    <td className="p-2">{order.recipientName}</td>
                    <td className="p-2" dir="ltr">
                      {order.recipientPhone}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {piastresToEgp(order.totalAmount)} ج.م
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(order.orderStatus)}`}
                      >
                        {ORDER_STATUS_LABELS[order.orderStatus]}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          order.paymentStatus === "paid"
                            ? "rounded-full bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }
                      >
                        {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              صفحة {currentPage} من {totalPages} — {filteredOrders.length} طلب
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg border border-black/10 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/15"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-black/10 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/15"
              >
                التالي
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
