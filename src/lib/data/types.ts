export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  originalPrice?: number;
  promoLabel?: string;
  categoryId: string;
  stock: number;
  description: string;
};

export type NewsPromotionType = "promo" | "news";

export type Promotion = {
  id: string;
  type: NewsPromotionType; // "promo" | "news"
  title: string;
  detail: string;
  discount?: string; // e.g. "ลด 40 บาท", "ซื้อ 3 จ่าย 2", "ลด 15%", "แถมฟรี"
  validUntil?: string; // Thai Buddhist-era display date e.g. 15/12/2569
  validUntilIso?: string; // ISO date for expiry comparison e.g. 2026-12-15T23:59:59
  publishUntilIso?: string; // publication deadline
  productId?: string;
  badge?: string;
};

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line: string;
  isPrimary: boolean;
};

export type OrderStatus =
  | "รอชำระ"
  | "รอตรวจสอบการชำระ"
  | "ชำระแล้ว"
  | "กำลังเตรียม"
  | "จัดส่งแล้ว"
  | "ส่งสำเร็จ"
  | "ยกเลิก"
  | "คืนสินค้า"
  | "หมดเวลา";

export type OrderItem = {
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  price: number;
};

export type InvoiceType = "simplified" | "full";

export type InvoiceData = {
  type: InvoiceType;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  taxId?: string;
  goodsSubtotal: number;
  discount: number;
  shippingFee: number;
  vatAmount: number; // 7% VAT included
  netTotal: number;
};

export type TimelineEvent = {
  title: string;
  time: string;
  done: boolean;
  desc?: string;
};

export type Order = {
  id: string;
  createdAt: string; // ISO
  status: OrderStatus;
  items: OrderItem[];
  goodsSubtotal: number;
  shippingFee: number;
  shippingMethod: string;
  pointsUsed: number;
  discountBaht: number;
  pointsEarned: number;
  total: number;
  addressId: string;
  paymentMethod: string;
  slipUrl?: string;
  slipChannel?: string;
  slipAmount?: number;
  slipPaidAt?: string;
  rejectReason?: string;
  paidAt?: string;
  cancelReason?: string;
  returnReason?: string;
  trackingNumber?: string;
  invoice?: InvoiceData;
  timeline?: TimelineEvent[];
};

export type PointsHistoryItem = {
  id: string;
  date: string;
  points: number; // positive or negative
  type: "earn" | "redeem" | "bonus";
  description: string;
  orderId?: string;
};

export type RequestType = "ยกเลิก" | "คืนสินค้า";
export type RequestStatus =
  | "รอพิจารณา"
  | "อนุมัติ"
  | "ไม่อนุมัติ"
  | "รับสินค้าคืนแล้ว"
  | "คืนเงินแล้ว";

export type RequestItem = {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  unit: string;
};

export type RefundRequest = {
  id: string; // e.g. REQ-2569-0001
  orderId: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string; // ISO
  items: RequestItem[];
  reason: string;
  imageUrl?: string;
  refundAmount: number;
  refundSchedule: string; // e.g. "ภายใน 3-5 วันทำการ"
  reviewedAt?: string;
  reviewNote?: string;
  refundedAt?: string;
};

export type GiftRecord = {
  id: string;
  type: "birthday" | "newyear";
  title: string;
  giftItem: string;
  shippingAddress: string;
  recipient: string;
  phone: string;
  shippedDate: string;
  status: "กำลังจัดส่ง" | "จัดส่งสำเร็จ";
  trackingNumber?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: "gift" | "order" | "promo" | "points";
  orderId?: string;
  status?: OrderStatus;
  trackingNumber?: string;
  giftId?: string;
  giftItem?: string;
  giftAddress?: string;
  giftDate?: string;
  requestId?: string;
  requestStatus?: RequestStatus;
};

export type LoginHistoryItem = {
  id: string;
  timestamp: string;
  device?: string;
};

export type PurchaseRecord = {
  id: string;
  date: string; // ISO
  channel: "ออนไลน์" | "หน้าร้านเคาน์เตอร์";
  total: number;
  pointsEarned: number;
  pointsUsed: number;
  orderId?: string;
  receiptNo?: string;
  description: string;
};

export type Member = {
  id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  points: number;
  addresses: Address[];
  orders: Order[];
  pointsHistory: PointsHistoryItem[];
  notifications: NotificationItem[];
  loginHistory: LoginHistoryItem[];
  purchaseHistory: PurchaseRecord[];
  refundRequests?: RefundRequest[];
  giftHistory?: GiftRecord[];
};

export type PaymentChannel = {
  id: string;
  name: string;
  details: string;
  bankName?: string;
  accountNo?: string;
  promptPayId?: string;
};

export type StoreSettings = {
  shipping: { id: string; name: string; fee: number }[];
  freeShippingMin: number;
  paymentMethods: PaymentChannel[];
  paymentWindowHours: number;
  storeName: string;
  storeTaxId: string;
  storeAddress: string;
  storePhone: string;
};
