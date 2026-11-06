import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Gift,
  HelpCircle,
  History,
  KeyRound,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  Receipt,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  LoginRequired,
  Pill,
  PrimaryButton,
  SecondaryButton,
} from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import type { Address } from "@/lib/data/types";
import { baht, formatThaiDate } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "บัญชีของฉัน — ร้านรุ่งอรุณ" },
      { name: "description", content: "จัดการข้อมูลส่วนตัว ที่อยู่จัดส่ง แต้มสะสม และประวัติการซื้อ" },
      { property: "og:title", content: "บัญชีของฉัน — ร้านรุ่งอรุณ" },
      { property: "og:description", content: "จัดการข้อมูลสมาชิกร้านรุ่งอรุณ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

type SectionTab = "overview" | "profile" | "addresses" | "purchases" | "points" | "security" | "gifts";

function AccountPage() {
  const {
    member,
    logout,
    refreshMember,
    setQrOpen,
    setOnboardingOpen,
    setReceiptModalOrder,
    updateProfile,
    changePassword,
    simulateCounterPurchase,
    simulateSendGift,
  } = useStore();
  const nav = useNavigate();

  const [activeTab, setActiveTab] = useState<SectionTab>("overview");

  // Edit Profile Form State
  const [editFirstName, setEditFirstName] = useState(member?.firstName || "");
  const [editLastName, setEditLastName] = useState(member?.lastName || "");
  const [editPhone, setEditPhone] = useState(member?.phone || "");
  const [editEmail, setEditEmail] = useState(member?.email || "");
  const [editBirthDate, setEditBirthDate] = useState(member?.birthDate || "");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Change Password Form State (1.1: ต้องกรอกรหัสผ่านเดิมด้วย)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addrLabel, setAddrLabel] = useState("บ้าน");
  const [addrRecipient, setAddrRecipient] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine, setAddrLine] = useState("");
  const [addrIsPrimary, setAddrIsPrimary] = useState(false);

  // Filter for Purchase history
  const [purchaseFilter, setPurchaseFilter] = useState<"all" | "online" | "pos">("all");

  // Counter purchase simulation modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simAmount, setSimAmount] = useState(150);

  if (!member) {
    return <LoginRequired title="บัญชีของฉัน" />;
  }

  // Handle Edit Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!editFirstName.trim() || !editLastName.trim() || !editPhone.trim() || !editEmail.trim()) {
      setProfileMsg({ type: "error", text: "กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน" });
      return;
    }

    const res = updateProfile({
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      birthDate: editBirthDate,
    });

    if (res.success) {
      setProfileMsg({ type: "success", text: "บันทึกการแก้ไขข้อมูลส่วนตัวสำเร็จแล้ว" });
      toast.success("บันทึกข้อมูลส่วนตัวเรียบร้อย");
    } else {
      setProfileMsg({ type: "error", text: res.error || "ไม่สามารถบันทึกข้อมูลได้" });
    }
  };

  // Handle Change Password Save (1.1)
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassMsg({ type: "error", text: "กรุณากรอกรหัสผ่านให้ครบทุกช่อง" });
      return;
    }

    if (newPassword.length < 4) {
      setPassMsg({ type: "error", text: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน" });
      return;
    }

    const res = changePassword(oldPassword, newPassword);
    if (!res.success) {
      setPassMsg({ type: "error", text: res.error || "รหัสผ่านเดิมไม่ถูกต้อง" });
      return;
    }

    setPassMsg({ type: "success", text: "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!" });
    toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Address Actions (Enforces 1 Primary Address Only)
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddrLabel("บ้าน");
    setAddrRecipient(member.fullName);
    setAddrPhone(member.phone);
    setAddrLine("");
    setAddrIsPrimary(member.addresses.length === 0);
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddrLabel(addr.label);
    setAddrRecipient(addr.recipient);
    setAddrPhone(addr.phone);
    setAddrLine(addr.line);
    setAddrIsPrimary(addr.isPrimary);
    setShowAddressModal(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrRecipient.trim() || !addrPhone.trim() || !addrLine.trim()) {
      toast.error("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน");
      return;
    }

    if (editingAddress) {
      repo.updateAddress(member.id, {
        id: editingAddress.id,
        label: addrLabel,
        recipient: addrRecipient.trim(),
        phone: addrPhone.trim(),
        line: addrLine.trim(),
        isPrimary: addrIsPrimary,
      });
      toast.success("บันทึกการแก้ไขที่อยู่แล้ว");
    } else {
      repo.addAddress(member.id, {
        label: addrLabel,
        recipient: addrRecipient.trim(),
        phone: addrPhone.trim(),
        line: addrLine.trim(),
        isPrimary: addrIsPrimary,
      });
      toast.success("เพิ่มที่อยู่ใหม่แล้ว");
    }

    refreshMember();
    setShowAddressModal(false);
  };

  const handleDeleteAddress = (id: string) => {
    repo.deleteAddress(member.id, id);
    refreshMember();
    toast.info("ลบที่อยู่จัดส่งแล้ว");
  };

  const handleSetPrimaryAddress = (id: string) => {
    repo.setPrimaryAddress(member.id, id);
    refreshMember();
    toast.success("ตั้งเป็นที่อยู่หลักเรียบร้อย (มีที่อยู่หลักได้ 1 รายการ)");
  };

  // Filter Purchase History
  const filteredPurchases = (member.purchaseHistory ?? []).filter((p) => {
    if (purchaseFilter === "online") return p.channel === "ออนไลน์";
    if (purchaseFilter === "pos") return p.channel === "หน้าร้านเคาน์เตอร์";
    return true;
  });

  return (
    <div className="flex flex-col gap-4 p-4 pb-12">
      {/* 1. Header Member Card: แสดงชื่อ รหัสสมาชิก แต้มสะสมคงเหลือ และมูลค่าแลกได้ (1.3 & 1.4) */}
      <div className="relative overflow-hidden rounded-3xl bg-sunrise p-5 text-primary-foreground shadow-frame">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-xs shadow-soft">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{member.fullName}</h1>
              <p className="text-xs text-white/85">
                รหัสสมาชิก: <strong className="font-mono tracking-wider">{member.id}</strong>
              </p>
              <p className="text-[11px] text-white/70">@{member.username} · {member.phone}</p>
            </div>
          </div>
          <button
            onClick={() => setQrOpen(true)}
            aria-label="เปิด QR สมาชิก"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-soft transition-transform hover:scale-105 active:scale-95"
            title="แสดง QR สมาชิก"
          >
            <QrCode className="h-6 w-6" />
          </button>
        </div>

        {/* Points Card (1.4: แต้มคงเหลือและมูลค่าที่แลกได้ 10 แต้ม = 1 บาท) */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 p-3.5 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/30 text-accent">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="text-[11px] text-white/80">แต้มสะสมคงเหลือ</span>
              <p className="text-xl font-extrabold text-white">
                {member.points.toLocaleString("th-TH")}{" "}
                <span className="text-xs font-normal text-white/80">แต้ม</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/80">มูลค่าส่วนลด (10 แต้ม = ฿1)</span>
            <p className="text-base font-bold text-white">
              ฿{Math.floor(member.points / 10).toLocaleString("th-TH")}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border pb-2">
        {[
          { id: "overview", label: "ภาพรวม" },
          { id: "profile", label: "แก้ไขข้อมูลส่วนตัว" },
          { id: "addresses", label: `ที่อยู่ (${member.addresses.length})` },
          { id: "gifts", label: `ประวัติของขวัญ (${member.giftHistory?.length ?? 0})` },
          { id: "purchases", label: `ประวัติซื้อ (${member.purchaseHistory?.length ?? 0})` },
          { id: "points", label: "ประวัติแต้ม" },
          { id: "security", label: "รหัสผ่าน & ความปลอดภัย" },
        ].map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as SectionTab)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ========================================================== */}
      {/* TAB: OVERVIEW */}
      {/* ========================================================== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-3">
          {/* Birthday & New Year Gift Notification Box */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs shadow-soft">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Gift className="h-4 w-4 text-amber-600" />
              <span>ของขวัญวันเกิดและเทศกาลปีใหม่</span>
            </div>
            <p className="mt-1 leading-relaxed text-amber-800">
              ร้านรุ่งอรุณจัดส่งของขวัญพิเศษให้สมาชิกตามที่อยู่หลักโดยตรง สมาชิกจะได้รับการแจ้งเตือนอัตโนมัติเมื่อจัดส่ง
            </p>
          </div>

          {/* Quick Menu List */}
          <div className="rounded-2xl border border-border bg-card p-2 shadow-soft divide-y divide-border">
            <button
              onClick={() => setQrOpen(true)}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="h-4 w-4 text-primary" />
                <span>แสดง QR สมาชิก (ปรับความสว่างสูงสุด)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-4 w-4 text-primary" />
                <span>แก้ไขข้อมูลส่วนตัว (ชื่อ, เบอร์, อีเมล, วันเกิด)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span>จัดการที่อยู่จัดส่ง (1 ที่อยู่หลัก)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setActiveTab("gifts")}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <Gift className="h-4 w-4 text-accent" />
                <span>ประวัติของขวัญ (วันเกิด & ปีใหม่)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setActiveTab("purchases")}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <span>ประวัติการซื้อทุกช่องทาง (ออนไลน์ & หน้าร้าน)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setActiveTab("points")}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <Coins className="h-4 w-4 text-accent" />
                <span>แต้มสะสมและประวัติแต้ม ({member.points} แต้ม)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>เปลี่ยนรหัสผ่าน & ประวัติการเข้าสู่ระบบ</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setOnboardingOpen(true)}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>แนะนำการใช้งานแอป (เปิดดูสไลด์)</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Test Action: Simulate Cashier Counter Purchase (1.4 test button) */}
          <div className="rounded-2xl border border-dashed border-accent/60 bg-accent/5 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-accent-foreground flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-accent" /> ทดสอบซื้อสินค้าที่เคาน์เตอร์หน้าร้าน
                </p>
                <p className="text-[11px] text-muted-foreground">
                  จำลองการสแกน QR หน้าร้าน (ซื้อครบ 50 บาท ได้ 5 แต้ม)
                </p>
              </div>
              <button
                onClick={() => setShowSimulateModal(true)}
                className="rounded-xl bg-accent px-3 py-1.5 font-bold text-accent-foreground shadow-xs hover:bg-accent/80 text-xs"
              >
                จำลองซื้อ
              </button>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              nav({ to: "/" });
            }}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: EDIT PROFILE (1.3: ชื่อ นามสกุล เบอร์ อีเมล วันเกิด) */}
      {/* ========================================================== */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="text-sm font-bold text-foreground">แก้ไขข้อมูลส่วนตัว</h2>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
              <span>ชื่อ *</span>
              <input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
              <span>นามสกุล *</span>
              <input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary text-xs"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
            <span>เบอร์โทรศัพท์ *</span>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary text-xs"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
            <span>อีเมล *</span>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary text-xs"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
            <span>วันเดือนปีเกิด *</span>
            <input
              type="date"
              value={editBirthDate}
              onChange={(e) => setEditBirthDate(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary text-xs"
            />
          </label>

          <div className="rounded-xl bg-secondary/50 p-2.5 text-[11px] text-muted-foreground">
            ชื่อผู้ใช้งาน: <strong className="text-foreground">@{member.username}</strong> (ไม่สามารถเปลี่ยนชื่อผู้ใช้งานได้)
          </div>

          {/* Feedback message below inputs */}
          {profileMsg && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium",
                profileMsg.type === "success"
                  ? "border border-success/30 bg-success/10 text-success"
                  : "border border-destructive/30 bg-destructive/10 text-destructive"
              )}
            >
              {profileMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <PrimaryButton type="submit" className="mt-1 h-11 text-xs">
            บันทึกการเปลี่ยนแปลง
          </PrimaryButton>
        </form>
      )}

      {/* ========================================================== */}
      {/* TAB: ADDRESSES (1.3: เพิ่ม แก้ไข ลบ 1 ที่อยู่หลักเท่านั้น) */}
      {/* ========================================================== */}
      {activeTab === "addresses" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">จัดการที่อยู่จัดส่ง</h2>
              <p className="text-[11px] text-muted-foreground">มีที่อยู่หลักได้เพียง 1 รายการเท่านั้น</p>
            </div>
            <button
              onClick={handleOpenAddAddress}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> เพิ่มที่อยู่ใหม่
            </button>
          </div>

          {/* ข้อความเตือนในหน้าที่อยู่ว่า "ของขวัญจะส่งตามที่อยู่หลักของคุณ" (1.5) */}
          <div className="flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3.5 text-xs text-accent-foreground shadow-soft">
            <Gift className="h-4 w-4 shrink-0 text-accent" />
            <span className="font-semibold">ของขวัญจะส่งตามที่อยู่หลักของคุณ</span>
          </div>

          {member.addresses.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              ยังไม่มีที่อยู่จัดส่ง กด "เพิ่มที่อยู่ใหม่" เพื่อบันทึกที่อยู่
            </div>
          ) : (
            member.addresses.map((addr) => (
              <div
                key={addr.id}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-soft transition-all",
                  addr.isPrimary ? "border-primary/50 bg-primary/2" : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">{addr.label}</span>
                    {addr.isPrimary && <Pill tone="primary">ที่อยู่หลัก</Pill>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditAddress(addr)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      แก้ไข
                    </button>
                    {!addr.isPrimary && (
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs font-medium text-foreground">{addr.recipient} ({addr.phone})</p>
                <p className="text-xs text-muted-foreground">{addr.line}</p>

                {!addr.isPrimary && (
                  <button
                    onClick={() => handleSetPrimaryAddress(addr.id)}
                    className="self-start text-[11px] font-semibold text-primary hover:underline mt-1"
                  >
                    ตั้งเป็นที่อยู่หลัก
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: GIFTS (1.5: เมนู "ประวัติของขวัญ" แสดงรายการที่เคยได้รับ) */}
      {/* ========================================================== */}
      {activeTab === "gifts" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">ประวัติของขวัญ</h2>
              <p className="text-[11px] text-muted-foreground">ของขวัญวันเกิดและเทศกาลปีใหม่</p>
            </div>
            <Pill tone="accent">
              <Gift className="h-3 w-3 mr-0.5" /> สิทธิพิเศษสมาชิก
            </Pill>
          </div>

          {/* ข้อความเตือน "ของขวัญจะส่งตามที่อยู่หลักของคุณ" */}
          <div className="flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3.5 text-xs text-accent-foreground shadow-soft">
            <Gift className="h-4 w-4 shrink-0 text-accent" />
            <div>
              <p className="font-bold">ของขวัญจะส่งตามที่อยู่หลักของคุณ</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ร้านรุ่งอรุณจะจัดส่งของขวัญให้โดยตรงตามที่อยู่หลัก กรุณาตรวจสอบให้เป็นปัจจุบัน
              </p>
            </div>
          </div>

          {/* Developer test button for simulating receiving gift */}
          <div className="rounded-2xl border border-dashed border-accent/60 bg-card p-3 text-xs">
            <p className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> ทดสอบจำลองการจัดส่งของขวัญ
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  simulateSendGift("birthday");
                  toast.success("จำลอง: ร้านค้าจัดส่งของขวัญวันเกิดเรียบร้อยแล้ว! ส่งการแจ้งเตือนถึงคุณแล้ว");
                }}
                className="flex-1 rounded-xl bg-accent/20 px-2.5 py-2 text-xs font-bold text-accent-foreground hover:bg-accent/30 transition-colors"
              >
                🎂 ส่งของขวัญวันเกิด
              </button>
              <button
                type="button"
                onClick={() => {
                  simulateSendGift("newyear");
                  toast.success("จำลอง: ร้านค้าจัดส่งของขวัญปีใหม่เรียบร้อยแล้ว! ส่งการแจ้งเตือนถึงคุณแล้ว");
                }}
                className="flex-1 rounded-xl bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                🎉 ส่งของขวัญปีใหม่
              </button>
            </div>
          </div>

          {/* Gift Records List */}
          <div className="flex flex-col gap-2.5">
            {(!member.giftHistory || member.giftHistory.length === 0) ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-semibold text-foreground">ยังไม่มีประวัติของขวัญที่ได้รับ</p>
                <p className="mt-0.5">เมื่อถึงวันเกิดหรือเทศกาลปีใหม่ ร้านรุ่งอรุณจะจัดส่งของขวัญพิเศษให้คุณ</p>
              </div>
            ) : (
              member.giftHistory.map((gift) => (
                <div
                  key={gift.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
                        <Gift className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-xs">{gift.title}</span>
                        <p className="text-[10px] text-muted-foreground">{formatThaiDate(gift.shippedDate)}</p>
                      </div>
                    </div>
                    <Pill tone={gift.status === "จัดส่งสำเร็จ" ? "success" : "primary"}>
                      {gift.status}
                    </Pill>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">รายการของขวัญ:</span>
                      <strong className="text-primary text-right flex-1 pl-2">{gift.giftItem}</strong>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground shrink-0">ที่อยู่จัดส่ง:</span>
                      <span className="text-right flex-1 pl-2 text-foreground">{gift.shippingAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ผู้รับ:</span>
                      <span>{gift.recipient} ({gift.phone})</span>
                    </div>
                    {gift.trackingNumber && (
                      <div className="flex justify-between items-center border-t border-border pt-1.5 mt-1">
                        <span className="text-muted-foreground">หมายเลขพัสดุ:</span>
                        <span className="font-mono font-bold text-foreground">{gift.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: PURCHASES (1.3: ประวัติการซื้อทุกช่องทาง ออนไลน์ และ หน้าร้าน) */}
      {/* ========================================================== */}
      {activeTab === "purchases" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">ประวัติการซื้อทุกช่องทาง</h2>
            <span className="text-xs text-muted-foreground">{filteredPurchases.length} รายการ</span>
          </div>

          {/* Filter Channel */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "online", label: "สั่งซื้อออนไลน์" },
              { id: "pos", label: "หน้าร้านเคาน์เตอร์" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setPurchaseFilter(id as "all" | "online" | "pos")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                  purchaseFilter === id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Purchases List */}
          <div className="flex flex-col gap-2.5">
            {filteredPurchases.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">ไม่มีประวัติการซื้อในหมวดนี้</p>
            ) : (
              filteredPurchases.map((pur) => (
                <div
                  key={pur.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill tone={pur.channel === "ออนไลน์" ? "primary" : "accent"}>
                        {pur.channel === "ออนไลน์" ? <ShoppingBag className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                        {pur.channel}
                      </Pill>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">
                        {pur.receiptNo || pur.orderId || pur.id}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatThaiDate(pur.date)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-foreground">{pur.description}</p>

                  <div className="flex items-center justify-between border-t border-border/80 pt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">ยอดชำระ: </span>
                      <strong className="text-primary font-extrabold">{baht(pur.total)}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      {pur.pointsUsed > 0 && (
                        <span className="text-destructive font-semibold">
                          ใช้แต้ม -{pur.pointsUsed}
                        </span>
                      )}
                      {pur.pointsEarned > 0 && (
                        <span className="text-success font-bold">
                          ได้รับ +{pur.pointsEarned} แต้ม
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: POINTS (1.4: แต้มสะสมและประวัติแต้ม) */}
      {/* ========================================================== */}
      {activeTab === "points" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-xs text-accent-foreground shadow-soft">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" /> กติกาการสะสมและใช้แต้ม (1.4)
            </p>
            <ul className="mt-2 list-disc pl-4 space-y-1 text-muted-foreground">
              <li><strong>อัตราได้รับแต้ม:</strong> ซื้อครบทุก 50 บาท ได้รับ 5 แต้ม (ปัดลง) จากยอดชำระจริง</li>
              <li><strong>อัตราแลกส่วนลด:</strong> 10 แต้ม = ส่วนลด 1 บาท (ใช้เป็นจำนวนเต็มทีละ 10 แต้ม)</li>
              <li>ใช้ได้ทุกช่องทาง ทั้งสั่งออนไลน์ในแอปและสแกน QR สมาชิกที่เคาน์เตอร์หน้าร้าน</li>
            </ul>
          </div>

          <h2 className="text-sm font-bold text-foreground">ประวัติแต้มสะสมทั้งหมด</h2>
          <div className="flex flex-col gap-2">
            {(member.pointsHistory ?? []).map((item) => {
              const isPositive = item.points > 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-soft"
                >
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-semibold text-foreground">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground">{formatThaiDate(item.date)}</p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-extrabold",
                      isPositive ? "text-success" : "text-destructive"
                    )}
                  >
                    {isPositive ? `+${item.points}` : item.points} แต้ม
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: SECURITY (1.1: เปลี่ยนรหัสผ่าน ต้องกรอกรหัสผ่านเดิมด้วย + ประวัติเข้าสู่ระบบ) */}
      {/* ========================================================== */}
      {activeTab === "security" && (
        <div className="flex flex-col gap-4">
          {/* Change Password Form (1.1) */}
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="text-sm font-bold text-foreground">เปลี่ยนรหัสผ่าน</h2>
            <p className="text-[11px] text-muted-foreground">
              ต้องกรอกรหัสผ่านเดิมเพื่อยืนยันความปลอดภัยก่อนตั้งรหัสผ่านใหม่
            </p>

            <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
              <span>รหัสผ่านเดิม *</span>
              <div className="relative">
                <input
                  required
                  type={showPass ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านเดิม"
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
              <span>รหัสผ่านใหม่ *</span>
              <input
                required
                type={showPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 4 ตัวอักษร"
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
              <span>ยืนยันรหัสผ่านใหม่ *</span>
              <input
                required
                type={showPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
              />
            </label>

            {/* ข้อความแจ้งผล สำเร็จ / ไม่สำเร็จ ใต้ช่อง */}
            {passMsg && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium",
                  passMsg.type === "success"
                    ? "border border-success/30 bg-success/10 text-success"
                    : "border border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                {passMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{passMsg.text}</span>
              </div>
            )}

            <PrimaryButton type="submit" className="mt-1 h-11 text-xs">
              ยืนยันการเปลี่ยนรหัสผ่าน
            </PrimaryButton>
          </form>

          {/* Login History List (1.1: บันทึกประวัติเข้าใช้งาน วันที่และเวลา) */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <History className="h-4 w-4 text-primary" /> ประวัติการเข้าสู่ระบบ
            </h2>
            <p className="text-[11px] text-muted-foreground">
              บันทึกวันและเวลาที่เข้าใช้งานบัญชีของคุณ
            </p>

            <div className="divide-y divide-border mt-1">
              {(member.loginHistory ?? []).map((lh) => (
                <div key={lh.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{lh.device || "มือถือ (Mobile App)"}</p>
                    <p className="text-[11px] text-muted-foreground">{formatThaiDate(lh.timestamp)}</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    สำเร็จ
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADDRESS MODAL (ADD / EDIT) */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveAddress}
            className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card p-5 shadow-frame"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground">
                {editingAddress ? "แก้ไขที่อยู่จัดส่ง" : "เพิ่มที่อยู่จัดส่งใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 flex flex-col gap-3 text-xs">
              <div>
                <span className="mb-1 block font-medium text-foreground">ป้ายกำกับ</span>
                <div className="flex gap-2">
                  {["บ้าน", "ที่ทำงาน", "อื่น ๆ"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddrLabel(lbl)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 font-semibold transition-colors",
                        addrLabel === lbl ? "bg-primary text-white" : "border border-border bg-secondary/50 text-foreground"
                      )}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground">ชื่อ-นามสกุล ผู้รับ *</span>
                <input
                  required
                  value={addrRecipient}
                  onChange={(e) => setAddrRecipient(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground">เบอร์โทรศัพท์ *</span>
                <input
                  required
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground">ที่อยู่จัดส่ง *</span>
                <textarea
                  required
                  rows={3}
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  placeholder="บ้านเลขที่ ถนน ซอย แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  className="rounded-xl border border-border bg-card p-2.5 outline-none focus:border-primary"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={addrIsPrimary}
                  onChange={(e) => setAddrIsPrimary(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-foreground">ตั้งเป็นที่อยู่จัดส่งหลัก (1 ที่อยู่หลักเท่านั้น)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <SecondaryButton type="button" onClick={() => setShowAddressModal(false)} className="flex-1 text-xs">
                ยกเลิก
              </SecondaryButton>
              <PrimaryButton type="submit" className="flex-1 text-xs">
                บันทึก
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}

      {/* SIMULATE COUNTER PURCHASE MODAL */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card p-5 shadow-frame">
            <h3 className="font-bold text-foreground">จำลองซื้อสินค้าที่เคาน์เตอร์หน้าร้าน</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              ทดสอบการสแกน QR สมาชิกที่เคาน์เตอร์ ทุก 50 บาท ได้รับ 5 แต้ม
            </p>

            <div className="my-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">ระบุยอดชำระที่เคาน์เตอร์ (บาท):</label>
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 150, 300, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimAmount(amt)}
                    className={cn(
                      "rounded-xl py-2 text-xs font-bold transition-all",
                      simAmount === amt
                        ? "bg-primary text-white"
                        : "border border-border bg-secondary/50 text-foreground"
                    )}
                  >
                    ฿{amt} (+{Math.floor(amt / 50) * 5} แต้ม)
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <SecondaryButton onClick={() => setShowSimulateModal(false)} className="flex-1 text-xs">
                ยกเลิก
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  simulateCounterPurchase(simAmount);
                  setShowSimulateModal(false);
                }}
                className="flex-1 text-xs"
              >
                ยืนยันการซื้อ (+{Math.floor(simAmount / 50) * 5} แต้ม)
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
