import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { repo } from "./data/repo";
import type { Member, Order, RefundRequest, RequestItem, RequestType } from "./data/types";
import { clampQty } from "./rules";

type CartLine = { productId: string; qty: number };

type StoreCtxType = {
  member: Member | null;
  login: (u: string, p: string) => { success: boolean; error?: string };
  register: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    birthDate: string;
    address: {
      recipient: string;
      phone: string;
      line: string;
      label: string;
    };
    username: string;
    password: string;
  }) => {
    success: boolean;
    error?: string;
  };
  resetPassword: (
    u: string,
    phoneOrEmail: string,
    newP: string
  ) => { success: boolean; message?: string; error?: string };
  changePassword: (
    oldP: string,
    newP: string
  ) => { success: boolean; message?: string; error?: string };
  updateProfile: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    birthDate: string;
  }) => { success: boolean; error?: string };
  simulateCounterPurchase: (amount: number) => { success: boolean; earned: number; receiptNo: string };
  confirmPaymentAndAwardPoints: (orderId: string) => boolean;
  uploadSlip: (
    orderId: string,
    data: string | { slipUrl: string; channel?: string; amount?: number; paidAt?: string }
  ) => boolean;
  rejectPayment: (orderId: string, reason: string) => boolean;
  markAsShipped: (orderId: string, trackingNumber?: string) => boolean;
  confirmDelivery: (orderId: string) => boolean;
  createRefundRequest: (input: {
    orderId: string;
    type: RequestType;
    items: RequestItem[];
    reason: string;
    imageUrl?: string;
  }) => RefundRequest | undefined;
  reviewRefundRequest: (requestId: string, action: "approve" | "reject", note?: string) => boolean;
  markRefundReceived: (requestId: string) => boolean;
  markRefundPaid: (requestId: string) => boolean;
  simulateSendGift: (type: "birthday" | "newyear") => boolean;
  markAllNotificationsRead: () => void;
  logout: () => void;
  refreshMember: () => void;
  cart: CartLine[];
  cartCount: number;
  addToCart: (productId: string, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  qrOpen: boolean;
  setQrOpen: (v: boolean) => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (v: boolean) => void;
  notificationOpen: boolean;
  setNotificationOpen: (v: boolean) => void;
  receiptModalOrder: Order | null;
  setReceiptModalOrder: (o: Order | null) => void;
};

const StoreCtx = createContext<StoreCtxType | null>(null);
const STATE_KEY = "rungarun_session_v2";
const ONBOARDING_SEEN_KEY = "rungarun_onboarded_v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [memberVersion, setMemberVersion] = useState(0);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      setMemberId(s.memberId ?? null);
      setCart(s.cart ?? []);

      // Check if user has seen onboarding
      const onboarded = localStorage.getItem(ONBOARDING_SEEN_KEY);
      if (!onboarded) {
        setOnboardingOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STATE_KEY, JSON.stringify({ memberId, cart }));
    }
  }, [memberId, cart, loaded]);

  const refreshMember = () => setMemberVersion((v) => v + 1);

  const member = memberId ? repo.getMember(memberId) ?? null : null;

  const addToCart = (productId: string, qty = 1) => {
    const p = repo.getProduct(productId);
    if (!p || p.stock <= 0) {
      toast.error("ขออภัย สินค้านี้หมดชั่วคราว");
      return;
    }

    setCart((prev) => {
      const cur = prev.find((l) => l.productId === productId)?.qty ?? 0;
      const target = cur + qty;
      const next = clampQty(target, p.stock);

      if (next < target) {
        toast.warning(`มีสินค้าคงเหลือ ${p.stock} ${p.unit} ปรับจำนวนให้อัตโนมัติ`);
      } else {
        toast.success(`เพิ่ม "${p.name}" ลงในตะกร้าแล้ว`);
      }

      const rest = prev.filter((l) => l.productId !== productId);
      return [...rest, { productId, qty: next }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    const p = repo.getProduct(productId);
    if (!p) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    const next = clampQty(qty, p.stock);
    if (next < qty) {
      toast.warning(`มีสินค้าคงเหลือ ${p.stock} ${p.unit}`);
    }

    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty: next } : l)));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
    toast.info("นำสินค้าออกจากตะกร้าแล้ว");
  };

  const clearCart = () => setCart([]);

  const handleCloseOnboarding = (v: boolean) => {
    setOnboardingOpen(v);
    if (!v) {
      try {
        localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
      } catch {}
    }
  };

  return (
    <StoreCtx.Provider
      value={{
        member,
        login: (u, p) => {
          const res = repo.login(u, p);
          if (res.success && res.member) {
            setMemberId(res.member.id);
            refreshMember();
          }
          return res;
        },
        register: (data) => {
          const res = repo.register(data);
          if (res.success && res.member) {
            setMemberId(res.member.id);
            refreshMember();
          }
          return res;
        },
        resetPassword: (u, contact, newP) => {
          const res = repo.resetPassword(u, contact, newP);
          if (res.success) refreshMember();
          return res;
        },
        changePassword: (oldP, newP) => {
          if (!memberId) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };
          const res = repo.changePassword(memberId, oldP, newP);
          if (res.success) refreshMember();
          return res;
        },
        updateProfile: (data) => {
          if (!memberId) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };
          const res = repo.updateProfile(memberId, data);
          if (res.success) refreshMember();
          return res;
        },
        simulateCounterPurchase: (amount) => {
          if (!memberId) return { success: false, earned: 0, receiptNo: "" };
          const res = repo.simulateCounterPurchase(memberId, amount);
          if (res.success) {
            refreshMember();
            toast.success(`จำลองการซื้อหน้าร้านสำเร็จ! ได้รับ +${res.earned} แต้ม`, {
              description: `ใบเสร็จ ${res.receiptNo} ยอดชำระ ฿${amount.toLocaleString()}`,
            });
          }
          return res;
        },
        confirmPaymentAndAwardPoints: (orderId) => {
          if (!memberId) return false;
          const ok = repo.confirmPaymentAndAwardPoints(memberId, orderId);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        uploadSlip: (orderId, data) => {
          if (!memberId) return false;
          const ok = repo.uploadSlip(memberId, orderId, data);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        rejectPayment: (orderId, reason) => {
          if (!memberId) return false;
          const ok = repo.rejectPayment(memberId, orderId, reason);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        markAsShipped: (orderId, trackingNumber) => {
          if (!memberId) return false;
          const ok = repo.markAsShipped(memberId, orderId, trackingNumber);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        confirmDelivery: (orderId) => {
          if (!memberId) return false;
          const ok = repo.confirmDelivery(memberId, orderId);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        createRefundRequest: (input) => {
          if (!memberId) return undefined;
          const req = repo.createRefundRequest(memberId, input);
          if (req) {
            refreshMember();
          }
          return req;
        },
        reviewRefundRequest: (requestId, action, note) => {
          if (!memberId) return false;
          const ok = repo.reviewRefundRequest(memberId, requestId, action, note);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        markRefundReceived: (requestId) => {
          if (!memberId) return false;
          const ok = repo.markRefundReceived(memberId, requestId);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        markRefundPaid: (requestId) => {
          if (!memberId) return false;
          const ok = repo.markRefundPaid(memberId, requestId);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        simulateSendGift: (type) => {
          if (!memberId) return false;
          const ok = repo.simulateSendGift(memberId, type);
          if (ok) {
            refreshMember();
          }
          return ok;
        },
        markAllNotificationsRead: () => {
          if (!memberId) return;
          repo.markAllNotificationsRead(memberId);
          refreshMember();
        },
        logout: () => {
          setMemberId(null);
          refreshMember();
          toast.info("ออกจากระบบแล้ว");
        },
        refreshMember,
        cart,
        cartCount: cart.reduce((s, l) => s + l.qty, 0),
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        qrOpen,
        setQrOpen,
        onboardingOpen,
        setOnboardingOpen: handleCloseOnboarding,
        notificationOpen,
        setNotificationOpen,
        receiptModalOrder,
        setReceiptModalOrder,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
