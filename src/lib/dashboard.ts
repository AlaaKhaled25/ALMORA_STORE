import { connection } from "next/server";
import { listAdminOrders } from "@/lib/admin-orders";
import { getAdminDb } from "@/lib/firebase-admin";
import { ORDER_STATUSES } from "@/lib/order-status";
import { PRODUCTS_COLLECTION } from "@/lib/products";
import type { AdminOrderListItem, OrderStatus } from "@/lib/types";

export type LowStockProduct = {
  id: string;
  name: string;
  stockQuantity: number;
};

export type DashboardData = {
  totalOrders: number;
  todayOrders: number;
  statusCounts: Record<OrderStatus, number>;
  activeProducts: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
  recentOrders: AdminOrderListItem[];
  collectedRevenue: number;
  expectedRevenue: number;
};

// Today means the current calendar day in Egypt, not the server's timezone.
const cairoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function cairoDateKey(millis: number | null): string | null {
  if (millis === null) return null;
  return cairoDateFormatter.format(new Date(millis));
}

// Small-store dashboard: read everything, then calculate in code.
// No composite indexes are needed.
export async function getDashboardData(): Promise<DashboardData> {
  // The dashboard uses today's date, so render it on demand.
  await connection();

  const [orders, productsSnapshot] = await Promise.all([
    listAdminOrders(),
    getAdminDb().collection(PRODUCTS_COLLECTION).get(),
  ]);

  // Calling format() with no argument uses the current date/time.
  const todayKey = cairoDateFormatter.format();
  const statusCounts = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  let todayOrders = 0;
  let collectedRevenue = 0;
  let expectedRevenue = 0;

  for (const order of orders) {
    statusCounts[order.orderStatus] += 1;

    if (cairoDateKey(order.createdAt) === todayKey) {
      todayOrders += 1;
    }

    // Cancelled orders never count as revenue.
    if (order.orderStatus === "cancelled") continue;

    if (order.paymentStatus === "paid") {
      collectedRevenue += order.totalAmount;
      continue;
    }

    // Unpaid orders that are still moving through the workflow.
    if (
      order.orderStatus === "pending" ||
      order.orderStatus === "confirmed" ||
      order.orderStatus === "processing" ||
      order.orderStatus === "shipped"
    ) {
      expectedRevenue += order.totalAmount;
    }
  }

  let activeProducts = 0;
  const lowStockProducts: LowStockProduct[] = [];

  for (const doc of productsSnapshot.docs) {
    const data = doc.data();
    const isActive = data.status !== "archived";
    if (!isActive) continue;

    activeProducts += 1;

    const stockQuantity = Number(data.stockQuantity ?? 0);
    if (Number.isFinite(stockQuantity) && stockQuantity <= 5) {
      lowStockProducts.push({
        id: doc.id,
        name: String(data.name ?? ""),
        stockQuantity: Math.max(0, Math.trunc(stockQuantity)),
      });
    }
  }

  // Lowest stock first. The dashboard only shows a short list.
  lowStockProducts.sort(
    (a, b) =>
      a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name, "ar"),
  );

  return {
    totalOrders: orders.length,
    todayOrders,
    statusCounts,
    activeProducts,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 5),
    recentOrders: orders.slice(0, 10),
    collectedRevenue,
    expectedRevenue,
  };
}
