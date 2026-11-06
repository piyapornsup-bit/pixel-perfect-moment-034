import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo, PrimaryButton, SecondaryButton } from "@/components/app/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ / สมัครสมาชิก — ร้านรุ่งอรุณ" },
      { name: "description", content: "เข้าสู่ระบบสมาชิกร้านรุ่งอรุณ เพื่อสั่งซื้อและสะสมแต้ม" },
      { property: "og:title", content: "เข้าสู่ระบบ — ร้านรุ่งอรุณ" },
      { property: "og:description", content: "เข้าสู่ระบบสมาชิกร้านรุ่งอรุณ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register" | "forgot";

function LoginPage() {
  const { login, register, resetPassword } = useStore();
  const nav = useNavigate();

  const [mode, setMode] = useState<Mode>("login");

  // Login state
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Register multi-step state (1 | 2 | 3)
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");

  const [regRecipient, setRegRecipient] = useState("");
  const [regRecipientPhone, setRegRecipientPhone] = useState("");
  const [regAddressLine, setRegAddressLine] = useState("");
  const [regAddressLabel, setRegAddressLabel] = useState("บ้าน");

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPass, setRegShowPass] = useState(false);
  const [regMessage, setRegMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Forgot password state
  const [forgotUser, setForgotUser] = useState("");
  const [forgotContact, setForgotContact] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const inputClass =
    "h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground";

  // 1. Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage(null);

    if (!u.trim() || !p) {
      setLoginMessage({ type: "error", text: "กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน" });
      return;
    }

    const res = login(u.trim(), p);
    if (!res.success) {
      setLoginMessage({ type: "error", text: res.error || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" });
      return;
    }

    setLoginMessage({ type: "success", text: "เข้าสู่ระบบสำเร็จ กำลังพาเข้าสู่หน้าแรก..." });
    toast.success("เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ!");
    setTimeout(() => {
      nav({ to: "/" });
    }, 700);
  };

  // 2. Handle Register Step Next / Submit
  const handleRegNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage(null);

    if (regStep === 1) {
      if (!regFirstName.trim() || !regLastName.trim() || !regPhone.trim() || !regEmail.trim() || !regBirthDate) {
        setRegMessage({ type: "error", text: "กรุณากรอกข้อมูลส่วนตัวในขั้นที่ 1 ให้ครบถ้วนทุกช่อง" });
        return;
      }
      // Auto pre-fill recipient in step 2
      if (!regRecipient) setRegRecipient(`${regFirstName.trim()} ${regLastName.trim()}`);
      if (!regRecipientPhone) setRegRecipientPhone(regPhone.trim());
      setRegStep(2);
      return;
    }

    if (regStep === 2) {
      if (!regRecipient.trim() || !regRecipientPhone.trim() || !regAddressLine.trim()) {
        setRegMessage({ type: "error", text: "กรุณากรอกข้อมูลที่อยู่จัดส่งในขั้นที่ 2 ให้ครบถ้วน" });
        return;
      }
      setRegStep(3);
      return;
    }

    if (regStep === 3) {
      if (!regUsername.trim() || !regPassword || !regConfirmPassword) {
        setRegMessage({ type: "error", text: "กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน" });
        return;
      }
      if (regPassword.length < 4) {
        setRegMessage({ type: "error", text: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" });
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setRegMessage({ type: "error", text: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน" });
        return;
      }

      const res = register({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        birthDate: regBirthDate,
        address: {
          recipient: regRecipient.trim(),
          phone: regRecipientPhone.trim(),
          line: regAddressLine.trim(),
          label: regAddressLabel,
        },
        username: regUsername.trim(),
        password: regPassword,
      });

      if (!res.success) {
        setRegMessage({ type: "error", text: res.error || "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
        return;
      }

      setRegMessage({
        type: "success",
        text: "สมัครสมาชิกสำเร็จเรียบร้อย! ได้รับแต้มต้อนรับ 50 แต้ม กำลังพาเข้าหน้าแรก...",
      });
      toast.success("สมัครสมาชิกสำเร็จ! ได้รับแต้มต้อนรับ 50 แต้ม");
      setTimeout(() => {
        nav({ to: "/" });
      }, 900);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    if (!forgotUser.trim() || !forgotContact.trim() || !forgotNewPass) {
      setForgotMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
      return;
    }

    if (forgotNewPass.length < 4) {
      setForgotMessage({ type: "error", text: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร" });
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setForgotMessage({ type: "error", text: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน" });
      return;
    }

    const res = resetPassword(forgotUser.trim(), forgotContact.trim(), forgotNewPass);
    if (!res.success) {
      setForgotMessage({
        type: "error",
        text: res.error || "ไม่พบชื่อผู้ใช้งานนี้ หรือเบอร์โทรศัพท์/อีเมลไม่ตรงกับที่ลงทะเบียนไว้",
      });
      return;
    }

    setForgotMessage({
      type: "success",
      text: res.message || "ตั้งรหัสผ่านใหม่สำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
    });
    toast.success("เปลี่ยนรหัสผ่านสำเร็จ!");

    setTimeout(() => {
      setMode("login");
      setU(forgotUser.trim());
      setP(forgotNewPass);
      setLoginMessage({ type: "success", text: "ตั้งรหัสผ่านใหม่แล้ว กรุณากดเข้าสู่ระบบ" });
    }, 1200);
  };

  return (
    <div className="flex min-h-screen flex-col justify-between px-6 py-6 md:min-h-0 md:py-10">
      <div className="flex flex-col gap-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo />
          <div className="w-10" />
        </div>

        {/* Mode Selector Tabs (เข้าสู่ระบบ / สมัครสมาชิก) */}
        {mode !== "forgot" && (
          <div className="flex rounded-2xl border border-border bg-secondary/50 p-1">
            <button
              onClick={() => {
                setMode("login");
                setLoginMessage(null);
              }}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all",
                mode === "login"
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => {
                setMode("register");
                setRegMessage(null);
              }}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all",
                mode === "register"
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              สมัครสมาชิก
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* 1. เข้าสู่ระบบ (1.1) */}
        {/* ========================================================== */}
        {mode === "login" && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-foreground">เข้าสู่ระบบ</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                เข้าสู่ระบบสมาชิกร้านรุ่งอรุณ เพื่อสะสมแต้มและสั่งซื้อสินค้า
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground">
                <span>ชื่อผู้ใช้งาน</span>
                <input
                  autoComplete="username"
                  value={u}
                  onChange={(e) => {
                    setU(e.target.value);
                    if (loginMessage) setLoginMessage(null);
                  }}
                  placeholder="เช่น somchai"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground">
                <div className="flex items-center justify-between">
                  <span>รหัสผ่าน</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setForgotUser(u);
                      setForgotMessage(null);
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={p}
                    onChange={(e) => {
                      setP(e.target.value);
                      if (loginMessage) setLoginMessage(null);
                    }}
                    placeholder="รหัสผ่านของคุณ"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    aria-label="แสดง/ซ่อนรหัสผ่าน"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              {/* ข้อความแจ้งผล สำเร็จ / ไม่สำเร็จ ใต้ช่องตามสเปก */}
              {loginMessage && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl p-3 text-xs font-medium",
                    loginMessage.type === "success"
                      ? "border border-success/30 bg-success/10 text-success"
                      : "border border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {loginMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{loginMessage.text}</span>
                </div>
              )}

              <PrimaryButton type="submit" className="mt-1">
                เข้าสู่ระบบ
              </PrimaryButton>
            </form>

            {/* Quick Demo Credentials */}
            <div className="rounded-2xl border border-border bg-secondary/50 p-3.5 text-center text-xs">
              <p className="font-semibold text-foreground">บัญชีทดสอบตัวอย่าง:</p>
              <div className="mt-1 flex justify-center gap-2 text-muted-foreground">
                <span>ชื่อผู้ใช้: <strong className="text-foreground">somchai</strong></span>
                <span>·</span>
                <span>รหัสผ่าน: <strong className="text-foreground">1234</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setU("somchai");
                  setP("1234");
                  setLoginMessage(null);
                }}
                className="mt-2 rounded-xl bg-card px-3 py-1 font-semibold text-primary shadow-xs hover:bg-card/80"
              >
                กรอกข้อมูลบัญชีทดสอบอัตโนมัติ
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 2. สมัครสมาชิก ฟอร์มหลายขั้น 3 ขั้นตอน (1.2) */}
        {/* ========================================================== */}
        {mode === "register" && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-foreground">สมัครสมาชิกใหม่</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                สมัครได้ที่แอปเท่านั้น รับแต้มต้อนรับฟรี 50 แต้ม
              </p>
            </div>

            {/* Step Indicator (1 -> 2 -> 3) */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-xs">
              {[
                { s: 1, label: "ข้อมูลส่วนตัว" },
                { s: 2, label: "ที่อยู่จัดส่ง" },
                { s: 3, label: "บัญชีผู้ใช้" },
              ].map(({ s, label }) => {
                const isActive = regStep === s;
                const isPassed = regStep > s;
                return (
                  <div key={s} className="flex flex-1 items-center gap-1.5 justify-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isPassed
                            ? "bg-success text-white"
                            : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {isPassed ? <Check className="h-3.5 w-3.5" /> : s}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleRegNextStep} className="flex flex-col gap-3">
              {/* STEP 1: ข้อมูลส่วนตัว (ชื่อ นามสกุล เบอร์โทรศัพท์ อีเมล วันเดือนปีเกิด) */}
              {regStep === 1 && (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                      <span>ชื่อ *</span>
                      <input
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="ชื่อจริง"
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                      <span>นามสกุล *</span>
                      <input
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="นามสกุล"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>เบอร์โทรศัพท์ติดต่อ *</span>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>อีเมล *</span>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="เช่น name@email.com"
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>วันเดือนปีเกิด *</span>
                    <input
                      type="date"
                      value={regBirthDate}
                      onChange={(e) => setRegBirthDate(e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      * เพื่อรับของขวัญและสิทธิพิเศษในเดือนเกิด
                    </span>
                  </label>
                </div>
              )}

              {/* STEP 2: ที่อยู่จัดส่ง (ชื่อผู้รับ เบอร์ผู้รับ ที่อยู่) */}
              {regStep === 2 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    {["บ้าน", "ที่ทำงาน", "อื่น ๆ"].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setRegAddressLabel(lbl)}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-semibold",
                          regAddressLabel === lbl ? "bg-primary text-white" : "border border-border bg-card"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>ชื่อผู้รับพัสดุ *</span>
                    <input
                      value={regRecipient}
                      onChange={(e) => setRegRecipient(e.target.value)}
                      placeholder="ชื่อผู้รับ"
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>เบอร์โทรศัพท์ผู้รับ *</span>
                    <input
                      type="tel"
                      value={regRecipientPhone}
                      onChange={(e) => setRegRecipientPhone(e.target.value)}
                      placeholder="เบอร์โทรติดต่อผู้รับ"
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>ที่อยู่จัดส่ง *</span>
                    <textarea
                      rows={3}
                      value={regAddressLine}
                      onChange={(e) => setRegAddressLine(e.target.value)}
                      placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      className="rounded-2xl border border-border bg-card p-3 text-xs outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      * ระบบจะตั้งค่าเป็น "ที่อยู่หลัก" สำหรับจัดส่งของขวัญและคำสั่งซื้อ
                    </span>
                  </label>
                </div>
              )}

              {/* STEP 3: บัญชีผู้ใช้ (ชื่อผู้ใช้งาน รหัสผ่าน ยืนยันรหัสผ่าน) */}
              {regStep === 3 && (
                <div className="flex flex-col gap-2.5">
                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>ชื่อผู้ใช้งาน (Username) *</span>
                    <input
                      autoComplete="username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="ภาษาอังกฤษหรือตัวเลข"
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>รหัสผ่าน *</span>
                    <div className="relative">
                      <input
                        type={regShowPass ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="อย่างน้อย 4 ตัวอักษร"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPass(!regShowPass)}
                        className="absolute right-3.5 top-3.5 text-muted-foreground"
                      >
                        {regShowPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                    <span>ยืนยันรหัสผ่าน *</span>
                    <input
                      type={regShowPass ? "text" : "password"}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      className={inputClass}
                    />
                  </label>
                </div>
              )}

              {/* ข้อความแจ้งผล สำเร็จ / ไม่สำเร็จ ใต้ช่อง */}
              {regMessage && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl p-3 text-xs font-medium",
                    regMessage.type === "success"
                      ? "border border-success/30 bg-success/10 text-success"
                      : "border border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {regMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{regMessage.text}</span>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="mt-2 flex gap-2">
                {regStep > 1 && (
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setRegStep((s) => (s - 1) as 1 | 2);
                      setRegMessage(null);
                    }}
                    className="w-28"
                  >
                    ย้อนกลับ
                  </SecondaryButton>
                )}
                <PrimaryButton type="submit" className="flex-1">
                  {regStep === 3 ? "ยืนยันการสมัครสมาชิก" : "ขั้นตอนถัดไป"}
                  <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================== */}
        {/* 3. ลืมรหัสผ่าน (1.1) */}
        {/* ========================================================== */}
        {mode === "forgot" && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-foreground">ลืมรหัสผ่าน</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                กรอกชื่อผู้ใช้งาน + เบอร์โทรศัพท์หรืออีเมลที่ลงทะเบียนเพื่อตั้งรหัสผ่านใหม่
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                <span>ชื่อผู้ใช้งาน *</span>
                <input
                  required
                  value={forgotUser}
                  onChange={(e) => {
                    setForgotUser(e.target.value);
                    if (forgotMessage) setForgotMessage(null);
                  }}
                  placeholder="เช่น somchai"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                <span>เบอร์โทรศัพท์ หรือ อีเมลที่ลงทะเบียน *</span>
                <input
                  required
                  value={forgotContact}
                  onChange={(e) => {
                    setForgotContact(e.target.value);
                    if (forgotMessage) setForgotMessage(null);
                  }}
                  placeholder="เช่น 081-234-5678 หรือ somchai@email.com"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                <span>ตั้งรหัสผ่านใหม่ *</span>
                <div className="relative">
                  <input
                    required
                    type={forgotShowPass ? "text" : "password"}
                    value={forgotNewPass}
                    onChange={(e) => {
                      setForgotNewPass(e.target.value);
                      if (forgotMessage) setForgotMessage(null);
                    }}
                    placeholder="รหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setForgotShowPass(!forgotShowPass)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground"
                  >
                    {forgotShowPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                <span>ยืนยันรหัสผ่านใหม่ *</span>
                <input
                  required
                  type={forgotShowPass ? "text" : "password"}
                  value={forgotConfirmPass}
                  onChange={(e) => {
                    setForgotConfirmPass(e.target.value);
                    if (forgotMessage) setForgotMessage(null);
                  }}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className={inputClass}
                />
              </label>

              {/* ข้อความแจ้งผล สำเร็จ / ไม่สำเร็จ ใต้ช่อง */}
              {forgotMessage && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl p-3 text-xs font-medium",
                    forgotMessage.type === "success"
                      ? "border border-success/30 bg-success/10 text-success"
                      : "border border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {forgotMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              <PrimaryButton type="submit" className="mt-1">
                บันทึกรหัสผ่านใหม่
              </PrimaryButton>

              <SecondaryButton
                type="button"
                onClick={() => {
                  setMode("login");
                  setForgotMessage(null);
                }}
              >
                กลับไปหน้าเข้าสู่ระบบ
              </SecondaryButton>
            </form>
          </div>
        )}
      </div>

      {/* Guest browse link */}
      <div className="pt-6 text-center">
        <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          ข้ามไปดูสินค้าในร้านโดยยังไม่เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
