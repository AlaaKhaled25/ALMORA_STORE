import type { Timestamp } from "firebase-admin/firestore";

// Shared Firestore types.
// Money is always an integer number of piastres (1 EGP = 100 piastres).
// Firestore stores dates as Timestamp objects.

export type CategoryStatus = "active" | "inactive";

// Single-level category. Each product will belong to one category.
export type Category = {
  id: string;
  name: string;
  description?: string;
  status: CategoryStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// Shape returned by the categories API (dates as milliseconds, or null).
export type CategoryView = {
  id: string;
  name: string;
  description: string;
  status: CategoryStatus;
  createdAt: number | null;
  updatedAt: number | null;
};

export type ProductStatus = "active" | "archived";

// One Cloudinary image. The first item in the images array is the main image.
export type ProductImage = {
  url: string;
  publicId: string;
};

// A product belongs to exactly one category.
export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number; // piastres
  stockQuantity: number; // never negative
  categoryId: string;
  status: ProductStatus;
  images: ProductImage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
};

// Shape returned by the products API. Price stays in piastres.
export type ProductView = {
  id: string;
  name: string;
  description: string;
  price: number; // piastres
  stockQuantity: number;
  categoryId: string;
  status: ProductStatus;
  images: ProductImage[];
  createdAt: number | null;
  updatedAt: number | null;
};

// Items are stored inside the order document as a snapshot.
export type OrderItem = {
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number; // piastres at order time
  quantity: number;
  lineTotal: number; // unitPriceSnapshot * quantity
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid";

export type Order = {
  id: string;
  orderNumber: string; // public and hard to guess
  recipientName: string;
  recipientPhone: string;
  shippingAddress: {
    city: string; // governorate / city
    addressLine: string;
    notes?: string;
  };
  items: OrderItem[]; // at least one item
  subtotal: number; // piastres
  deliveryFee: number; // piastres
  totalAmount: number; // piastres
  currency: "EGP";
  paymentMethod: "COD";
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  customerNotes?: string;
  stockRestored?: boolean;
  cancellationReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt?: Timestamp;
};

export type OrderHistoryAction =
  | "status.change"
  | "order.cancel"
  | "payment.collected";

// Every order status change gets its own document (never overwritten).
// Payment collection is also recorded here as a payment-only event.
export type OrderStatusHistory = {
  id: string;
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedByUserId: string | null;
  changedByUserEmail?: string | null;
  action?: OrderHistoryAction;
  paymentStatusBefore?: PaymentStatus;
  paymentStatusAfter?: PaymentStatus;
  reason?: string;
  createdAt: Timestamp;
};

// Small counters collection, for example the next order number.
export type Counter = {
  id: string; // e.g. "orders"
  value: number;
};

// Admin order list row. Dates are milliseconds for the UI.
export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  totalAmount: number;
  currency: "EGP";
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: number | null;
};

// One entry in the admin order timeline, including payment events.
export type AdminOrderHistoryEntry = {
  id: string;
  action: OrderHistoryAction | null;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedByUserId: string | null;
  changedByUserEmail: string | null;
  paymentStatusBefore: PaymentStatus | null;
  paymentStatusAfter: PaymentStatus | null;
  reason: string;
  createdAt: number | null;
};

// Full admin order details.
export type AdminOrderDetails = AdminOrderListItem & {
  shippingAddress: {
    city: string;
    addressLine: string;
    notes: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  paymentMethod: "COD";
  stockRestored: boolean;
  cancellationReason: string;
  updatedAt: number | null;
  cancelledAt: number | null;
  history: AdminOrderHistoryEntry[];
};
