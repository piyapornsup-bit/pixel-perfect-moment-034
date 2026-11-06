import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  FileText,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LoginRequired,
  Pill,
  PrimaryButton,
  ProductImage,
  SecondaryButton,
} from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import type { Address } from "@/lib/data/types";
import {
  baht,
  calculateVat,
  clampQty,
  maxRedeemablePoints,
  normalizeRedeem,
  pointsEarned,
  pointsToBaht,
  shippingFee,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type CartSearchParams = {
  step?: "cart" | "checkout" | "payment";
  orderId?: string;
};

export const Route = createFileRoute("/cart")({
  validateSearch: (s: Record<string, unknown>): CartSearchParams => ({
    step:
      typeof s.step === "string" && ["cart", "checkout", "payment"].includes(s.step)
        ? (s.step as CartSearchParams["step"])
        : undefined,
    orderId: typeof s.orderId === "string" ? s.orderId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ตะกร้าสินค้าและชำระเงิน — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        name: "description",
        content: "ตรวจสอบสินค้าในตะกร้า จัดการจำนวนสินค้า และขั้นตอนการสั่งซื้อร้านรุ่งอรุณ",
      },
      { property: "og:title", content: "ตะกร้าสินค้า — ร้านรุ่งอรุณ" },
      { property: "og:description", content: "ช้อปสินค้าสะดวก ส่งตรงถึงบ้านคุณ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const search = Route.useSearch();
  const nav = useNavigate({ from: "/cart" });
  const { member, cart, updateCartQty, removeFromCart, clearCart, refreshMember } = useStore();

  // Active step: "cart" | "checkout" | "payment"
  const [step, setStep] = useState<"cart" | "checkout" | "payment">(search.step || "cart");

  // Sync search param if step changes
  useEffect(() => {
    if (search.step && search.step !== step) {
      setStep(search.step);
    }
  }, [search.step]);

  // Section 5: Points redemption state
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [redeemInput, setRedeemInput] = useState<number>(0);

  // Section 1: Address state
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newLabel, setNewLabel] = useState("บ้าน");
  const [newRecipient, setNewRecipient] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLine, setNewLine] = useState("");

  // Section 2 & 3: Shipping & Payment state
  const [shippingMethodId, setShippingMethodId] = useState<string>("std");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("bank");

  // Section 4: Invoice state
  const [invoiceType, setInvoiceType] = useState<"simplified" | "full">("simplified");
  const [invoiceTaxId, setInvoiceTaxId] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");

  // Section 6: Created order state
  const [createdOrderId, setCreatedOrderId] = useState<string>(search.orderId || "");

  if (!member) {
    return <LoginRequired title="ตะกร้าสินค้า" />;
  }

  // Populate cart lines with latest product data and stock from repo
  const lines = cart
    .map((l) => ({ ...l, product: repo.getProduct(l.productId) }))
    .filter((l): l is { productId: string; qty: number; product: NonNullable<typeof l.product> } => Boolean(l.product));

  const goodsSubtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  // Store Settings
  const settings = repo.getSettings();
  const freeMin = settings.freeShippingMin; // 300
  const freeDiff = Math.max(0, freeMin - goodsSubtotal);

  // Selected Shipping Option & Fee calculation
  const selectedShippingOption = settings.shipping.find((s) => s.id === shippingMethodId) ?? settings.shipping[0];
  const actualShippingFee = shippingFee(goodsSubtotal, selectedShippingOption.fee, freeMin);

  // Points redemption calculations
  const maxPoints = maxRedeemablePoints(member.points, goodsSubtotal);
  const safeRedeemPoints = usePoints ? normalizeRedeem(redeemInput, member.points, goodsSubtotal) : 0;
  const discountBaht = pointsToBaht(safeRedeemPoints);

  // Net total & Points earned
  const netTotal = Math.max(0, goodsSubtotal - discountBaht + actualShippingFee);
  const earnedPoints = pointsEarned(netTotal);

  // Default address: Prioritize primary address
  const primaryAddress = member.addresses.find((a) => a.isPrimary) ?? member.addresses[0];
  const activeAddressId = selectedAddressId || (primaryAddress ? primaryAddress.id : "");

  // Update selected address when primary is loaded
  useEffect(() => {
    if (!selectedAddressId && primaryAddress) {
      setSelectedAddressId(primaryAddress.id);
    }
  }, [primaryAddress, selectedAddressId]);

  // Stepper handler with stock check
  const handleIncreaseQty = (productId: string, curQty: number, stock: number) => {
    if (curQty >= stock) {
      toast.warning(`มีสินค้าคงเหลือในสต๊อก ${stock} ชิ้น`);
      return;
    }
    updateCartQty(productId, curQty + 1);
  };

  const handleDecreaseQty = (productId: string, curQty: number) => {
    if (curQty <= 1) {
      removeFromCart(productId);
    } else {
      updateCartQty(productId, curQty - 1);
    }
  };

  // Add new address inline
  const handleCreateNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim() || !newPhone.trim() || !newLine.trim()) {
      toast.error("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน");
      return;
    }
    const isFirst = member.addresses.length === 0;
    const added = repo.addAddress(member.id, {
      label: newLabel,
      recipient: newRecipient.trim(),
      phone: newPhone.trim(),
      line: newLine.trim(),
      isPrimary: isFirst,
    });
    if (added) {
      refreshMember();
      setSelectedAddressId(added.id);
      setShowAddAddress(false);
      setNewRecipient("");
      setNewPhone("");
      setNewLine("");
      toast.success("เพิ่มที่อยู่จัดส่งใหม่เรียบร้อย");
    }
  };

  // Confirm order action: Validate stock again -> Create order -> Clear cart -> Payment step
  const handleConfirmOrder = () => {
    if (lines.length === 0) {
      toast.error("ไม่มีสินค้าในตะกร้า");
      return;
    }

    if (!activeAddressId && member.addresses.length === 0) {
      toast.error("กรุณาระบุที่อยู่จัดส่งสินค้า");
      setShowAddAddress(true);
      return;
    }

    if (invoiceType === "full") {
      if (!invoiceName.trim() || !invoiceAddress.trim() || !invoiceTaxId.trim()) {
        toast.error("กรุณากรอกชื่อ ที่อยู่ และเลขประจำตัวผู้เสียภาษี 13 หลักให้ครบถ้วน");
        return;
      }
      if (invoiceTaxId.trim().length !== 13 || !/^\d{13}$/.test(invoiceTaxId.trim())) {
        toast.error("เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลักเท่านั้น");
        return;
      }
    }

    // 1. RE-CHECK STOCK AGAIN before placing order
    const stockVerification = repo.checkStock(
      lines.map((l) => ({ productId: l.productId, qty: l.qty }))
    );

    if (!stockVerification.valid) {
      toast.error(stockVerification.error || "ขออภัย สต๊อกสินค้าบางรายการไม่เพียงพอ");
      return;
    }

    const orderItems = lines.map((l) => ({
      productId: l.product.id,
      productName: l.product.name,
      unit: l.product.unit,
      qty: l.qty,
      price: l.product.price,
    }));

    const paymentMethodObj =
      settings.paymentMethods.find((p) => p.id === paymentMethodId) ?? settings.paymentMethods[0];

    // 2. Create order with Buddhist Era format e.g. ORD-2569-0001
    const order = repo.createOrder(member.id, {
      items: orderItems,
      goodsSubtotal,
      shippingFee: actualShippingFee,
      shippingMethod: `${selectedShippingOption.name}${actualShippingFee === 0 ? " (ส่งฟรี)" : ""}`,
      pointsUsed: safeRedeemPoints,
      discountBaht,
      pointsEarned: earnedPoints,
      total: netTotal,
      addressId: activeAddressId,
      paymentMethod: paymentMethodObj.name,
      invoiceType,
      invoiceTaxId: invoiceType === "full" ? invoiceTaxId.trim() : undefined,
      invoiceName: invoiceType === "full" ? invoiceName.trim() : member.fullName,
      invoiceAddress: invoiceType === "full" ? invoiceAddress.trim() : undefined,
    });

    if (order) {
      // 3. Clear cart & update state
      clearCart();
      refreshMember();
      setCreatedOrderId(order.id);
      setStep("payment");
      nav({
        search: (s) => ({ ...s, step: "payment", orderId: order.id }),
        replace: true,
      });
      toast.success(`สร้างคำสั่งซื้อ ${order.id} เรียบร้อยแล้ว`);
    } else {
      toast.error("ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาตรวจสอบสต๊อกสินค้าแล้วลองใหม่อีกครั้ง");
    }
  };

  // =========================================================================
  // VIEW 3: Payment Instruction Screen (หน้าชำระเงิน)
  // =========================================================================
  if (step === "payment") {
    const order = member.orders.find((o) => o.id === createdOrderId) || member.orders[0];
    const paymentMethodObj =
      settings.paymentMethods.find((p) => p.id === paymentMethodId) ?? settings.paymentMethods[0];

    return (
      <div className="flex flex-col gap-4 p-4 pb-16">
        {/* Success header */}
        <div className="flex flex-col items-center gap-2 pt-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-success/15 text-success shadow-soft">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">สร้างคำสั่งซื้อสำเร็จ!</h1>
            <p className="text-xs text-muted-foreground">กรุณาดำเนินการชำระเงินเพื่อยืนยันรายการ</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">เลขที่คำสั่งซื้อ:</span>
            <strong className="text-sm font-bold text-foreground">{order?.id || createdOrderId}</strong>
            <Pill tone="warning">รอชำระ</Pill>
          </div>
        </div>

        {/* 24-Hour Payment Deadline Alert */}
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3.5 text-xs text-warning-foreground shadow-soft">
          <div className="flex items-center gap-2 font-bold">
            <Clock className="h-4 w-4 text-warning" />
            <span>กำหนดเวลาชำระเงินภายใน 24 ชั่วโมง</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            กรุณาโอนเงินและแนบหลักฐานการชำระเงิน (สลิป) ภายใน 24 ชั่วโมง หากพ้นกำหนด
            ระบบจะปรับสถานะเป็น "หมดเวลา" โดยอัตโนมัติ
          </p>
        </div>

        {/* Total Amount to Pay */}
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-soft">
          <p className="text-xs text-muted-foreground">ยอดเงินที่ต้องชำระ</p>
          <p className="mt-1 text-3xl font-extrabold text-primary">{baht(order?.total ?? netTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ช่องทาง: <strong className="text-foreground">{order?.paymentMethod ?? paymentMethodObj.name}</strong>
          </p>
        </div>

        {/* Payment Account Details or PromptPay QR */}
        {paymentMethodId === "bank" ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Building className="h-4 w-4 text-primary" />
              <span>บัญชีธนาคารสำหรับโอนเงิน</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-secondary/70 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ธนาคาร:</span>
                <span className="font-semibold text-foreground">ธนาคารกสิกรไทย (KBANK)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">เลขที่บัญชี:</span>
                <span className="text-sm font-extrabold text-primary">012-3-45678-9</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ชื่อบัญชี:</span>
                <span className="font-semibold text-foreground">ร้านรุ่งอรุณ มินิมาร์ท</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText("0123456789");
                toast.success("คัดลอกเลขที่บัญชี 012-3-45678-9 แล้ว");
              }}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground shadow-xs hover:bg-secondary active:scale-[0.99] transition-all"
            >
              คัดลอกเลขที่บัญชี
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <QrCode className="h-4 w-4 text-primary" />
              <span>QR Code พร้อมเพย์</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">เปิดแอปธนาคารแล้วสแกนชำระเงินได้ทันที</p>
            <div className="my-3 rounded-2xl border-4 border-secondary p-3 bg-white shadow-inner">
              <QrCode className="h-44 w-44 text-primary" />
            </div>
            <p className="text-xs font-semibold text-foreground">รุ่งอรุณ มินิมาร์ท (0105562012345)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ยอดชำระตรงตามคำสั่งซื้อ: <strong className="text-primary">{baht(order?.total ?? netTotal)}</strong>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          <PrimaryButton
            onClick={() => {
              nav({ to: "/orders" });
            }}
          >
            <Upload className="h-4 w-4" />
            ไปที่หน้าคำสั่งซื้อเพื่อแนบสลิป
          </PrimaryButton>
          <SecondaryButton onClick={() => nav({ to: "/" })}>กลับหน้าแรก</SecondaryButton>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Checkout Screen (หน้าเดียวแบ่งเป็น 6 ส่วน)
  // =========================================================================
  if (step === "checkout") {
    return (
      <div className="flex flex-col gap-5 p-4 pb-16">
        {/* Back navigation header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="กลับไปตะกร้า"
            onClick={() => setStep("cart")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">ชำระเงินและจัดส่ง</h1>
            <p className="text-xs text-muted-foreground">ขั้นตอนสั่งซื้อ (Checkout)</p>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 1) ที่อยู่จัดส่ง: เลือกจากที่อยู่ที่บันทึกไว้ (ค่าเริ่มต้นเป็นที่อยู่หลัก) หรือเพิ่มใหม่ */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <MapPin className="h-4 w-4 text-primary" /> ที่อยู่จัดส่ง
            </h2>
            <button
              type="button"
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {showAddAddress ? "ยกเลิก" : "+ เพิ่มที่อยู่ใหม่"}
            </button>
          </div>

          {/* New address form */}
          {showAddAddress && (
            <form
              onSubmit={handleCreateNewAddress}
              className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-xs"
            >
              <span className="font-semibold text-foreground">เพิ่มที่อยู่จัดส่งใหม่</span>
              <div className="flex gap-2">
                {["บ้าน", "ที่ทำงาน", "อื่น ๆ"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setNewLabel(lbl)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                      newLabel === lbl
                        ? "bg-primary text-white"
                        : "border border-border bg-card text-muted-foreground"
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <input
                placeholder="ชื่อ-นามสกุล ผู้รับ *"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
              />
              <input
                placeholder="เบอร์โทรศัพท์ติดต่อ *"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
              />
              <textarea
                placeholder="ที่อยู่ บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์ *"
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                rows={2}
                className="rounded-lg border border-border bg-card p-2.5 text-xs outline-none focus:border-primary"
              />
              <PrimaryButton type="submit" className="h-9 text-xs">
                บันทึกที่อยู่จัดส่งนี้
              </PrimaryButton>
            </form>
          )}

          {/* Saved Addresses list */}
          <div className="mt-3 flex flex-col gap-2">
            {member.addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีที่อยู่จัดส่ง กรุณากด "+ เพิ่มที่อยู่ใหม่"</p>
            ) : (
              member.addresses.map((addr) => {
                const selected = activeAddressId === addr.id;
                return (
                  <label
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="checkoutAddress"
                      checked={selected}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{addr.label}</span>
                        {addr.isPrimary && <Pill tone="primary">ที่อยู่หลัก</Pill>}
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {addr.recipient} ({addr.phone})
                      </p>
                      <p className="mt-0.5 text-foreground leading-relaxed">{addr.line}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2) ช่องทางจัดส่ง: ส่งมาตรฐาน ฿30 / ส่งด่วน ฿60 (ส่งฟรีเมื่อครบ ฿300) */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <Truck className="h-4 w-4 text-primary" /> ช่องทางจัดส่ง
            </h2>
            {goodsSubtotal >= freeMin && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                สิทธิ์ส่งฟรีเมื่อครบ ฿{freeMin}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {settings.shipping.map((opt) => {
              const selected = shippingMethodId === opt.id;
              const fee = shippingFee(goodsSubtotal, opt.fee, freeMin);
              return (
                <label
                  key={opt.id}
                  onClick={() => setShippingMethodId(opt.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shippingChannel"
                      checked={selected}
                      onChange={() => setShippingMethodId(opt.id)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{opt.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {opt.id === "std" ? "ระยะเวลา 1-2 วันทำการ" : "ส่งด่วนทันใจในพื้นที่ใกล้เคียง"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {fee === 0 ? (
                      <span className="font-bold text-success">ฟรี</span>
                    ) : (
                      <span className="font-bold text-primary">{baht(fee)}</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3) ช่องทางชำระเงิน: โอนผ่านธนาคาร / พร้อมเพย์ */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <CreditCard className="h-4 w-4 text-primary" /> ช่องทางชำระเงิน
          </h2>

          <div className="mt-3 flex flex-col gap-2">
            {settings.paymentMethods.map((pm) => {
              const selected = paymentMethodId === pm.id;
              const isBank = pm.id === "bank";
              return (
                <label
                  key={pm.id}
                  onClick={() => setPaymentMethodId(pm.id)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"
                  )}
                >
                  <input
                    type="radio"
                    name="paymentOption"
                    checked={selected}
                    onChange={() => setPaymentMethodId(pm.id)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {isBank ? <Building className="h-3.5 w-3.5 text-primary" /> : <QrCode className="h-3.5 w-3.5 text-primary" />}
                      <span className="font-bold text-foreground">{pm.name}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{pm.details}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4) ประเภทใบเสร็จ: แบบย่อ หรือ แบบเต็ม (13 หลัก) */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <FileText className="h-4 w-4 text-primary" /> ประเภทใบเสร็จรับเงิน
          </h2>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setInvoiceType("simplified")}
              className={cn(
                "flex-1 rounded-xl border p-2.5 text-xs font-semibold transition-all",
                invoiceType === "simplified"
                  ? "border-primary bg-primary text-white shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary/60"
              )}
            >
              ใบเสร็จอย่างย่อ
            </button>
            <button
              type="button"
              onClick={() => {
                setInvoiceType("full");
                if (!invoiceName) setInvoiceName(member.fullName);
                if (!invoiceAddress && member.addresses[0]) setInvoiceAddress(member.addresses[0].line);
              }}
              className={cn(
                "flex-1 rounded-xl border p-2.5 text-xs font-semibold transition-all",
                invoiceType === "full"
                  ? "border-primary bg-primary text-white shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary/60"
              )}
            >
              ใบกำกับภาษีเต็มรูป
            </button>
          </div>

          {invoiceType === "full" && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-secondary/60 p-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground">ชื่อ-นามสกุล / นิติบุคคลผู้ซื้อ *</span>
                <input
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี หรือ บริษัท..."
                  className="h-9 rounded-lg border border-border bg-card px-2.5 outline-none focus:border-primary"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">เลขประจำตัวผู้เสียภาษี 13 หลัก *</span>
                  <span className="text-[11px] text-muted-foreground">{invoiceTaxId.length}/13</span>
                </div>
                <input
                  maxLength={13}
                  value={invoiceTaxId}
                  onChange={(e) => setInvoiceTaxId(e.target.value.replace(/\D/g, ""))}
                  placeholder="ระบุตัวเลข 13 หลัก"
                  className="h-9 rounded-lg border border-border bg-card px-2.5 font-mono text-xs outline-none focus:border-primary"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground">ที่อยู่ตามบัตรประชาชน / ทะเบียนภาษี *</span>
                <textarea
                  rows={2}
                  value={invoiceAddress}
                  onChange={(e) => setInvoiceAddress(e.target.value)}
                  placeholder="ที่อยู่ตามที่จดทะเบียนภาษี..."
                  className="rounded-lg border border-border bg-card p-2 outline-none focus:border-primary"
                />
              </label>
              <p className="text-[11px] text-muted-foreground">
                * ราคาสินค้ารวมภาษีมูลค่าเพิ่ม 7% (VAT) เรียบร้อยแล้ว
              </p>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5) ใช้แต้มแลกส่วนลด: สวิตช์เปิดปิด + ช่องใส่จำนวนแต้ม (ทีละ 10 แต้ม) */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-accent-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-foreground">
                5
              </span>
              <Coins className="h-4 w-4 text-accent" /> ใช้แต้มแลกส่วนลด
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">
              มี {member.points.toLocaleString("th-TH")} แต้ม
            </span>
          </div>

          {/* Toggle Switch */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-card p-3 border border-border">
            <div>
              <p className="text-xs font-bold text-foreground">เปิดใช้แต้มสะสมเป็นส่วนลด</p>
              <p className="text-[11px] text-muted-foreground">อัตราแลก: 10 แต้ม = 1 บาท</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={usePoints}
              onClick={() => {
                const next = !usePoints;
                setUsePoints(next);
                if (next && redeemInput === 0) {
                  setRedeemInput(Math.min(maxPoints, 50));
                }
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                usePoints ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  usePoints ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Points Input & Steppers (Only shown when switch is ON) */}
          {usePoints && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-card p-3 border border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>จำนวนแต้มที่ต้องการใช้:</span>
                <span>(แลกได้สูงสุด {maxPoints} แต้ม)</span>
              </div>

              {/* Number Input & Stepper (ทีละ 10 แต้ม) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="ลด 10 แต้ม"
                  onClick={() => setRedeemInput((p) => Math.max(0, p - 10))}
                  disabled={safeRedeemPoints <= 0}
                  className="flex h-10 w-12 items-center justify-center rounded-xl border border-border bg-secondary font-bold text-foreground hover:bg-secondary/80 disabled:opacity-40"
                >
                  -10
                </button>
                <input
                  type="number"
                  step={10}
                  min={0}
                  max={maxPoints}
                  value={redeemInput || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) setRedeemInput(0);
                    else setRedeemInput(normalizeRedeem(val, member.points, goodsSubtotal));
                  }}
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-center text-sm font-bold text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  aria-label="เพิ่ม 10 แต้ม"
                  onClick={() => setRedeemInput((p) => Math.min(maxPoints, p + 10))}
                  disabled={safeRedeemPoints >= maxPoints}
                  className="flex h-10 w-12 items-center justify-center rounded-xl border border-border bg-secondary font-bold text-foreground hover:bg-secondary/80 disabled:opacity-40"
                >
                  +10
                </button>
              </div>

              {/* Shortcut buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10, 50, 100, 200].map((pts) => {
                  const eligible = maxPoints >= pts;
                  return (
                    <button
                      key={pts}
                      type="button"
                      disabled={!eligible}
                      onClick={() => setRedeemInput(pts)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40",
                        safeRedeemPoints === pts
                          ? "bg-accent text-accent-foreground shadow-xs"
                          : "border border-border bg-secondary/50 text-foreground hover:bg-secondary"
                      )}
                    >
                      +{pts} แต้ม (฿{pts / 10})
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={maxPoints <= 0}
                  onClick={() => setRedeemInput(maxPoints)}
                  className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-secondary disabled:opacity-40"
                >
                  ใช้สูงสุด ({maxPoints} แต้ม)
                </button>
              </div>

              {/* Active discount display */}
              {safeRedeemPoints > 0 && (
                <div className="mt-1 flex items-center justify-between rounded-lg bg-accent/15 px-3 py-2 text-xs font-bold text-accent-foreground">
                  <span>ส่วนลดจากแต้ม:</span>
                  <span>-{baht(discountBaht)} (ใช้ {safeRedeemPoints} แต้ม)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 6) สรุปคำสั่งซื้อ: รายการสินค้า ยอดรวม ค่าส่ง ส่วนลดแต้ม สุทธิ กำหนดเวลา 24 ชม. แต้มที่จะได้ */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              6
            </span>
            <ShoppingBag className="h-4 w-4 text-primary" /> สรุปคำสั่งซื้อ
          </h2>

          {/* รายการสินค้าในคำสั่งซื้อ */}
          <div className="mt-3 flex flex-col gap-2 divide-y divide-border/60">
            {lines.map(({ productId, qty, product }) => (
              <div key={productId} className="flex items-center gap-2.5 pt-2 first:pt-0">
                <ProductImage p={product} className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-xs font-semibold text-foreground">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {qty} x {baht(product.price)} ({product.unit})
                  </p>
                </div>
                <span className="text-xs font-bold text-foreground">{baht(product.price * qty)}</span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>ยอดรวมสินค้า ({lines.length} รายการ):</span>
              <span className="font-semibold text-foreground">{baht(goodsSubtotal)}</span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>ค่าจัดส่ง ({selectedShippingOption.name}):</span>
              <span>{actualShippingFee === 0 ? <strong className="text-success">ส่งฟรี</strong> : baht(actualShippingFee)}</span>
            </div>

            {discountBaht > 0 && (
              <div className="flex justify-between font-semibold text-accent-foreground">
                <span>ส่วนลดจากแต้มสะสม:</span>
                <span>-{baht(discountBaht)}</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมแล้ว):</span>
              <span>฿{calculateVat(netTotal).toFixed(2)}</span>
            </div>

            <div className="flex items-baseline justify-between border-t border-border pt-2.5 text-base font-extrabold text-primary">
              <span>ยอดชำระสุทธิ:</span>
              <span className="text-xl">{baht(netTotal)}</span>
            </div>
          </div>

          {/* กำหนดเวลาชำระเงิน (24 ชั่วโมง) */}
          <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-warning/10 p-2.5 text-xs text-warning-foreground">
            <Clock className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <div>
              <p className="font-bold">กำหนดเวลาชำระเงิน: ภายใน 24 ชั่วโมง</p>
              <p className="text-[11px] text-muted-foreground">
                หลังกดยืนยันคำสั่งซื้อ กรุณาโอนเงินและแนบสลิปภายใน 24 ชม.
              </p>
            </div>
          </div>

          {/* แต้มที่จะได้รับหลังชำระเงิน */}
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-accent/15 p-2.5 text-xs text-accent-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Coins className="h-4 w-4 text-accent" /> แต้มที่จะได้รับหลังชำระ:
            </span>
            <strong className="text-sm font-bold">+{earnedPoints} แต้ม</strong>
          </div>

          {/* ยืนยันคำสั่งซื้อ Button */}
          <PrimaryButton onClick={handleConfirmOrder} className="mt-4">
            ยืนยันคำสั่งซื้อ ({baht(netTotal)})
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: Main Cart View (ตะกร้าสินค้า)
  // =========================================================================
  return (
    <div className="flex flex-col gap-4 p-4 pb-16">
      {/* Title & Clear Cart */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ตะกร้าสินค้า</h1>
          <p className="text-xs text-muted-foreground">
            มีสินค้าในตะกร้า <strong className="text-foreground">{lines.length}</strong> รายการ
          </p>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={() => clearCart()}
            className="flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ล้างตะกร้า
          </button>
        )}
      </div>

      {/* Free Shipping Progress (ครบ ฿300 ส่งฟรี) */}
      {lines.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs shadow-soft">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Truck className="h-4 w-4" />
              {goodsSubtotal >= freeMin
                ? "คุณได้รับสิทธิ์จัดส่งฟรีแล้ว!"
                : `ซื้อเพิ่มอีก ${baht(freeDiff)} เพื่อรับสิทธิ์ส่งฟรี!`}
            </span>
            <span className="text-[11px] text-muted-foreground">ครบ ฿{freeMin}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (goodsSubtotal / freeMin) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {lines.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary text-muted-foreground shadow-soft">
            <ShoppingCart className="h-10 w-10" />
          </div>
          <p className="text-base font-bold text-foreground">ยังไม่มีสินค้าในตะกร้า</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            เลือกช้อปสินค้าของกินของใช้ในร้านรุ่งอรุณแล้วเพิ่มลงตะกร้าได้เลย
          </p>
          <div className="mt-2 w-48">
            <PrimaryButton onClick={() => nav({ to: "/products" })}>
              เลือกซื้อสินค้า
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Cart Items List: เพิ่ม ลบ แก้จำนวน (ปุ่ม − + ) แสดงชื่อ ราคาต่อหน่วย จำนวน สถานะสต๊อก และยอดรวมสินค้า */}
      <div className="flex flex-col gap-3">
        {lines.map(({ productId, qty, product }) => {
          const isOutOfStock = product.stock <= 0;
          const isLowStock = product.stock > 0 && product.stock <= 5;
          const itemTotal = product.price * qty;

          return (
            <div
              key={productId}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-soft transition-all hover:border-primary/30"
            >
              <ProductImage p={product} className="h-20 w-20 shrink-0 rounded-xl" />

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{product.name}</p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(productId)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="ลบสินค้านี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* ราคาต่อหน่วย */}
                  <p className="text-xs text-muted-foreground">
                    ราคาต่อหน่วย: <strong className="text-foreground">{baht(product.price)}</strong> / {product.unit}
                  </p>

                  {/* สถานะสต๊อก (Stock status badge) */}
                  <div className="mt-1">
                    {isOutOfStock ? (
                      <Pill tone="danger">สินค้าหมดชั่วคราว</Pill>
                    ) : isLowStock ? (
                      <Pill tone="warning">ใกล้หมด (เหลือ {product.stock} {product.unit})</Pill>
                    ) : (
                      <Pill tone="success">มีสินค้าพร้อมส่ง ({product.stock} {product.unit})</Pill>
                    )}
                  </div>
                </div>

                {/* Stepper with − / + and Item Subtotal */}
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="ลดจำนวน"
                      onClick={() => handleDecreaseQty(productId, qty)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary/80 text-foreground transition-colors hover:bg-secondary active:scale-95"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-foreground">{qty}</span>
                    <button
                      type="button"
                      aria-label="เพิ่มจำนวน"
                      onClick={() => handleIncreaseQty(productId, qty, product.stock)}
                      disabled={qty >= product.stock}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary/80 text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* ยอดรวมสินค้าแต่ละชิ้น */}
                  <span className="text-sm font-extrabold text-foreground">{baht(itemTotal)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary & Proceed to Checkout */}
      {lines.length > 0 && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>ยอดรวมสินค้า ({lines.length} รายการ):</span>
              <span className="text-sm font-bold text-foreground">{baht(goodsSubtotal)}</span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>ค่าจัดส่งโดยประมาณ:</span>
              <span>{goodsSubtotal >= freeMin ? <strong className="text-success">ส่งฟรี</strong> : "฿30–฿60"}</span>
            </div>

            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
              <span>ยอดชำระโดยประมาณ:</span>
              <span>{baht(goodsSubtotal + (goodsSubtotal >= freeMin ? 0 : 30))}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-accent/15 p-2.5 text-xs text-accent-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Coins className="h-4 w-4 text-accent" /> แต้มสะสมที่จะได้รับ:
            </span>
            <strong className="font-bold">
              +{pointsEarned(goodsSubtotal + (goodsSubtotal >= freeMin ? 0 : 30))} แต้ม
            </strong>
          </div>

          <PrimaryButton
            onClick={() => setStep("checkout")}
            className="mt-4 flex items-center justify-center gap-2"
          >
            <span>ดำเนินการสั่งซื้อ (Checkout)</span>
            <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
