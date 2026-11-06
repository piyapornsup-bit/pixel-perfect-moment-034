import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  Gift,
  HelpCircle,
  History,
  Image as ImageIcon,
  MapPin,
  Minus,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LoginRequired,
  Pill,
  PrimaryButton,
  ProductImage,
  SecondaryButton,
  type Tone,
} from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import type { Order, OrderStatus, RefundRequest, RequestItem, RequestStatus, RequestType } from "@/lib/data/types";
import {
  baht,
  calculateVat,
  formatThaiDate,
  formatTimeRemaining,
  isOrderExpired,
  pointsEarned,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "คำสั่งซื้อของฉัน — ร้านรุ่งอรุณ" },
      { name: "description", content: "ติดตามสถานะคำสั่งซื้อ การจัดส่ง ชำระเงิน และขอยกเลิกหรือคืนสินค้าร้านรุ่งอรุณ" },
      { property: "og:title", content: "คำสั่งซื้อของฉัน — ร้านรุ่งอรุณ" },
      { property: "og:description", content: "ติดตามสถานะคำสั่งซื้อและขอยกเลิกหรือคืนสินค้า" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

export const statusTone: Record<OrderStatus, Tone> = {
  รอชำระ: "warning",
  รอตรวจสอบการชำระ: "warning",
  ชำระแล้ว: "success",
  กำลังเตรียม: "primary",
  จัดส่งแล้ว: "primary",
  ส่งสำเร็จ: "success",
  ยกเลิก: "danger",
  คืนสินค้า: "danger",
  หมดเวลา: "muted",
};

export const requestStatusTone: Record<RequestStatus, Tone> = {
  รอพิจารณา: "warning",
  อนุมัติ: "primary",
  ไม่อนุมัติ: "danger",
  รับสินค้าคืนแล้ว: "primary",
  คืนเงินแล้ว: "success",
};

// 6 แท็บตามข้อกำหนด: ทั้งหมด | รอชำระ | กำลังดำเนินการ | จัดส่งแล้ว | สำเร็จ | ยกเลิก/คืน
type FilterTab = "all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled";

const tabs: { id: FilterTab; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "pending", label: "รอชำระ" },
  { id: "processing", label: "กำลังดำเนินการ" },
  { id: "shipped", label: "จัดส่งแล้ว" },
  { id: "delivered", label: "สำเร็จ" },
  { id: "cancelled", label: "ยกเลิก/คืน" },
];

// 6 ลำดับไทม์ไลน์ตามข้อกำหนด
const TIMELINE_STEPS: OrderStatus[] = [
  "รอชำระ",
  "รอตรวจสอบการชำระ",
  "ชำระแล้ว",
  "กำลังเตรียม",
  "จัดส่งแล้ว",
  "ส่งสำเร็จ",
];

// Live 24-hr payment countdown timer component
function LiveCountdown({ createdAt }: { createdAt: string }) {
  const [rem, setRem] = useState(() => formatTimeRemaining(createdAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setRem(formatTimeRemaining(createdAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  if (rem.expired) {
    return <span className="font-bold text-destructive">หมดเวลาแล้ว</span>;
  }

  return (
    <span className="font-mono font-bold text-warning">
      {rem.hours} ชม. {rem.minutes} นาที
    </span>
  );
}

function OrdersPage() {
  const {
    member,
    refreshMember,
    setReceiptModalOrder,
    confirmPaymentAndAwardPoints,
    uploadSlip,
    rejectPayment,
    markAsShipped,
    confirmDelivery,
    createRefundRequest,
    reviewRefundRequest,
    markRefundReceived,
    markRefundPaid,
    setNotificationOpen,
  } = useStore();
  const nav = useNavigate();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Selected Order for Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Payment & Slip Upload Modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [slipChannel, setSlipChannel] = useState("โอนผ่านธนาคารกสิกรไทย");
  const [slipAmount, setSlipAmount] = useState<number>(0);
  const [slipDateTime, setSlipDateTime] = useState<string>("");
  const [slipImage, setSlipImage] = useState<string | null>(null);

  // Developer Simulation Reject Modal
  const [devRejectModalOrder, setDevRejectModalOrder] = useState<Order | null>(null);
  const [devRejectReason, setDevRejectReason] = useState("ยอดเงินในสลิปไม่ตรงตามยอดบิล");

  // Cancellation / Return Request Form Modal State (3.6)
  const [refundFormOrder, setRefundFormOrder] = useState<Order | null>(null);
  const [refundFormType, setRefundFormType] = useState<RequestType>("ยกเลิก");
  const [returnItemsState, setReturnItemsState] = useState<
    { productId: string; productName: string; qty: number; maxQty: number; price: number; unit: string; selected: boolean }[]
  >([]);
  const [refundReason, setRefundReason] = useState("");
  const [refundImage, setRefundImage] = useState<string | null>(null);

  // Request Tracking View Modal State (3.6)
  const [showRequestTracking, setShowRequestTracking] = useState(false);

  // Developer Simulation Note Modal for Request
  const [devRejectReqId, setDevRejectReqId] = useState<string | null>(null);
  const [devReqNote, setDevReqNote] = useState("หลักฐานหรือข้อมูลไม่ตรงตามเงื่อนไขการคืนสินค้า");

  if (!member) {
    return <LoginRequired title="คำสั่งซื้อของฉัน" />;
  }

  const allOrders = member.orders || [];
  const refundRequests = member.refundRequests || [];

  // Filter orders by tab, search query, status, and date range
  const filteredOrders = allOrders.filter((o) => {
    // 1. Tab filter
    if (activeTab === "pending" && o.status !== "รอชำระ") return false;
    if (
      activeTab === "processing" &&
      !["รอตรวจสอบการชำระ", "ชำระแล้ว", "กำลังเตรียม"].includes(o.status)
    )
      return false;
    if (activeTab === "shipped" && o.status !== "จัดส่งแล้ว") return false;
    if (activeTab === "delivered" && o.status !== "ส่งสำเร็จ") return false;
    if (activeTab === "cancelled" && !["ยกเลิก", "คืนสินค้า", "หมดเวลา"].includes(o.status))
      return false;

    // 2. Search query (Order ID or Product names)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchItem = o.items.some((i) => i.productName.toLowerCase().includes(q));
      const matchTracking = o.trackingNumber?.toLowerCase().includes(q);
      if (!matchId && !matchItem && !matchTracking) return false;
    }

    // 3. Status filter
    if (filterStatus !== "all" && o.status !== filterStatus) return false;

    // 4. Date range filter
    if (startDate) {
      const orderDate = new Date(o.createdAt).getTime();
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      if (orderDate < start) return false;
    }
    if (endDate) {
      const orderDate = new Date(o.createdAt).getTime();
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      if (orderDate > end) return false;
    }

    return true;
  });

  const selectedOrder = allOrders.find((o) => o.id === selectedOrderId);
  const unreadNotifications = member.notifications?.filter((n) => !n.read).length || 0;

  // Handlers for Payment Modal
  const handleOpenPaymentModal = (order: Order) => {
    setPaymentModalOrder(order);
    setSlipAmount(order.total);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setSlipDateTime(localIso);
    setSlipImage("/mock-slip-transfer.jpg");
    setSlipChannel(
      order.paymentMethod.includes("พร้อมเพย์") ? "พร้อมเพย์" : "โอนผ่านธนาคารกสิกรไทย"
    );
  };

  const handleSubmitSlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;
    if (!slipImage) {
      toast.error("กรุณาเลือกรูปภาพสลิปชำระเงิน");
      return;
    }
    if (slipAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }

    const ok = uploadSlip(paymentModalOrder.id, {
      slipUrl: slipImage,
      channel: slipChannel,
      amount: slipAmount,
      paidAt: slipDateTime || new Date().toISOString(),
    });

    if (ok) {
      toast.success("อัปโหลดสลิปเรียบร้อยแล้ว สถานะเปลี่ยนเป็น 'รอตรวจสอบการชำระ'");
      setPaymentModalOrder(null);
      setSlipImage(null);
    } else {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleConfirmReceived = (orderId: string) => {
    const ok = confirmDelivery(orderId);
    if (ok) {
      toast.success("ยืนยันการรับสินค้าเรียบร้อยแล้ว สถานะเปลี่ยนเป็น 'ส่งสำเร็จ'");
    }
  };

  // Open Cancel/Return Request Form Modal (3.6)
  const handleOpenRefundModal = (order: Order, type: RequestType) => {
    setRefundFormOrder(order);
    setRefundFormType(type);
    setReturnItemsState(
      order.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        maxQty: i.qty,
        price: i.price,
        unit: i.unit,
        selected: true,
      }))
    );
    setRefundReason(type === "ยกเลิก" ? "สั่งสินค้าผิดรายการ / ต้องการเปลี่ยนที่อยู่" : "สินค้าชำรุดเสียหายหรือไม่ตรงตามที่สั่ง");
    setRefundImage(null);
  };

  // Submit Cancel / Return Request
  const handleSubmitRefundRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundFormOrder) return;

    const chosenItems = returnItemsState.filter((i) => i.selected && i.qty > 0);
    if (chosenItems.length === 0) {
      toast.error("กรุณาเลือกสินค้าและจำนวนที่ต้องการขอคืนอย่างน้อย 1 รายการ");
      return;
    }
    if (!refundReason.trim()) {
      toast.error("กรุณาระบุเหตุผลการขอยกเลิกหรือคืนสินค้า");
      return;
    }

    const req = createRefundRequest({
      orderId: refundFormOrder.id,
      type: refundFormType,
      items: chosenItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        price: i.price,
        unit: i.unit,
      })),
      reason: refundReason.trim(),
      imageUrl: refundImage || undefined,
    });

    if (req) {
      toast.success(`ส่งคำขอ${refundFormType}เรียบร้อยแล้ว (${req.id}) สถานะ 'รอพิจารณา'`);
      setRefundFormOrder(null);
      setSelectedOrderId(null);
      setShowRequestTracking(true);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`คัดลอก ${label} แล้ว: ${text}`);
  };

  const estimatedRefundAmount = returnItemsState
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="flex flex-col gap-4 p-4 pb-16">
      {/* Header with Notification Bell & Tracking Requests Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">คำสั่งซื้อของฉัน</h1>
          <p className="text-xs text-muted-foreground">ติดตามสถานะและประวัติการสั่งซื้อ</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Button to open Request Tracking (3.6) */}
          <button
            type="button"
            onClick={() => setShowRequestTracking(true)}
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-accent/40 bg-accent/10 px-3 text-xs font-bold text-accent-foreground shadow-soft hover:bg-accent/20 transition-colors"
            title="ติดตามคำขอยกเลิก/คืนสินค้า"
          >
            <RotateCcw className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">ติดตามคำขอ</span>
            <span className="rounded-full bg-accent text-accent-foreground px-1.5 py-0.2 text-[10px] font-extrabold">
              {refundRequests.length}
            </span>
          </button>

          {/* Bell Button (ศูนย์แจ้งเตือน) */}
          <button
            type="button"
            onClick={() => setNotificationOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-soft hover:bg-secondary hover:text-primary transition-colors"
            title="ศูนย์แจ้งเตือน"
            aria-label="ศูนย์แจ้งเตือน"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs">
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 6 Tabs: ทั้งหมด | รอชำระ | กำลังดำเนินการ | จัดส่งแล้ว | สำเร็จ | ยกเลิก/คืน */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-soft font-bold"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 text-xs focus-within:border-primary">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่คำสั่งซื้อ, สินค้า, หรือเลขพัสดุ..."
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
              showFilters || filterStatus !== "all" || startDate || endDate
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>ตัวกรอง</span>
          </button>
        </div>

        {/* Extended Filters: Status dropdown & Date range */}
        {showFilters && (
          <div className="mt-2 flex flex-col gap-2.5 border-t border-border/80 pt-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-foreground">กรองตามสถานะ:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="รอชำระ">รอชำระ</option>
                <option value="รอตรวจสอบการชำระ">รอตรวจสอบการชำระ</option>
                <option value="ชำระแล้ว">ชำระแล้ว</option>
                <option value="กำลังเตรียม">กำลังเตรียม</option>
                <option value="จัดส่งแล้ว">จัดส่งแล้ว</option>
                <option value="ส่งสำเร็จ">ส่งสำเร็จ</option>
                <option value="ยกเลิก">ยกเลิก</option>
                <option value="คืนสินค้า">คืนสินค้า</option>
                <option value="หมดเวลา">หมดเวลา</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">ตั้งแต่วันที่:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">ถึงวันที่:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {(filterStatus !== "all" || startDate || endDate || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("all");
                  setStartDate("");
                  setEndDate("");
                  setSearchQuery("");
                }}
                className="flex items-center justify-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
              >
                <RotateCcw className="h-3 w-3" /> ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground shadow-soft">
              <Package className="h-8 w-8" />
            </div>
            <p className="font-bold text-foreground text-base">ไม่พบคำสั่งซื้อที่ค้นหา</p>
            <p className="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหา หรือเลือกแท็บสถานะอื่น</p>
            <Link
              to="/products"
              className="mt-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft hover:bg-primary-strong transition-all"
            >
              เลือกซื้อสินค้า
            </Link>
          </div>
        )}

        {filteredOrders.map((order) => {
          const isPending = order.status === "รอชำระ";
          const isVerifying = order.status === "รอตรวจสอบการชำระ";
          const isShipped = order.status === "จัดส่งแล้ว";
          const isDelivered = order.status === "ส่งสำเร็จ";
          const isExpired = order.status === "หมดเวลา" || (isPending && isOrderExpired(order.createdAt));

          // Check if there is an active refund request for this order
          const existingReq = refundRequests.find((r) => r.orderId === order.id);

          return (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/40 hover:shadow-md"
            >
              {/* Order Card Header */}
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{order.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.id, "เลขที่คำสั่งซื้อ")}
                      className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                      title="คัดลอกเลขที่คำสั่งซื้อ"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{formatThaiDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {existingReq && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      คำขอ{existingReq.type}: {existingReq.status}
                    </span>
                  )}
                  <Pill tone={statusTone[order.status]}>{order.status}</Pill>
                </div>
              </div>

              {/* 24-hr payment countdown timer for pending orders */}
              {isPending && !isExpired && (
                <div className="flex items-center justify-between rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-warning" />
                    เวลาชำระเงินที่เหลือ:
                  </span>
                  <LiveCountdown createdAt={order.createdAt} />
                </div>
              )}

              {/* Rejection Notice if any */}
              {order.rejectReason && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>การชำระเงินไม่ผ่าน: {order.rejectReason}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">กรุณาตรวจสอบและอัปโหลดสลิปใหม่อีกครั้ง</p>
                </div>
              )}

              {/* Items Summary Preview */}
              <div className="flex flex-col gap-1.5 text-xs">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-muted-foreground">
                    <span className="line-clamp-1 flex-1 pr-2">
                      {item.productName} ({item.qty} {item.unit})
                    </span>
                    <span className="font-semibold text-foreground">{baht(item.price * item.qty)}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-[11px] text-muted-foreground">
                    และสินค้าอื่นอีก {order.items.length - 2} รายการ
                  </p>
                )}
              </div>

              {/* Tracking Number badge (คัดลอกได้) */}
              {order.trackingNumber && (
                <div className="flex items-center justify-between rounded-xl bg-secondary/80 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Truck className="h-3.5 w-3.5 text-primary" /> หมายเลขพัสดุ:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-primary">{order.trackingNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.trackingNumber!, "หมายเลขพัสดุ")}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                      title="คัดลอกเลขพัสดุ"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Total & Action Footer */}
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <div>
                  <span className="text-[11px] text-muted-foreground">ยอดรวมทั้งหมด</span>
                  <p className="text-base font-extrabold text-primary">{baht(order.total)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className="flex h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    ดูรายละเอียด
                  </button>

                  {/* Primary context action based on status */}
                  {isPending && !isExpired && (
                    <PrimaryButton
                      onClick={() => handleOpenPaymentModal(order)}
                      className="h-9 px-3 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      ชำระเงิน/แนบสลิป
                    </PrimaryButton>
                  )}

                  {isShipped && (
                    <button
                      type="button"
                      onClick={() => handleConfirmReceived(order.id)}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-success px-3.5 text-xs font-bold text-white shadow-soft hover:bg-success/90 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      ยืนยันการรับสินค้า
                    </button>
                  )}

                  {isVerifying && (
                    <span className="rounded-xl bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
                      รอตรวจสอบสลิป
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAIL MODAL with 6-Step Timeline & Details */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-frame">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="font-bold text-foreground text-sm">รายละเอียดคำสั่งซื้อ</h2>
                  <p className="text-[11px] font-mono text-muted-foreground">{selectedOrder.id}</p>
                </div>
              </div>
              <Pill tone={statusTone[selectedOrder.status]}>{selectedOrder.status}</Pill>
            </div>

            {/* Scrollable Body */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* 6-Step Timeline: รอชำระ → รอตรวจสอบการชำระ → ชำระแล้ว → กำลังเตรียม → จัดส่งแล้ว → ส่งสำเร็จ */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-foreground">ไทม์ไลน์สถานะคำสั่งซื้อ</p>
                  <span className="text-[11px] text-muted-foreground">
                    {formatThaiDate(selectedOrder.createdAt, false)}
                  </span>
                </div>

                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {TIMELINE_STEPS.map((stepName, idx) => {
                    const currentIdx = TIMELINE_STEPS.indexOf(selectedOrder.status);
                    const isDone =
                      selectedOrder.status === "ยกเลิก" || selectedOrder.status === "คืนสินค้า"
                        ? false
                        : currentIdx >= idx;
                    const isCurrent = selectedOrder.status === stepName;

                    return (
                      <div key={idx} className="relative flex items-start gap-3 pl-0.5">
                        <div
                          className={cn(
                            "relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white text-[10px] transition-colors",
                            isCurrent
                              ? "bg-primary ring-4 ring-primary/20"
                              : isDone
                              ? "bg-success"
                              : "bg-muted border border-border text-muted-foreground"
                          )}
                        >
                          {isDone ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
                        </div>

                        <div className="flex-1">
                          <p
                            className={cn(
                              "font-semibold leading-tight",
                              isCurrent
                                ? "text-primary font-bold"
                                : isDone
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {stepName}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {stepName === "รอชำระ" && "สร้างคำสั่งซื้อแล้ว รอชำระเงิน"}
                            {stepName === "รอตรวจสอบการชำระ" &&
                              (selectedOrder.slipUrl
                                ? "อัปโหลดสลิปแล้ว กำลังตรวจสอบ"
                                : "รอผู้ซื้ออัปโหลดสลิป")}
                            {stepName === "ชำระแล้ว" && "ตรวจสอบการชำระเงินเรียบร้อยและออกใบเสร็จ"}
                            {stepName === "กำลังเตรียม" && "ร้านค้ากำลังจัดเตรียมสินค้า"}
                            {stepName === "จัดส่งแล้ว" &&
                              (selectedOrder.trackingNumber
                                ? `พัสดุถูกจัดส่งแล้ว (${selectedOrder.trackingNumber})`
                                : "พัสดุอยู่ระหว่างการจัดส่ง")}
                            {stepName === "ส่งสำเร็จ" && "ลูกค้าได้รับสินค้าเรียบร้อยแล้ว"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery info & Tracking Number (คัดลอกได้) */}
              <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft space-y-2">
                <p className="font-bold text-foreground">ข้อมูลการจัดส่งและพัสดุ</p>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">ช่องทางจัดส่ง:</span>
                  <span className="font-semibold text-foreground">{selectedOrder.shippingMethod}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">สถานะการจัดส่ง:</span>
                  <Pill tone={statusTone[selectedOrder.status]}>{selectedOrder.status}</Pill>
                </div>

                {selectedOrder.trackingNumber && (
                  <div className="flex items-center justify-between rounded-xl bg-secondary/80 p-2.5 text-xs">
                    <span className="text-muted-foreground font-medium">หมายเลขพัสดุ:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary">{selectedOrder.trackingNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOrder.trackingNumber!, "หมายเลขพัสดุ")}
                        className="rounded p-1 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                        title="คัดลอกเลขพัสดุ"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.invoice?.invoiceNo && (
                  <div className="flex justify-between items-center text-xs border-t border-border pt-2">
                    <span className="text-muted-foreground">เลขที่ใบเสร็จ:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedOrder.invoice!.invoiceNo, "เลขที่ใบเสร็จ")}
                      className="flex items-center gap-1 font-mono font-bold text-primary hover:underline"
                    >
                      {selectedOrder.invoice.invoiceNo}
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft">
                <p className="mb-2 font-bold text-foreground">
                  รายการสินค้า ({selectedOrder.items.length} รายการ)
                </p>
                <div className="divide-y divide-border/60">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.qty} {item.unit} × {baht(item.price)}
                        </p>
                      </div>
                      <span className="font-bold text-foreground">{baht(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft space-y-1.5 text-xs">
                <p className="font-bold text-foreground mb-2">สรุปยอดชำระ</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>ยอดรวมสินค้า:</span>
                  <span>{baht(selectedOrder.goodsSubtotal)}</span>
                </div>
                {selectedOrder.discountBaht > 0 && (
                  <div className="flex justify-between text-accent-foreground font-semibold">
                    <span>ส่วนลดแต้มสะสม ({selectedOrder.pointsUsed} แต้ม):</span>
                    <span>-{baht(selectedOrder.discountBaht)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>ค่าจัดส่ง:</span>
                  <span>{selectedOrder.shippingFee === 0 ? "ฟรี" : baht(selectedOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมแล้ว):</span>
                  <span>฿{calculateVat(selectedOrder.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-primary">
                  <span>ยอดชำระสุทธิ:</span>
                  <span>{baht(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Developer simulation controls */}
              <div className="rounded-2xl border border-dashed border-amber-400 bg-amber-50/70 p-3.5 dark:bg-amber-950/20 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>โหมดนักพัฒนา: จำลองผลการตรวจสอบและการจัดส่ง</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  เครื่องมือสำหรับสาธิตสถานะฝั่งร้านค้า
                </p>

                <div className="mt-2.5 flex flex-col gap-1.5">
                  {selectedOrder.status === "รอตรวจสอบการชำระ" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          confirmPaymentAndAwardPoints(selectedOrder.id);
                          toast.success(
                            `จำลองตรวจผ่านสำเร็จ! คำสั่งซื้อ ${selectedOrder.id} ได้รับสถานะ "ชำระแล้ว"`
                          );
                        }}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-success px-3 text-xs font-bold text-white hover:bg-success/90 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        จำลอง: ตรวจสอบสำเร็จ (ไปสถานะ "ชำระแล้ว")
                      </button>

                      <button
                        type="button"
                        onClick={() => setDevRejectModalOrder(selectedOrder)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        จำลอง: ตรวจไม่ผ่าน (ระบุเหตุผลและให้ส่งสลิปใหม่)
                      </button>
                    </>
                  )}

                  {["ชำระแล้ว", "กำลังเตรียม"].includes(selectedOrder.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        const track = `TH${Date.now().toString().slice(-9)}RA`;
                        markAsShipped(selectedOrder.id, track);
                        toast.success(`จำลอง: ปรับเป็นจัดส่งแล้ว! เลขพัสดุ: ${track}`);
                      }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white hover:bg-primary-strong transition-colors"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      จำลอง: สินค้าถูกจัดส่งแล้ว (ออกเลขพัสดุ)
                    </button>
                  )}

                  {selectedOrder.status === "จัดส่งแล้ว" && (
                    <button
                      type="button"
                      onClick={() => {
                        confirmDelivery(selectedOrder.id);
                        toast.success(`จำลอง: ลูกค้ารับพัสดุสำเร็จ!`);
                      }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-success px-3 text-xs font-bold text-white hover:bg-success/90 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      จำลอง: ลูกค้ายืนยันรับพัสดุ (ส่งสำเร็จ)
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons inside details */}
              <div className="flex flex-col gap-2 pt-2">
                {/* View electronic receipt */}
                {selectedOrder.invoice && (
                  <button
                    type="button"
                    onClick={() => setReceiptModalOrder(selectedOrder)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Receipt className="h-4 w-4" />
                    ดูใบเสร็จรับเงินอิเล็กทรอนิกส์
                  </button>
                )}

                {/* Upload slip button if pending */}
                {selectedOrder.status === "รอชำระ" && (
                  <PrimaryButton
                    onClick={() => {
                      setSelectedOrderId(null);
                      handleOpenPaymentModal(selectedOrder);
                    }}
                    className="h-11 text-xs"
                  >
                    <Upload className="h-4 w-4" />
                    ชำระเงินและอัปโหลดสลิป
                  </PrimaryButton>
                )}

                {/* Confirm delivery button if shipped */}
                {selectedOrder.status === "จัดส่งแล้ว" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleConfirmReceived(selectedOrder.id);
                      setSelectedOrderId(null);
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success text-xs font-bold text-white hover:bg-success/90 shadow-soft transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    ยืนยันการรับสินค้า
                  </button>
                )}

                {/* ปุ่ม "ขอยกเลิก" (ก่อนสถานะ "จัดส่งแล้ว") - ข้อ 3.6 */}
                {["รอชำระ", "รอตรวจสอบการชำระ", "ชำระแล้ว", "กำลังเตรียม"].includes(selectedOrder.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(null);
                      handleOpenRefundModal(selectedOrder, "ยกเลิก");
                    }}
                    className="h-10 w-full rounded-2xl border border-destructive/40 bg-destructive/5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    ขอยกเลิกคำสั่งซื้อ
                  </button>
                )}

                {/* ปุ่ม "ขอคืนสินค้า" (หลังสถานะ "ส่งสำเร็จ") - ข้อ 3.6 */}
                {selectedOrder.status === "ส่งสำเร็จ" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(null);
                      handleOpenRefundModal(selectedOrder, "คืนสินค้า");
                    }}
                    className="h-10 w-full rounded-2xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    ขอคืนสินค้าหรือเปลี่ยนสินค้า
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-3">
              <SecondaryButton onClick={() => setSelectedOrderId(null)} className="h-10 text-xs">
                ปิดหน้าต่าง
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.6 CANCELLATION / RETURN REQUEST FORM MODAL (ฟอร์มขอยกเลิก / ขอคืนสินค้า) */}
      {/* ========================================================================= */}
      {refundFormOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card shadow-frame">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  {refundFormType === "ยกเลิก" ? "ขอยกเลิกคำสั่งซื้อ" : "ขอคืนสินค้า"}
                </h3>
                <p className="text-[11px] font-mono text-muted-foreground">{refundFormOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefundFormOrder(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRefundRequest} className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="flex rounded-xl border border-border bg-secondary/40 p-1">
                <button
                  type="button"
                  onClick={() => setRefundFormType("ยกเลิก")}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all",
                    refundFormType === "ยกเลิก" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  )}
                >
                  ขอยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => setRefundFormType("คืนสินค้า")}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all",
                    refundFormType === "คืนสินค้า" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  )}
                >
                  ขอคืนสินค้า
                </button>
              </div>

              {/* เลือกสินค้าและจำนวนที่ขอคืน */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">เลือกสินค้าและจำนวนที่ขอคืน *</span>
                  <span className="text-[11px] text-muted-foreground">เลือกสินค้าที่ต้องการ</span>
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card p-2.5">
                  {returnItemsState.map((item, idx) => (
                    <div key={item.productId} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setReturnItemsState((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, selected: checked } : it))
                          );
                        }}
                        className="h-4 w-4 rounded text-primary focus:ring-primary"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1 font-semibold text-foreground text-xs">{item.productName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {baht(item.price)} / {item.unit}
                        </p>
                      </div>

                      {/* Stepper for quantity */}
                      {item.selected && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnItemsState((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it
                                )
                              );
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-xs">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setReturnItemsState((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, qty: Math.min(it.maxQty, it.qty + 1) } : it
                                )
                              );
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center rounded-xl bg-secondary/60 px-3 py-2 text-xs font-semibold">
                  <span className="text-muted-foreground">ยอดเงินคืนโดยประมาณ:</span>
                  <span className="font-extrabold text-primary text-sm">{baht(estimatedRefundAmount)}</span>
                </div>
              </div>

              {/* เหตุผลการขอ */}
              <div className="space-y-1.5">
                <span className="font-bold text-foreground">เหตุผลการขอ *</span>
                <div className="flex flex-wrap gap-1.5">
                  {(refundFormType === "ยกเลิก"
                    ? ["สั่งสินค้าผิดรายการ", "ต้องการเปลี่ยนที่อยู่", "ไม่สะดวกรับสินค้าแล้ว", "สั่งสินค้าซ้ำซ้อน"]
                    : ["สินค้าชำรุดเสียหาย", "สินค้าไม่ตรงตามที่สั่ง", "ได้รับสินค้าไม่ครบ", "สินค้าหมดอายุ/ใกล้หมดอายุ"]
                  ).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRefundReason(r)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        refundReason === r
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-secondary/50 text-foreground hover:bg-secondary"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="ระบุรายละเอียดเหตุผลเพิ่มเติม..."
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              {/* รูปภาพประกอบ (ไม่บังคับ) */}
              <div className="space-y-1.5">
                <span className="font-bold text-foreground">รูปภาพประกอบ (ไม่บังคับ)</span>
                <div
                  onClick={() => setRefundImage("/mock-return-proof.jpg")}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-4 text-center transition-colors",
                    refundImage ? "border-success bg-success/10 text-success" : "border-border hover:border-primary"
                  )}
                >
                  {refundImage ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-success" />
                      <p className="font-bold text-xs">แนบรูปภาพหลักฐานแล้ว</p>
                      <span className="text-[10px] underline">คลิกเพื่อเปลี่ยนรูป</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <p className="font-semibold text-foreground text-xs">แตะเพื่อแนบรูปภาพสินค้า/ปัญหา</p>
                      <p className="text-[10px] text-muted-foreground">รูปสินค้าที่มีปัญหาหรือสภาพกล่องพัสดุ</p>
                    </>
                  )}
                </div>
              </div>

              <PrimaryButton type="submit" className="mt-2">
                ส่งคำขอ{refundFormType}
              </PrimaryButton>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.6 REQUEST TRACKING MODAL (หน้าติดตามคำขอยกเลิก / คืนสินค้า) */}
      {/* ========================================================================= */}
      {showRequestTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-frame">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-bold text-foreground text-sm">ติดตามคำขอยกเลิกและคืนสินค้า</h3>
                  <p className="text-[11px] text-muted-foreground">{refundRequests.length} รายการคำขอ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestTracking(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {refundRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                  <RotateCcw className="h-10 w-10 stroke-1" />
                  <p className="font-semibold text-foreground text-sm">ยังไม่มีคำขอยกเลิกหรือคืนสินค้า</p>
                  <p className="text-xs">สามารถยื่นคำขอได้จากหน้ารายละเอียดคำสั่งซื้อ</p>
                </div>
              ) : (
                refundRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">{req.id}</span>
                          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                            {req.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          อ้างอิงคำสั่งซื้อ: {req.orderId} · {formatThaiDate(req.createdAt)}
                        </p>
                      </div>
                      <Pill tone={requestStatusTone[req.status]}>{req.status}</Pill>
                    </div>

                    {/* Refund Amount & Schedule (จำนวนเงินคืนและกำหนดการคืนเงิน) */}
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-2.5">
                      <div>
                        <span className="text-[11px] text-muted-foreground">จำนวนเงินคืน:</span>
                        <p className="text-base font-extrabold text-primary">{baht(req.refundAmount)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground">กำหนดการคืนเงิน:</span>
                        <p className="font-semibold text-foreground">{req.refundSchedule}</p>
                      </div>
                    </div>

                    {/* Items requested */}
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground mb-1">สินค้าที่ขอคืน:</p>
                      <div className="space-y-1">
                        {req.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-foreground">
                              • {it.productName} ({it.qty} {it.unit})
                            </span>
                            <span className="font-semibold text-foreground">{baht(it.price * it.qty)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground border-t border-border pt-1.5">
                      <strong>เหตุผล:</strong> {req.reason}
                    </p>

                    {req.reviewNote && (
                      <p className="text-[11px] text-destructive bg-destructive/10 p-2 rounded-xl">
                        <strong>บันทึกจากเจ้าหน้าที่:</strong> {req.reviewNote}
                      </p>
                    )}

                    {/* Developer Simulation Controls for Request Status (ฝั่งพนักงานให้ทำปุ่มจำลองในโหมดนักพัฒนา) */}
                    <div className="mt-1 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 p-2.5 text-[11px] space-y-1.5">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-600" /> จำลองผลพิจารณาของพนักงาน:
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        {req.status === "รอพิจารณา" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                reviewRefundRequest(req.id, "approve");
                                toast.success(`จำลอง: อนุมัติคำขอ ${req.id} แล้ว! สถานะคำสั่งซื้อเปลี่ยนเป็น '${req.type}'`);
                              }}
                              className="rounded-lg bg-success px-2 py-1 font-bold text-white hover:bg-success/90 transition-colors"
                            >
                              ✓ จำลอง: อนุมัติคำขอ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDevRejectReqId(req.id);
                              }}
                              className="rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1 font-bold text-destructive hover:bg-destructive/20 transition-colors"
                            >
                              ✕ จำลอง: ไม่อนุมัติ
                            </button>
                          </>
                        )}

                        {req.status === "อนุมัติ" && req.type === "คืนสินค้า" && (
                          <button
                            type="button"
                            onClick={() => {
                              markRefundReceived(req.id);
                              toast.success(`จำลอง: บันทึกรับสินค้าคืนเรียบร้อย (${req.id})`);
                            }}
                            className="rounded-lg bg-primary px-2 py-1 font-bold text-white hover:bg-primary-strong transition-colors"
                          >
                            📦 จำลอง: รับสินค้าคืนแล้ว
                          </button>
                        )}

                        {["อนุมัติ", "รับสินค้าคืนแล้ว"].includes(req.status) && (
                          <button
                            type="button"
                            onClick={() => {
                              markRefundPaid(req.id);
                              toast.success(`จำลอง: โอนเงินคืนสำเร็จ (${req.id})`);
                            }}
                            className="rounded-lg bg-success px-2 py-1 font-bold text-white hover:bg-success/90 transition-colors"
                          >
                            💰 จำลอง: คืนเงินแล้ว
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-3">
              <SecondaryButton onClick={() => setShowRequestTracking(false)} className="h-10 text-xs">
                ปิด
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* DEVELOPER SIMULATION REJECT REQUEST MODAL */}
      {devRejectReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card p-5 shadow-frame text-xs">
            <h3 className="font-bold text-foreground text-sm">จำลองผล: ไม่อนุมัติคำขอ</h3>
            <p className="mt-1 text-muted-foreground">ระบุเหตุผลการปฏิเสธคำขอเพื่อแจ้งให้ลูกค้าทราบ</p>

            <div className="mt-3 flex flex-col gap-2">
              {[
                "หลักฐานหรือข้อมูลไม่ตรงตามเงื่อนไขการคืนสินค้า",
                "สินค้าถูกเปิดใช้งานแล้วหรือไม่อยู่ในสภาพเดิม",
                "พ้นกำหนดระยะเวลาการขอคืนสินค้า 7 วัน",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDevReqNote(reason)}
                  className={cn(
                    "rounded-xl border p-2 text-left text-xs font-semibold transition-all",
                    devReqNote === reason
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {reason}
                </button>
              ))}

              <input
                value={devReqNote}
                onChange={(e) => setDevReqNote(e.target.value)}
                placeholder="ระบุเหตุผลอื่น..."
                className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <SecondaryButton onClick={() => setDevRejectReqId(null)} className="flex-1 text-xs">
                ยกเลิก
              </SecondaryButton>
              <button
                type="button"
                onClick={() => {
                  reviewRefundRequest(devRejectReqId, "reject", devReqNote);
                  setDevRejectReqId(null);
                  toast.error(`จำลอง: ปฏิเสธคำขอเรียบร้อยแล้ว แจ้งเตือนลูกค้าแล้ว`);
                }}
                className="flex-1 rounded-2xl bg-destructive font-bold text-white text-xs hover:bg-destructive/90 transition-colors"
              >
                ยืนยันผลไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAYMENT & SLIP UPLOAD MODAL (ชำระเงิน 3.3) */}
      {/* ========================================================================= */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card shadow-frame">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-bold text-foreground text-sm">ชำระเงินและแจ้งโอน</h3>
                <p className="text-[11px] font-mono text-muted-foreground">{paymentModalOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmitSlip} className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {/* Total & Countdown */}
              <div className="rounded-2xl bg-secondary/70 p-3.5 text-center">
                <p className="text-muted-foreground">ยอดเงินที่ต้องชำระ</p>
                <p className="mt-0.5 text-2xl font-black text-primary">{baht(paymentModalOrder.total)}</p>
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-warning-foreground font-semibold">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  <span>เหลือเวลาชำระเงิน: </span>
                  <LiveCountdown createdAt={paymentModalOrder.createdAt} />
                </div>
              </div>

              {/* Bank Account / PromptPay details with Copy button */}
              <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
                <p className="font-bold text-foreground mb-2">ช่องทางรับชำระเงิน</p>

                {paymentModalOrder.paymentMethod.includes("พร้อมเพย์") ? (
                  <div className="flex flex-col items-center py-2 text-center">
                    <p className="text-xs text-muted-foreground">สแกน QR Code พร้อมเพย์</p>
                    <div className="my-2 rounded-xl border-2 border-border p-2 bg-white">
                      <CreditCard className="h-28 w-28 text-primary mx-auto" />
                    </div>
                    <p className="text-xs font-bold text-foreground">รุ่งอรุณ มินิมาร์ท (0105562012345)</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-secondary/50 p-2.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ธนาคาร:</span>
                      <span className="font-semibold">กสิกรไทย (KBANK)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">เลขที่บัญชี:</span>
                      <span className="font-bold text-sm text-primary">012-3-45678-9</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ชื่อบัญชี:</span>
                      <span className="font-semibold">ร้านรุ่งอรุณ มินิมาร์ท</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy("0123456789", "เลขที่บัญชี")}
                      className="mt-1.5 flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      คัดลอกเลขที่บัญชี
                    </button>
                  </div>
                )}
              </div>

              {/* Form: Channel, Amount, Date & Time, Slip Image */}
              <div className="space-y-2.5">
                <p className="font-bold text-foreground">ข้อมูลการโอนเงิน (สลิป)</p>

                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted-foreground">ช่องทางชำระเงินที่โอน:</span>
                  <select
                    value={slipChannel}
                    onChange={(e) => setSlipChannel(e.target.value)}
                    className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="โอนผ่านธนาคารกสิกรไทย">โอนผ่านธนาคารกสิกรไทย (KBANK)</option>
                    <option value="โอนผ่านพร้อมเพย์">โอนผ่านพร้อมเพย์ (PromptPay)</option>
                    <option value="โอนผ่านธนาคารอื่น">โอนผ่านธนาคารอื่น</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted-foreground">จำนวนเงินที่ชำระ (บาท):</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={slipAmount || ""}
                    onChange={(e) => setSlipAmount(parseFloat(e.target.value) || 0)}
                    className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted-foreground">วันที่และเวลาที่ชำระเงิน:</span>
                  <input
                    type="datetime-local"
                    required
                    value={slipDateTime}
                    onChange={(e) => setSlipDateTime(e.target.value)}
                    className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </label>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-muted-foreground">รูปสลิปหลักฐานการโอน:</span>
                  <div
                    onClick={() => setSlipImage("/mock-slip-transfer.jpg")}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-4 text-center transition-colors",
                      slipImage
                        ? "border-success bg-success/10 text-success"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {slipImage ? (
                      <>
                        <CheckCircle2 className="h-8 w-8 text-success" />
                        <p className="font-bold text-xs">เลือกสลิปเรียบร้อยแล้ว</p>
                        <span className="text-[10px] underline">คลิกเพื่อเปลี่ยนรูปสลิป</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="font-semibold text-foreground text-xs">แตะเพื่อเลือกรูปภาพสลิป</p>
                        <p className="text-[10px] text-muted-foreground">รองรับไฟล์ JPG, PNG</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <PrimaryButton type="submit" disabled={!slipImage}>
                  ส่งสลิปชำระเงิน
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVELOPER SIMULATION REJECT MODAL */}
      {devRejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card p-5 shadow-frame text-xs">
            <h3 className="font-bold text-foreground text-sm">จำลองผล: ตรวจสอบไม่ผ่าน</h3>
            <p className="mt-1 text-muted-foreground">
              ระบุเหตุผลการปฏิเสธสลิป เพื่อแจ้งให้ลูกค้าทราบและให้ส่งสลิปใหม่
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {[
                "ยอดเงินในสลิปไม่ตรงตามยอดบิล",
                "รูปภาพสลิปไม่ชัดเจน ไม่สามารถตรวจสอบได้",
                "สลิปการโอนเงินซ้ำซ้อน",
                "เวลาโอนเงินไม่ตรงกับข้อมูลในระบบ",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDevRejectReason(reason)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left text-xs font-semibold transition-all",
                    devRejectReason === reason
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {reason}
                </button>
              ))}

              <input
                value={devRejectReason}
                onChange={(e) => setDevRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลอื่น..."
                className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <SecondaryButton onClick={() => setDevRejectModalOrder(null)} className="flex-1 text-xs">
                ยกเลิก
              </SecondaryButton>
              <button
                type="button"
                onClick={() => {
                  rejectPayment(devRejectModalOrder.id, devRejectReason);
                  setDevRejectModalOrder(null);
                  toast.error(`จำลองตรวจสอบไม่ผ่าน: ${devRejectReason} แจ้งเตือนลูกค้าให้ส่งสลิปใหม่แล้ว`);
                }}
                className="flex-1 rounded-2xl bg-destructive font-bold text-white text-xs hover:bg-destructive/90 transition-colors"
              >
                ยืนยันผลไม่ผ่าน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
