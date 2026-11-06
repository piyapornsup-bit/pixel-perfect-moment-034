import { categories, members as initialMembers, products as initialProducts, promotions, storeSettings } from "./mock";
import type {
  Address,
  GiftRecord,
  Member,
  Order,
  OrderItem,
  Product,
  PurchaseRecord,
  RefundRequest,
  RequestItem,
  RequestStatus,
  RequestType,
  StoreSettings,
} from "./types";
import { isOrderExpired, isPromotionActive, pointsEarned } from "../rules";

// Local storage key for members state persistence
const MEMBERS_STORAGE_KEY = "rungarun_members_v2";
const PRODUCTS_STORAGE_KEY = "rungarun_products_v2";

function loadProducts(): Product[] {
  if (typeof window === "undefined") return initialProducts;
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load products from localStorage", e);
  }
  return initialProducts;
}

function saveProducts(productList: Product[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(productList));
  } catch (e) {
    console.error("Failed to save products to localStorage", e);
  }
}

function loadMembers(): Member[] {
  if (typeof window === "undefined") return initialMembers;
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load members from localStorage", e);
  }
  return initialMembers;
}

function saveMembers(membersList: Member[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(membersList));
  } catch (e) {
    console.error("Failed to save members to localStorage", e);
  }
}

let membersCache: Member[] = loadMembers();
let productsCache: Product[] = loadProducts();

export const repo = {
  listCategories: () => categories,

  listProducts: (): Product[] => {
    productsCache = loadProducts();
    return productsCache;
  },

  getProduct: (id: string): Product | undefined => {
    productsCache = loadProducts();
    return productsCache.find((p) => p.id === id);
  },

  checkStock: (items: { productId: string; qty: number }[]): { valid: boolean; error?: string } => {
    productsCache = loadProducts();
    for (const item of items) {
      const p = productsCache.find((x) => x.id === item.productId);
      if (!p) {
        return { valid: false, error: `ไม่พบสินค้ารหัส ${item.productId} ในระบบ` };
      }
      if (p.stock <= 0) {
        return { valid: false, error: `ขออภัย สินค้า "${p.name}" หมดชั่วคราว` };
      }
      if (p.stock < item.qty) {
        return {
          valid: false,
          error: `สินค้า "${p.name}" มีจำนวนไม่เพียงพอ (คงเหลือ ${p.stock} ${p.unit}, คุณต้องการ ${item.qty} ${p.unit})`,
        };
      }
    }
    return { valid: true };
  },

  deductStock: (items: { productId: string; qty: number }[]) => {
    productsCache = loadProducts();
    for (const item of items) {
      const p = productsCache.find((x) => x.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.qty);
      }
    }
    saveProducts(productsCache);
  },

  restoreStock: (items: { productId: string; qty: number }[]) => {
    productsCache = loadProducts();
    for (const item of items) {
      const p = productsCache.find((x) => x.id === item.productId);
      if (p) {
        p.stock += item.qty;
      }
    }
    saveProducts(productsCache);
  },

  listPromotions: (type?: "all" | "promo" | "news"): Promotion[] => {
    return promotions.filter((p) => {
      // Hide expired items
      if (!isPromotionActive(p)) return false;
      if (type === "promo") return p.type === "promo";
      if (type === "news") return p.type === "news";
      return true;
    });
  },

  getSettings: (): StoreSettings => storeSettings,

  login: (username: string, password: string): { success: boolean; error?: string; member?: Member } => {
    const cleanUser = username.trim().toLowerCase();
    membersCache = loadMembers();
    const found = membersCache.find(
      (m) => m.username.toLowerCase() === cleanUser
    );

    if (!found) {
      return { success: false, error: "ไม่พบชื่อผู้ใช้งานนี้ในระบบ" };
    }

    if (found.password !== password) {
      return { success: false, error: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
    }

    // Record login history
    const nowIso = new Date().toISOString();
    if (!found.loginHistory) found.loginHistory = [];
    found.loginHistory.unshift({
      id: `LH-${Date.now()}`,
      timestamp: nowIso,
      device: "มือถือ (Mobile App)",
    });

    // Check expired orders
    repo.checkAndExpireOrders(found.id);

    saveMembers(membersCache);
    return { success: true, member: found };
  },

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
  }): { success: boolean; error?: string; member?: Member } => {
    membersCache = loadMembers();
    const cleanUser = data.username.trim().toLowerCase();

    // Check duplicate username
    if (membersCache.some((m) => m.username.toLowerCase() === cleanUser)) {
      return { success: false, error: `ชื่อผู้ใช้งาน "${cleanUser}" มีผู้ใช้งานแล้ว กรุณาเลือกชื่ออื่น` };
    }

    const newId = `M${String(membersCache.length + 1).padStart(4, "0")}`;
    const nowIso = new Date().toISOString();
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;

    const newAddress: Address = {
      id: `A${Date.now()}`,
      label: data.address.label || "บ้าน",
      recipient: data.address.recipient.trim() || fullName,
      phone: data.address.phone.trim() || data.phone.trim(),
      line: data.address.line.trim(),
      isPrimary: true, // First and only primary address
    };

    const newMember: Member = {
      id: newId,
      username: cleanUser,
      password: data.password,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      fullName,
      phone: data.phone.trim(),
      email: data.email.trim(),
      birthDate: data.birthDate,
      points: 50, // Welcome bonus!
      addresses: [newAddress],
      orders: [],
      purchaseHistory: [],
      loginHistory: [
        {
          id: `LH-${Date.now()}`,
          timestamp: nowIso,
          device: "มือถือ (ลงทะเบียนสำเร็จ)",
        },
      ],
      pointsHistory: [
        {
          id: `PH-${Date.now()}`,
          date: nowIso,
          points: 50,
          type: "bonus",
          description: "แต้มต้อนรับสมาชิกใหม่ รุ่งอรุณ มินิมาร์ท (+50 แต้ม)",
        },
      ],
      notifications: [
        {
          id: `N-${Date.now()}`,
          title: "ยินดีต้อนรับสู่ รุ่งอรุณ มินิมาร์ท",
          message: `ขอบคุณที่สมัครสมาชิกกับเรา คุณได้รับแต้มต้อนรับ 50 แต้ม สามารถสะสมแต้มทุก 50 บาท ได้ 5 แต้ม ทุกช่องทาง`,
          date: nowIso,
          read: false,
          type: "promo",
        },
      ],
    };

    membersCache.push(newMember);
    saveMembers(membersCache);
    return { success: true, member: newMember };
  },

  resetPassword: (
    username: string,
    phoneOrEmail: string,
    newPassword: string
  ): { success: boolean; message?: string; error?: string } => {
    membersCache = loadMembers();
    const cleanUser = username.trim().toLowerCase();
    const cleanContact = phoneOrEmail.trim().toLowerCase().replace(/\D/g, "");
    const rawContact = phoneOrEmail.trim().toLowerCase();

    const idx = membersCache.findIndex((m) => {
      const matchUser = m.username.toLowerCase() === cleanUser;
      const matchPhone = m.phone.replace(/\D/g, "") === cleanContact;
      const matchEmail = m.email.toLowerCase() === rawContact;
      return matchUser && (matchPhone || matchEmail);
    });

    if (idx === -1) {
      return {
        success: false,
        error: "ไม่พบชื่อผู้ใช้งานนี้ หรือเบอร์โทรศัพท์/อีเมลไม่ตรงกับข้อมูลที่ลงทะเบียนไว้",
      };
    }

    membersCache[idx].password = newPassword;
    saveMembers(membersCache);
    return { success: true, message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" };
  },

  changePassword: (
    memberId: string,
    oldPassword: string,
    newPassword: string
  ): { success: boolean; message?: string; error?: string } => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) {
      return { success: false, error: "ไม่พบข้อมูลสมาชิก" };
    }

    if (member.password !== oldPassword) {
      return { success: false, error: "รหัสผ่านเดิมไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
    }

    member.password = newPassword;
    saveMembers(membersCache);
    return { success: true, message: "เปลี่ยนรหัสผ่านสำเร็จแล้ว" };
  },

  updateProfile: (
    memberId: string,
    data: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      birthDate: string;
    }
  ): { success: boolean; error?: string } => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return { success: false, error: "ไม่พบสมาชิก" };

    member.firstName = data.firstName.trim();
    member.lastName = data.lastName.trim();
    member.fullName = `${member.firstName} ${member.lastName}`;
    member.phone = data.phone.trim();
    member.email = data.email.trim();
    member.birthDate = data.birthDate;

    saveMembers(membersCache);
    return { success: true };
  },

  getMember: (id: string): Member | undefined => {
    membersCache = loadMembers();
    repo.checkAndExpireOrders(id);
    return membersCache.find((m) => m.id === id);
  },

  updateMember: (updated: Member) => {
    membersCache = loadMembers();
    const idx = membersCache.findIndex((m) => m.id === updated.id);
    if (idx !== -1) {
      membersCache[idx] = updated;
      saveMembers(membersCache);
    }
  },

  checkAndExpireOrders: (memberId: string) => {
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return;
    let modified = false;
    member.orders.forEach((o) => {
      if (o.status === "รอชำระ" && isOrderExpired(o.createdAt, storeSettings.paymentWindowHours)) {
        o.status = "หมดเวลา";
        modified = true;
      }
    });
    if (modified) {
      saveMembers(membersCache);
    }
  },

  createOrder: (
    memberId: string,
    orderInput: {
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
      invoiceType?: "simplified" | "full";
      invoiceTaxId?: string;
      invoiceName?: string;
      invoiceAddress?: string;
    }
  ): Order | undefined => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return undefined;

    // 1. Check stock before creating order
    const stockCheck = repo.checkStock(orderInput.items.map((i) => ({ productId: i.productId, qty: i.qty })));
    if (!stockCheck.valid) {
      return undefined;
    }

    // 2. Deduct stock for all items
    repo.deductStock(orderInput.items.map((i) => ({ productId: i.productId, qty: i.qty })));

    // 3. Generate Order ID with Buddhist year (e.g. ORD-2569-0001)
    const thaiYear = new Date().getFullYear() + 543;
    const yearOrders = member.orders.filter((o) => o.id.startsWith(`ORD-${thaiYear}`));
    const orderSeq = String(yearOrders.length + 1).padStart(4, "0");
    const orderId = `ORD-${thaiYear}-${orderSeq}`;
    const invoiceNo = `REC-${thaiYear}-${orderSeq}`;
    const nowIso = new Date().toISOString();

    const order: Order = {
      id: orderId,
      createdAt: nowIso,
      status: "รอชำระ",
      items: orderInput.items,
      goodsSubtotal: orderInput.goodsSubtotal,
      shippingFee: orderInput.shippingFee,
      shippingMethod: orderInput.shippingMethod,
      pointsUsed: orderInput.pointsUsed,
      discountBaht: orderInput.discountBaht,
      pointsEarned: orderInput.pointsEarned,
      total: orderInput.total,
      addressId: orderInput.addressId,
      paymentMethod: orderInput.paymentMethod,
      invoice: {
        type: orderInput.invoiceType || "simplified",
        invoiceNo,
        date: nowIso,
        customerName: orderInput.invoiceName || member.fullName,
        customerAddress: orderInput.invoiceAddress,
        taxId: orderInput.invoiceTaxId,
        goodsSubtotal: orderInput.goodsSubtotal,
        discount: orderInput.discountBaht,
        shippingFee: orderInput.shippingFee,
        vatAmount: Number(((orderInput.total * 7) / 107).toFixed(2)),
        netTotal: orderInput.total,
      },
      timeline: [
        {
          title: "รอชำระ",
          time: nowIso,
          done: true,
          desc: "สร้างคำสั่งซื้อเรียบร้อย กรุณาชำระเงินภายใน 24 ชม.",
        },
        {
          title: "รอตรวจสอบการชำระ",
          time: "-",
          done: false,
          desc: "รอผู้ซื้ออัปโหลดสลิปเพื่อยืนยันการชำระเงิน",
        },
        { title: "ชำระแล้ว", time: "-", done: false, desc: "ตรวจสอบการชำระเงินเรียบร้อยและออกใบเสร็จ" },
        { title: "กำลังเตรียม", time: "-", done: false, desc: "ร้านค้ากำลังจัดเตรียมสินค้า" },
        { title: "จัดส่งแล้ว", time: "-", done: false, desc: "พัสดุอยู่ระหว่างการจัดส่ง" },
        { title: "ส่งสำเร็จ", time: "-", done: false, desc: "จัดส่งสินค้าถึงมือผู้รับเรียบร้อยแล้ว" },
      ],
    };

    // Deduct points used
    if (orderInput.pointsUsed > 0) {
      member.points = Math.max(0, member.points - orderInput.pointsUsed);
      member.pointsHistory.unshift({
        id: `PH-${Date.now()}`,
        date: nowIso,
        points: -orderInput.pointsUsed,
        type: "redeem",
        description: `ใช้แต้มเป็นส่วนลดคำสั่งซื้อ ${orderId}`,
        orderId,
      });
    }

    member.orders.unshift(order);

    // Also add to purchase history
    if (!member.purchaseHistory) member.purchaseHistory = [];
    member.purchaseHistory.unshift({
      id: `PUR-${orderId}`,
      date: nowIso,
      channel: "ออนไลน์",
      total: orderInput.total,
      pointsEarned: orderInput.pointsEarned,
      pointsUsed: orderInput.pointsUsed,
      orderId,
      receiptNo: `REC-${orderId.replace("ORD-", "")}`,
      description: `สั่งซื้อออนไลน์ ${order.items.map((i) => i.productName).join(", ")}`,
    });

    saveMembers(membersCache);
    return order;
  },

  uploadSlip: (
    memberId: string,
    orderId: string,
    data: string | { slipUrl: string; channel?: string; amount?: number; paidAt?: string }
  ): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const nowIso = new Date().toISOString();
    order.status = "รอตรวจสอบการชำระ";
    order.rejectReason = undefined;

    if (typeof data === "string") {
      order.slipUrl = data;
      order.paidAt = nowIso;
    } else {
      order.slipUrl = data.slipUrl;
      order.slipChannel = data.channel;
      order.slipAmount = data.amount;
      order.slipPaidAt = data.paidAt || nowIso;
      order.paidAt = nowIso;
    }

    // Update timeline
    if (order.timeline) {
      const idx = order.timeline.findIndex((t) => t.title.includes("รอตรวจสอบการชำระ"));
      if (idx !== -1) {
        order.timeline[idx].done = true;
        order.timeline[idx].time = nowIso;
        order.timeline[idx].desc = "อัปโหลดสลิปเรียบร้อย ร้านค้ากำลังตรวจสอบการชำระเงิน";
      }
    }

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `รอตรวจสอบการชำระ (${order.id})`,
      message: `คุณได้อัปโหลดสลิปเรียบร้อยแล้ว ร้านค้ากำลังตรวจสอบการชำระเงิน`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: order.id,
      status: "รอตรวจสอบการชำระ",
    });

    saveMembers(membersCache);
    return true;
  },

  rejectPayment: (memberId: string, orderId: string, reason: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const nowIso = new Date().toISOString();
    order.status = "รอชำระ";
    order.rejectReason = reason;

    if (order.timeline) {
      const idx = order.timeline.findIndex((t) => t.title.includes("รอตรวจสอบการชำระ"));
      if (idx !== -1) {
        order.timeline[idx].done = false;
        order.timeline[idx].desc = `ตรวจสอบไม่ผ่าน: ${reason} (กรุณาส่งสลิปใหม่)`;
      }
    }

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `การชำระเงินไม่ผ่าน (${order.id})`,
      message: `เหตุผล: ${reason} กรุณาตรวจสอบและอัปโหลดสลิปใหม่อีกครั้ง`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: order.id,
      status: "รอชำระ",
    });

    saveMembers(membersCache);
    return true;
  },

  confirmPaymentAndAwardPoints: (memberId: string, orderId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const nowIso = new Date().toISOString();
    order.status = "ชำระแล้ว";
    order.rejectReason = undefined;
    order.paidAt = nowIso;

    // Update timeline: step 1, 2, 3
    if (order.timeline) {
      order.timeline.forEach((t) => {
        if (t.title === "รอชำระ" || t.title === "รอตรวจสอบการชำระ" || t.title === "ชำระแล้ว") {
          t.done = true;
          if (t.time === "-") t.time = nowIso;
        }
      });
    }

    // Award earned points: rate is 5 points per 50 baht paid
    const earned = pointsEarned(order.total);
    if (earned > 0) {
      member.points += earned;
      member.pointsHistory.unshift({
        id: `PH-${Date.now()}`,
        date: nowIso,
        points: earned,
        type: "earn",
        description: `ได้รับแต้มจากคำสั่งซื้อ ${order.id} (+${earned} แต้ม)`,
        orderId: order.id,
      });
    }

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `ชำระเงินสำเร็จ (+${earned} แต้ม)`,
      message: `คำสั่งซื้อ ${order.id} ชำระเงินเรียบร้อยแล้ว ได้รับแต้มสะสม +${earned} แต้ม ออกใบเสร็จเรียบร้อย`,
      date: nowIso,
      read: false,
      type: "points",
      orderId: order.id,
      status: "ชำระแล้ว",
    });

    saveMembers(membersCache);
    return true;
  },

  markAsShipped: (memberId: string, orderId: string, trackingNumber?: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const track = trackingNumber || `TH${Date.now().toString().slice(-9)}RA`;
    const nowIso = new Date().toISOString();
    order.status = "จัดส่งแล้ว";
    order.trackingNumber = track;

    if (order.timeline) {
      order.timeline.forEach((t) => {
        if (["รอชำระ", "รอตรวจสอบการชำระ", "ชำระแล้ว", "กำลังเตรียม", "จัดส่งแล้ว"].includes(t.title)) {
          t.done = true;
          if (t.time === "-") t.time = nowIso;
        }
      });
    }

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `พัสดุของคุณถูกจัดส่งแล้ว (${order.id})`,
      message: `คำสั่งซื้อ ${order.id} สถานะ: จัดส่งแล้ว หมายเลขพัสดุ: ${track}`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: order.id,
      status: "จัดส่งแล้ว",
      trackingNumber: track,
    });

    saveMembers(membersCache);
    return true;
  },

  confirmDelivery: (memberId: string, orderId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const nowIso = new Date().toISOString();
    order.status = "ส่งสำเร็จ";

    if (order.timeline) {
      order.timeline.forEach((t) => {
        t.done = true;
        if (t.time === "-") t.time = nowIso;
      });
    }

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `จัดส่งสำเร็จ (${order.id})`,
      message: `คุณได้ยืนยันการรับสินค้าสำหรับคำสั่งซื้อ ${order.id} เรียบร้อยแล้ว ขอบคุณที่ใช้บริการร้านรุ่งอรุณ`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: order.id,
      status: "ส่งสำเร็จ",
      trackingNumber: order.trackingNumber,
    });

    saveMembers(membersCache);
    return true;
  },

  markAllNotificationsRead: (memberId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    if (!member.notifications) return true;
    member.notifications.forEach((n) => (n.read = true));
    saveMembers(membersCache);
    return true;
  },

  createRefundRequest: (
    memberId: string,
    input: {
      orderId: string;
      type: RequestType;
      items: RequestItem[];
      reason: string;
      imageUrl?: string;
    }
  ): RefundRequest | undefined => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return undefined;

    const thaiYear = new Date().getFullYear() + 543;
    if (!member.refundRequests) member.refundRequests = [];
    const seq = String(member.refundRequests.length + 1).padStart(4, "0");
    const reqId = `REQ-${thaiYear}-${seq}`;
    const nowIso = new Date().toISOString();

    const refundAmount = input.items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const newReq: RefundRequest = {
      id: reqId,
      orderId: input.orderId,
      type: input.type,
      status: "รอพิจารณา",
      createdAt: nowIso,
      items: input.items,
      reason: input.reason,
      imageUrl: input.imageUrl,
      refundAmount,
      refundSchedule: "ภายใน 3-5 วันทำการหลังอนุมัติ",
    };

    member.refundRequests.unshift(newReq);

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `ยื่นคำขอ${input.type}เรียบร้อย (${reqId})`,
      message: `คำขอ${input.type}สำหรับคำสั่งซื้อ ${input.orderId} อยู่ระหว่างรอพิจารณา ยอดเงินคืนโดยประมาณ ฿${refundAmount}`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: input.orderId,
      requestId: reqId,
      requestStatus: "รอพิจารณา",
    });

    saveMembers(membersCache);
    return newReq;
  },

  listRefundRequests: (memberId: string): RefundRequest[] => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    return member?.refundRequests || [];
  },

  reviewRefundRequest: (
    memberId: string,
    requestId: string,
    action: "approve" | "reject",
    note?: string
  ): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const req = member.refundRequests?.find((r) => r.id === requestId);
    if (!req) return false;

    const nowIso = new Date().toISOString();
    req.reviewedAt = nowIso;
    req.reviewNote = note;

    if (action === "approve") {
      req.status = "อนุมัติ";
      req.refundSchedule = "กำหนดคืนเงินภายใน 3 วันทำการ";

      // Update Order Status to "ยกเลิก" or "คืนสินค้า"
      const order = member.orders.find((o) => o.id === req.orderId);
      if (order) {
        order.status = req.type === "ยกเลิก" ? "ยกเลิก" : "คืนสินค้า";
        if (req.type === "ยกเลิก") order.cancelReason = req.reason;
        if (req.type === "คืนสินค้า") order.returnReason = req.reason;

        // Restore stock
        repo.restoreStock(req.items.map((i) => ({ productId: i.productId, qty: i.qty })));

        // Refund points if used
        if (order.pointsUsed > 0 && req.type === "ยกเลิก") {
          member.points += order.pointsUsed;
          member.pointsHistory.unshift({
            id: `PH-${Date.now()}`,
            date: nowIso,
            points: order.pointsUsed,
            type: "bonus",
            description: `คืนแต้มสะสมจากคำขอยกเลิกคำสั่งซื้อ ${order.id}`,
            orderId: order.id,
          });
        }
      }

      if (!member.notifications) member.notifications = [];
      member.notifications.unshift({
        id: `N-${Date.now()}`,
        title: `คำขอ${req.type}ได้รับการอนุมัติ (${req.id})`,
        message: `คำขอสำหรับคำสั่งซื้อ ${req.orderId} ได้รับการอนุมัติแล้ว ยอดเงินคืน ฿${req.refundAmount} ${req.refundSchedule}`,
        date: nowIso,
        read: false,
        type: "order",
        orderId: req.orderId,
        requestId: req.id,
        requestStatus: "อนุมัติ",
      });
    } else {
      req.status = "ไม่อนุมัติ";
      if (!member.notifications) member.notifications = [];
      member.notifications.unshift({
        id: `N-${Date.now()}`,
        title: `คำขอ${req.type}ไม่ได้รับการอนุมัติ (${req.id})`,
        message: `เหตุผล: ${note || "ข้อมูลไม่ตรงตามเงื่อนไข"} กรุณาติดต่อร้านค้าเพื่อสอบถามเพิ่มเติม`,
        date: nowIso,
        read: false,
        type: "order",
        orderId: req.orderId,
        requestId: req.id,
        requestStatus: "ไม่อนุมัติ",
      });
    }

    saveMembers(membersCache);
    return true;
  },

  markRefundReceived: (memberId: string, requestId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const req = member.refundRequests?.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = "รับสินค้าคืนแล้ว";
    req.refundSchedule = "เตรียมโอนเงินคืนภายใน 1-2 วันทำการ";
    const nowIso = new Date().toISOString();

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `ร้านค้าได้รับสินค้าคืนแล้ว (${req.id})`,
      message: `ได้รับสินค้าคืนเรียบร้อย อยู่ระหว่างการดำเนินการโอนเงินคืน ฿${req.refundAmount}`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: req.orderId,
      requestId: req.id,
      requestStatus: "รับสินค้าคืนแล้ว",
    });

    saveMembers(membersCache);
    return true;
  },

  markRefundPaid: (memberId: string, requestId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const req = member.refundRequests?.find((r) => r.id === requestId);
    if (!req) return false;

    const nowIso = new Date().toISOString();
    req.status = "คืนเงินแล้ว";
    req.refundedAt = nowIso;
    req.refundSchedule = "โอนเงินคืนเรียบร้อยแล้ว";

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `คืนเงินเรียบร้อยแล้ว (${req.id})`,
      message: `โอนเงินคืนจำนวน ฿${req.refundAmount} สำหรับคำสั่งซื้อ ${req.orderId} เรียบร้อยแล้ว`,
      date: nowIso,
      read: false,
      type: "order",
      orderId: req.orderId,
      requestId: req.id,
      requestStatus: "คืนเงินแล้ว",
    });

    saveMembers(membersCache);
    return true;
  },

  simulateSendGift: (memberId: string, type: "birthday" | "newyear"): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;

    if (!member.giftHistory) member.giftHistory = [];
    const primaryAddr = member.addresses.find((a) => a.isPrimary) || member.addresses[0];
    const addrLine = primaryAddr ? primaryAddr.line : "ที่อยู่หลักตามที่ลงทะเบียนไว้";
    const recipient = primaryAddr ? primaryAddr.recipient : member.fullName;
    const phone = primaryAddr ? primaryAddr.phone : member.phone;

    const thaiYear = new Date().getFullYear() + 543;
    const giftItem =
      type === "birthday"
        ? "ชุดเซ็ตของขวัญแก้วเก็บความเย็นและกระเป๋าผ้ารุ่งอรุณ Limited Edition"
        : `กระเช้าของขวัญผลิตภัณฑ์สมุนไพรธรรมชาติรุ่งอรุณ ต้อนรับปีใหม่ ${thaiYear}`;

    const title = type === "birthday" ? `ของขวัญวันเกิดพิเศษ พ.ศ. ${thaiYear}` : `ของขวัญเทศกาลปีใหม่ ${thaiYear}`;
    const nowIso = new Date().toISOString();

    const newGift: GiftRecord = {
      id: `GIFT-${thaiYear}-${Date.now().toString().slice(-4)}`,
      type,
      title,
      giftItem,
      shippingAddress: addrLine,
      recipient,
      phone,
      shippedDate: nowIso,
      status: "กำลังจัดส่ง",
      trackingNumber: `GIFT${thaiYear}${Date.now().toString().slice(-4)}TH`,
    };

    member.giftHistory.unshift(newGift);

    if (!member.notifications) member.notifications = [];
    member.notifications.unshift({
      id: `N-${Date.now()}`,
      title: `ร้านกำลังจัดส่งของขวัญให้คุณ (${type === "birthday" ? "วันเกิด" : "เทศกาลปีใหม่"})`,
      message: `ร้านรุ่งอรุณกำลังจัดส่ง '${giftItem}' ไปยังที่อยู่หลักของคุณ: ${addrLine}`,
      date: nowIso,
      read: false,
      type: "gift",
      giftId: newGift.id,
      giftItem,
      giftAddress: addrLine,
      giftDate: nowIso,
    });

    saveMembers(membersCache);
    return true;
  },

  simulateCounterPurchase: (
    memberId: string,
    amount: number
  ): { success: boolean; earned: number; receiptNo: string } => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return { success: false, earned: 0, receiptNo: "" };

    const earned = pointsEarned(amount);
    const nowIso = new Date().toISOString();
    const receiptNo = `POS-${Date.now().toString().slice(-6)}`;

    member.points += earned;

    if (!member.purchaseHistory) member.purchaseHistory = [];
    member.purchaseHistory.unshift({
      id: `PUR-${receiptNo}`,
      date: nowIso,
      channel: "หน้าร้านเคาน์เตอร์",
      total: amount,
      pointsEarned: earned,
      pointsUsed: 0,
      receiptNo,
      description: "ซื้อสินค้าที่เคาน์เตอร์ หน้าร้านรุ่งอรุณ (สแกน QR สมาชิก)",
    });

    if (earned > 0) {
      member.pointsHistory.unshift({
        id: `PH-${Date.now()}`,
        date: nowIso,
        points: earned,
        type: "earn",
        description: `สะสมแต้มจากการซื้อสินค้าที่เคาน์เตอร์หน้าร้าน (${receiptNo})`,
      });

      member.notifications.unshift({
        id: `N-${Date.now()}`,
        title: `ได้รับ +${earned} แต้ม!`,
        message: `คุณได้สแกน QR สมาชิกที่เคาน์เตอร์ ยอดชำระ ฿${amount.toLocaleString()} ได้รับแต้มสะสม +${earned} แต้ม`,
        date: nowIso,
        read: false,
        type: "points",
      });
    }

    saveMembers(membersCache);
    return { success: true, earned, receiptNo };
  },

  cancelOrder: (memberId: string, orderId: string, reason: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order) return false;

    // Can only cancel if not shipped yet
    if (["จัดส่งแล้ว", "ส่งสำเร็จ", "ยกเลิก", "คืนสินค้า"].includes(order.status)) {
      return false;
    }

    order.status = "ยกเลิก";
    order.cancelReason = reason;

    // Restore stock
    repo.restoreStock(order.items.map((i) => ({ productId: i.productId, qty: i.qty })));

    // Refund points if used
    if (order.pointsUsed > 0) {
      member.points += order.pointsUsed;
      member.pointsHistory.unshift({
        id: `PH-${Date.now()}`,
        date: new Date().toISOString(),
        points: order.pointsUsed,
        type: "bonus",
        description: `คืนแต้มสะสมจากการยกเลิกคำสั่งซื้อ ${orderId}`,
        orderId,
      });
    }

    saveMembers(membersCache);
    return true;
  },

  returnOrder: (memberId: string, orderId: string, reason: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;
    const order = member.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "ส่งสำเร็จ") return false;

    order.status = "คืนสินค้า";
    order.returnReason = reason;
    saveMembers(membersCache);
    return true;
  },

  addAddress: (memberId: string, address: Omit<Address, "id">): Address | undefined => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return undefined;

    const newId = `A${Date.now()}`;
    const isFirst = member.addresses.length === 0;
    const isPrimary = isFirst ? true : address.isPrimary;

    // Rule: exactly 1 primary address!
    if (isPrimary) {
      member.addresses.forEach((a) => (a.isPrimary = false));
    }

    const newAddr: Address = {
      ...address,
      id: newId,
      isPrimary,
    };
    member.addresses.push(newAddr);
    saveMembers(membersCache);
    return newAddr;
  },

  updateAddress: (memberId: string, address: Address): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;

    const idx = member.addresses.findIndex((a) => a.id === address.id);
    if (idx === -1) return false;

    // Rule: exactly 1 primary address!
    if (address.isPrimary) {
      member.addresses.forEach((a) => (a.isPrimary = false));
    }

    member.addresses[idx] = address;

    // Ensure at least 1 primary address exists
    if (!member.addresses.some((a) => a.isPrimary) && member.addresses.length > 0) {
      member.addresses[0].isPrimary = true;
    }

    saveMembers(membersCache);
    return true;
  },

  deleteAddress: (memberId: string, addressId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;

    const removed = member.addresses.find((a) => a.id === addressId);
    member.addresses = member.addresses.filter((a) => a.id !== addressId);

    // Rule: If removed was primary, ensure exactly 1 primary address remains!
    if (removed?.isPrimary && member.addresses.length > 0) {
      member.addresses[0].isPrimary = true;
    }

    saveMembers(membersCache);
    return true;
  },

  setPrimaryAddress: (memberId: string, addressId: string): boolean => {
    membersCache = loadMembers();
    const member = membersCache.find((m) => m.id === memberId);
    if (!member) return false;

    // Rule: 1 ที่อยู่หลักเท่านั้น
    member.addresses.forEach((a) => {
      a.isPrimary = a.id === addressId;
    });

    saveMembers(membersCache);
    return true;
  },
};
