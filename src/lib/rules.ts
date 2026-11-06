/**
 * Business rules for ร้านรุ่งอรุณ มินิมาร์ท
 */

/** Earn: every full 50 baht actually paid gives 5 points (rounded down). */
export function pointsEarned(paidAmount: number): number {
  if (paidAmount <= 0) return 0;
  return Math.floor(paidAmount / 50) * 5;
}

/** Redeem: 10 points = 1 baht, steps of 10, never more than goods subtotal or balance. */
export function maxRedeemablePoints(balance: number, goodsSubtotal: number): number {
  const cap = Math.min(balance, Math.floor(goodsSubtotal) * 10);
  return Math.max(0, Math.floor(cap / 10) * 10);
}

export function normalizeRedeem(requested: number, balance: number, goodsSubtotal: number): number {
  const max = maxRedeemablePoints(balance, goodsSubtotal);
  const stepped = Math.floor(Math.max(0, requested) / 10) * 10;
  return Math.min(stepped, max);
}

export const pointsToBaht = (points: number): number => Math.floor(points / 10);

export function shippingFee(goodsSubtotal: number, baseFee: number, freeMin = 300): number {
  return goodsSubtotal >= freeMin ? 0 : baseFee;
}

/** Clamp a cart quantity to available stock. */
export function clampQty(qty: number, stock: number): number {
  if (stock <= 0) return 0;
  return Math.max(1, Math.min(qty, stock));
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

export function calculateVat(totalWithVat: number): number {
  // 7% VAT included in price: VAT = total * 7 / 107
  return Number(((totalWithVat * 7) / 107).toFixed(2));
}

export function isOrderExpired(createdAtIso: string, paymentWindowHours = 24): boolean {
  const created = new Date(createdAtIso).getTime();
  const now = Date.now();
  return now - created > paymentWindowHours * 3600_000;
}

export function formatTimeRemaining(createdAtIso: string, paymentWindowHours = 24): { hours: number; minutes: number; expired: boolean } {
  const deadline = new Date(createdAtIso).getTime() + paymentWindowHours * 3600_000;
  const diff = deadline - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };
  const hours = Math.floor(diff / 3600_000);
  const minutes = Math.floor((diff % 3600_000) / 60_000);
  return { hours, minutes, expired: false };
}

export function isPromotionActive(item: { validUntilIso?: string; publishUntilIso?: string }): boolean {
  const deadline = item.publishUntilIso || item.validUntilIso;
  if (!deadline) return true;
  return new Date(deadline).getTime() > Date.now();
}

export function formatThaiDate(iso: string, withTime = true): string {
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543; // Buddhist Era
    const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} น.`;
    return withTime ? `${day} ${month} ${year} ${time}` : `${day} ${month} ${year}`;
  } catch {
    return iso;
  }
}
