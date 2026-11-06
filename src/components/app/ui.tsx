import { Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import * as Icons from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Download,
  Eye,
  Gift,
  HelpCircle,
  Home,
  LayoutGrid,
  Lock,
  MapPin,
  Package,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Order, OrderStatus, Product } from "@/lib/data/types";
import { baht, calculateVat, formatThaiDate } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-xl font-bold tracking-tight text-primary", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sunrise className="h-5 w-5" />
      </span>
      <span>รุ่งอรุณ</span>
      <span className="text-xs font-normal text-muted-foreground">มินิมาร์ท</span>
    </span>
  );
}

export function CatIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Package;
  return <IconComponent className={className} />;
}

export type Tone = "primary" | "accent" | "success" | "danger" | "warning" | "muted";

const tones: Record<Tone, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent/20 text-accent-foreground border border-accent/40 font-medium",
  success: "bg-success/15 text-success border border-success/30 font-medium",
  danger: "bg-destructive/15 text-destructive border border-destructive/30 font-medium",
  warning: "bg-warning/15 text-warning border border-warning/30 font-medium",
  muted: "bg-muted text-muted-foreground",
};

export function Pill({
  tone = "muted",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const categoryThemes: Record<string, { bg: string; icon: string; label: string }> = {
  gift: { bg: "from-amber-100 to-orange-100 text-orange-600", icon: "Gift", label: "กิ๊ฟช็อป" },
  soap: { bg: "from-emerald-50 to-teal-100 text-teal-600", icon: "Droplets", label: "สบู่" },
  shampoo: { bg: "from-rose-50 to-orange-100 text-rose-600", icon: "Sparkles", label: "แชมพู" },
  brush: { bg: "from-sky-50 to-blue-100 text-blue-600", icon: "Brush", label: "แปรงสีฟัน" },
  paste: { bg: "from-teal-50 to-cyan-100 text-teal-600", icon: "Smile", label: "ยาสีฟัน" },
  noodle: { bg: "from-amber-100 to-yellow-200 text-amber-700", icon: "Soup", label: "บะหมี่" },
  milk: { bg: "from-blue-50 to-indigo-100 text-indigo-600", icon: "Milk", label: "นมสด" },
};

export function ProductImage({
  p,
  product,
  className,
}: {
  p?: Product;
  product?: Product;
  className?: string;
}) {
  const item = p ?? product;
  if (!item) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary text-muted-foreground", className)}>
        <Package className="h-8 w-8" />
      </div>
    );
  }

  const theme = categoryThemes[item.categoryId] ?? {
    bg: "from-orange-50 to-amber-100 text-primary",
    icon: "Package",
    label: "สินค้า",
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br p-4",
        theme.bg,
        className
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card/85 shadow-soft backdrop-blur-xs">
        <CatIcon name={theme.icon} className="h-10 w-10" />
      </div>
      <span className="mt-2 text-[11px] font-medium tracking-wide uppercase opacity-75">{theme.label}</span>
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useStore();
  const outOfStock = p.stock <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:shadow-md">
      <Link to="/products/$id" params={{ id: p.id }} className="relative block">
        <ProductImage p={p} className="aspect-square" />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {p.promoLabel && (
            <Pill tone="accent" className="shadow-xs">
              <Sparkles className="h-3 w-3" />
              {p.promoLabel}
            </Pill>
          )}
        </div>
        <div className="absolute right-2.5 top-2.5">
          <Pill tone={outOfStock ? "danger" : "success"}>
            {outOfStock ? "สินค้าหมด" : "มีสินค้า"}
          </Pill>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <Link
          to="/products/$id"
          params={{ id: p.id }}
          className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
        >
          {p.name}
        </Link>
        <span className="text-xs text-muted-foreground">{p.unit}</span>

        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">{baht(p.price)}</span>
            {p.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {baht(p.originalPrice)}
              </span>
            )}
          </div>
        </div>

        <button
          disabled={outOfStock}
          onClick={() => addToCart(p.id)}
          className={cn(
            "mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors",
            outOfStock
              ? "cursor-not-allowed bg-muted text-muted-foreground opacity-75"
              : "bg-primary text-primary-foreground hover:bg-primary-strong active:scale-[0.98]"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {outOfStock ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
        </button>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
        className
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.99]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function LoginRequired({ title }: { title: string }) {
  const nav = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary text-primary shadow-soft">
        <Lock className="h-10 w-10" />
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        กรุณาเข้าสู่ระบบเพื่อใช้งานส่วนนี้ เพื่อดูข้อมูลส่วนบุคคลและจัดการคำสั่งซื้อของคุณ
      </p>
      <div className="mt-2 w-full max-w-xs">
        <PrimaryButton onClick={() => nav({ to: "/login" })}>เข้าสู่ระบบ / สมัครสมาชิก</PrimaryButton>
      </div>
    </div>
  );
}

export function BottomNav() {
  const { cartCount } = useStore();
  const navItems = [
    { to: "/", label: "หน้าแรก", icon: Home },
    { to: "/products", label: "สินค้า", icon: LayoutGrid },
    { to: "/cart", label: "ตะกร้า", icon: ShoppingCart, badge: cartCount },
    { to: "/orders", label: "คำสั่งซื้อ", icon: Receipt },
    { to: "/account", label: "บัญชี", icon: User },
  ] as const;

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      {navItems.map(({ to, label, icon: Icon, ...rest }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground [&.active]:font-semibold [&.active]:text-primary"
        >
          <span className="relative">
            <Icon className="h-5 w-5" />
            {"badge" in rest && rest.badge > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {rest.badge > 99 ? "99+" : rest.badge}
              </span>
            )}
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function QrFab() {
  const { member, setQrOpen } = useStore();
  const nav = useNavigate();

  return (
    <div className="pointer-events-none sticky bottom-20 z-20 flex justify-end px-4">
      <button
        onClick={() => (member ? setQrOpen(true) : nav({ to: "/login" }))}
        className="pointer-events-auto flex h-13 items-center gap-2 rounded-full bg-sunrise px-5 font-semibold text-primary-foreground shadow-frame transition-transform hover:scale-105 active:scale-95"
      >
        <QrCode className="h-5 w-5" />
        <span>QR สมาชิก</span>
      </button>
    </div>
  );
}

export function QrOverlay() {
  const { member, qrOpen, setQrOpen } = useStore();
  const [maxBrightness, setMaxBrightness] = useState(true);

  if (!qrOpen || !member) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-between p-6 transition-all duration-300 select-none",
        maxBrightness
          ? "bg-white text-stone-900"
          : "bg-stone-950 text-white"
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          {/* Brightness indicator and toggle */}
          <button
            onClick={() => setMaxBrightness(!maxBrightness)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              maxBrightness
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-stone-800 text-stone-300"
            )}
            title="ปรับความสว่างหน้าจอ"
          >
            <Sun className="h-4 w-4 fill-current text-amber-500" />
            <span>{maxBrightness ? "ความสว่างสูงสุด 100%" : "โหมดปกติ"}</span>
          </button>
          <button
            aria-label="ปิด"
            onClick={() => setQrOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Content: Large QR, Member ID, Full Name */}
      <div className="my-auto flex flex-col items-center justify-center text-center">
        {/* Large QR Container */}
        <div className="rounded-3xl border-4 border-primary/20 bg-white p-5 shadow-2xl">
          <QRCodeSVG
            value={`RUNGARUN:MEMBER:${member.id}:${member.phone}`}
            size={260}
            level="H"
            includeMargin
          />
        </div>

        {/* Member Details */}
        <div className="mt-5 space-y-1">
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            {member.fullName}
          </p>
          <p className="font-mono text-base font-bold tracking-widest text-primary">
            รหัสสมาชิก: {member.id}
          </p>
          <p className="text-xs text-muted-foreground">
            เบอร์โทรศัพท์: {member.phone}
          </p>
        </div>

        {/* Points Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-4 py-1.5 text-xs font-bold text-accent-foreground border border-accent/40">
          <Star className="h-4 w-4 fill-current text-accent" />
          <span>แต้มสะสมคงเหลือ: {member.points.toLocaleString("th-TH")} แต้ม (ใช้แทนเงินสด ฿{Math.floor(member.points / 10)})</span>
        </div>

        {/* Exact instruction prompt required by spec */}
        <div className="mt-6 max-w-xs rounded-2xl bg-secondary/80 p-3 text-center border border-border">
          <p className="text-xs font-bold text-primary">
            แสดงให้พนักงานสแกนที่เคาน์เตอร์ เพื่อสะสมหรือใช้แต้ม
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            ซื้อครบ 50 บาท ได้ 5 แต้ม · 10 แต้ม = ส่วนลด 1 บาท
          </p>
        </div>
      </div>

      {/* Close Button */}
      <div className="pt-2">
        <PrimaryButton onClick={() => setQrOpen(false)}>
          ปิดหน้าจอ QR
        </PrimaryButton>
      </div>
    </div>
  );
}

export function OnboardingModal() {
  const { onboardingOpen, setOnboardingOpen } = useStore();
  const [slide, setSlide] = useState(0);

  if (!onboardingOpen) return null;

  const slides = [
    {
      title: "สั่งง่าย ส่งไวถึงบ้าน",
      desc: "เลือกซื้อสินค้าของกินของใช้ในชีวิตประจำวันจากร้านรุ่งอรุณ สะดวก สดใหม่ พร้อมบริการจัดส่งถึงบ้านคุณ",
      icon: ShoppingCart,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "สะสมแต้มทุกการซื้อ",
      desc: "ซื้อครบทุก 50 บาท รับ 5 แต้ม ทุกช่องทาง ทั้งหน้าร้านและในแอป ใช้ 10 แต้ม แลกเป็นส่วนลดแทนเงินสดได้ 1 บาท",
      icon: Coins,
      color: "text-accent",
      bg: "bg-accent/20",
    },
    {
      title: "ติดตามการจัดส่งทันใจ",
      desc: "ตรวจสอบสถานะคำสั่งซื้อ อัปโหลดสลิปชำระเงิน และติดตามเลขพัสดุได้แบบเรียลไทม์ในแอปเดียว",
      icon: Truck,
      color: "text-success",
      bg: "bg-success/15",
    },
  ];

  const current = slides[slide];
  const isLast = slide === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      setOnboardingOpen(false);
    } else {
      setSlide((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-frame">
        <div className="flex items-center justify-between pb-2">
          <Logo />
          <button
            onClick={() => setOnboardingOpen(false)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            ข้าม
          </button>
        </div>

        <div className="my-6 flex flex-col items-center text-center">
          <div className={cn("flex h-28 w-28 items-center justify-center rounded-3xl shadow-soft", current.bg, current.color)}>
            <current.icon className="h-14 w-14" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">{current.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.desc}</p>
        </div>

        {/* Dots */}
        <div className="mb-6 flex justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === slide ? "w-6 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        <PrimaryButton onClick={handleNext}>
          {isLast ? "เริ่มต้นใช้งาน" : "ถัดไป"}
          <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}

export function ReceiptModal() {
  const { receiptModalOrder, setReceiptModalOrder } = useStore();
  const [copied, setCopied] = useState(false);

  if (!receiptModalOrder) return null;
  const o = receiptModalOrder;
  const isFull = o.invoice?.type === "full";

  const handleCopyNo = () => {
    if (o.invoice?.invoiceNo) {
      navigator.clipboard.writeText(o.invoice.invoiceNo);
      setCopied(true);
      toast.success("คัดลอกเลขที่ใบเสร็จแล้ว");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-frame">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">
              {isFull ? "ใบเสร็จรับเงิน/ใบกำกับภาษี (เต็มรูป)" : "ใบเสร็จรับเงินอย่างย่อ"}
            </h2>
          </div>
          <button
            onClick={() => setReceiptModalOrder(null)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-5 text-sm">
          {/* Store Info */}
          <div className="border-b border-dashed border-border pb-4 text-center">
            <p className="text-base font-bold text-primary">ร้านรุ่งอรุณ มินิมาร์ท</p>
            <p className="text-xs text-muted-foreground">
              99/9 หมู่ 2 ถนนรุ่งอรุณ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000
            </p>
            <p className="text-xs text-muted-foreground">โทร: 043-123-456 · เลขประจำตัวผู้เสียภาษี: 0105562012345</p>
            <p className="mt-1 font-semibold text-foreground">
              {isFull ? "ใบเสร็จรับเงิน / ใบกำกับภาษี" : "ใบเสร็จรับเงินอย่างย่อ"}
            </p>
          </div>

          {/* Metadata */}
          <div className="border-b border-dashed border-border py-3 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">เลขที่เอกสาร:</span>
              <button onClick={handleCopyNo} className="flex items-center gap-1 font-semibold text-primary">
                {o.invoice?.invoiceNo ?? `REC-${o.id}`}
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">วันที่:</span>
              <span>{formatThaiDate(o.createdAt)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">เลขอ้างอิงคำสั่งซื้อ:</span>
              <span>{o.id}</span>
            </div>

            {isFull ? (
              <div className="mt-2 rounded-xl bg-secondary p-2.5">
                <p className="font-semibold text-foreground">ข้อมูลผู้ซื้อ / นิติบุคคล:</p>
                <p className="text-xs">{o.invoice?.customerName}</p>
                {o.invoice?.taxId && <p className="text-xs">เลขผู้เสียภาษี: {o.invoice.taxId}</p>}
                {o.invoice?.customerAddress && (
                  <p className="text-xs text-muted-foreground">ที่อยู่: {o.invoice.customerAddress}</p>
                )}
              </div>
            ) : (
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">ลูกค้า:</span>
                <span>{o.invoice?.customerName || "ลูกค้าทั่วไป"}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-border py-3">
            <p className="mb-2 font-semibold text-muted-foreground">รายการสินค้า</p>
            <div className="flex flex-col gap-2">
              {o.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-medium text-foreground">{item.productName}</p>
                    <p className="text-muted-foreground">
                      {item.qty} × {baht(item.price)}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">{baht(item.qty * item.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 py-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ยอดรวมสินค้า:</span>
              <span>{baht(o.goodsSubtotal)}</span>
            </div>
            {o.discountBaht > 0 && (
              <div className="flex justify-between text-accent-foreground">
                <span>ส่วนลดแต้มสะสม ({o.pointsUsed} แต้ม):</span>
                <span>-{baht(o.discountBaht)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">ค่าจัดส่ง ({o.shippingMethod}):</span>
              <span>{o.shippingFee === 0 ? "ฟรี" : baht(o.shippingFee)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมในยอดแล้ว):</span>
              <span>฿{calculateVat(o.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
              <span>ยอดชำระสุทธิ:</span>
              <span>{baht(o.total)}</span>
            </div>
            {o.pointsEarned > 0 && (
              <div className="mt-2 rounded-xl bg-accent/20 p-2 text-center text-xs font-semibold text-accent-foreground">
                คำสั่งซื้อนี้ได้รับแต้มสะสม: +{o.pointsEarned} แต้ม
              </div>
            )}
          </div>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            <p>ขอบคุณที่ไว้วางใจใช้บริการ ร้านรุ่งอรุณ มินิมาร์ท</p>
            <p className="mt-0.5">สินค้ามีปัญหาสามารถติดต่อขอคืนหรือเปลี่ยนได้ภายใน 7 วัน</p>
          </div>
        </div>

        {/* Action Buttons: บันทึกเป็นรูป / แชร์ใบเสร็จ */}
        <div className="border-t border-border p-4 flex flex-col gap-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                toast.success("บันทึกภาพใบเสร็จเรียบร้อยแล้ว", {
                  description: `บันทึกรูป ${o.invoice?.invoiceNo || o.id}.png ลงในอุปกรณ์แล้ว`,
                });
              }}
              className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              <Download className="h-4 w-4" />
              บันทึกเป็นรูป
            </button>

            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: `ใบเสร็จรับเงิน ${o.invoice?.invoiceNo || o.id} - ร้านรุ่งอรุณ มินิมาร์ท`,
                      text: `ใบเสร็จรับเงินร้านรุ่งอรุณ เลขที่: ${o.invoice?.invoiceNo || o.id} ยอดชำระ: ${baht(o.total)}`,
                    })
                    .catch(() => {});
                } else {
                  navigator.clipboard.writeText(
                    `ใบเสร็จรับเงินร้านรุ่งอรุณ\nเลขที่: ${o.invoice?.invoiceNo || o.id}\nวันที่: ${formatThaiDate(o.createdAt)}\nยอดรวม: ${baht(o.total)}`
                  );
                  toast.success("คัดลอกข้อมูลใบเสร็จเพื่อแชร์แล้ว");
                }
              }}
              className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
              แชร์ใบเสร็จ
            </button>
          </div>

          <PrimaryButton onClick={() => setReceiptModalOrder(null)} className="h-10 text-xs">
            ปิดหน้าต่าง
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenterModal() {
  const { member, notificationOpen, setNotificationOpen, markAllNotificationsRead, setReceiptModalOrder } = useStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<"all" | "order" | "points">("all");

  if (!notificationOpen || !member) return null;

  const notifications = member.notifications || [];
  const filtered = notifications.filter((n) => {
    if (filter === "order") return n.type === "order";
    if (filter === "points") return n.type === "points";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-frame">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icons.Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-foreground">ศูนย์แจ้งเตือน</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">สถานะจัดส่งและแต้มสะสม</p>
            </div>
          </div>
          <button
            onClick={() => setNotificationOpen(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-secondary/30 text-xs">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "order", label: "คำสั่งซื้อ" },
              { id: "gift", label: "ของขวัญ" },
              { id: "points", label: "แต้มสะสม" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id as any)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-all",
                  filter === id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => {
                markAllNotificationsRead();
                toast.success("ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว");
              }}
              className="text-[11px] font-semibold text-primary hover:underline shrink-0 ml-2"
            >
              อ่านทั้งหมด
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Icons.BellOff className="h-10 w-10 stroke-1" />
              <p className="font-semibold text-foreground text-sm">ไม่มีรายการแจ้งเตือน</p>
              <p className="text-xs">เมื่อมีอัปเดตสถานะคำสั่งซื้อหรือแต้ม จะปรากฏที่นี่</p>
            </div>
          ) : (
            filtered.map((n) => {
              const isPoints = n.type === "points";
              const isOrder = n.type === "order";
              const isGift = n.type === "gift";

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.orderId) {
                      setNotificationOpen(false);
                      nav({ to: "/orders" });
                    } else if (n.type === "gift") {
                      setNotificationOpen(false);
                      nav({ to: "/account" });
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all hover:border-primary/40",
                    !n.read ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isGift
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                        : isPoints
                        ? "bg-accent/20 text-accent"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {isGift ? <Gift className="h-5 w-5" /> : isPoints ? <Coins className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground line-clamp-1">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{n.message}</p>

                    {/* Special Details Box for Gift Notification */}
                    {isGift && (
                      <div className="mt-2 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-foreground space-y-1 border border-amber-500/20">
                        {n.giftItem && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">รายการของขวัญ:</span>
                            <strong className="text-primary text-right flex-1 pl-2">{n.giftItem}</strong>
                          </div>
                        )}
                        {n.giftAddress && (
                          <div className="flex justify-between items-start">
                            <span className="text-muted-foreground shrink-0">ที่อยู่จัดส่ง (ที่อยู่หลัก):</span>
                            <span className="text-right flex-1 pl-2 text-foreground">{n.giftAddress}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-amber-500/20 pt-1 text-[10px] text-muted-foreground">
                          <span>วันที่จัดส่ง:</span>
                          <span>{formatThaiDate(n.giftDate || n.date)}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {n.orderId && (
                        <span className="font-mono font-semibold text-primary">คำสั่งซื้อ: {n.orderId}</span>
                      )}
                      {n.requestId && (
                        <span className="font-mono font-semibold text-accent">คำขอ: {n.requestId}</span>
                      )}
                      {n.status && <Pill tone="primary">{n.status}</Pill>}
                      {n.requestStatus && <Pill tone="accent">{n.requestStatus}</Pill>}
                      {n.trackingNumber && (
                        <span className="font-mono text-foreground font-semibold">
                          พัสดุ: {n.trackingNumber}
                        </span>
                      )}
                      <span className="ml-auto text-[10px]">{formatThaiDate(n.date)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 bg-secondary/20">
          <SecondaryButton onClick={() => setNotificationOpen(false)} className="h-9 text-xs">
            ปิด
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
