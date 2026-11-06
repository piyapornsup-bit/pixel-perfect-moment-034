import { describe, expect, it } from "vitest";
import { repo } from "./data/repo";
import { clampQty, maxRedeemablePoints, normalizeRedeem, pointsEarned, pointsToBaht, shippingFee } from "./rules";

describe("Cart and Checkout Rules", () => {
  it("enforces stock checks and quantity clamping", () => {
    const products = repo.listProducts();
    const p1 = products.find((p) => p.stock > 0);
    expect(p1).toBeDefined();

    // Normal clamp
    expect(clampQty(2, p1!.stock)).toBe(2);

    // Cannot exceed stock
    expect(clampQty(p1!.stock + 10, p1!.stock)).toBe(p1!.stock);

    // Minimum clamp is 1
    expect(clampQty(0, p1!.stock)).toBe(1);

    // Out of stock product clamp is 0
    expect(clampQty(5, 0)).toBe(0);
  });

  it("calculates shipping fee and free shipping at ฿300 threshold", () => {
    // Under 300
    expect(shippingFee(100, 30, 300)).toBe(30);
    expect(shippingFee(299, 30, 300)).toBe(30);
    expect(shippingFee(299, 60, 300)).toBe(60);

    // Exactly 300 or above is FREE
    expect(shippingFee(300, 30, 300)).toBe(0);
    expect(shippingFee(350, 30, 300)).toBe(0);
    expect(shippingFee(500, 60, 300)).toBe(0);
  });

  it("enforces point redemption rules (steps of 10, cap by subtotal & balance)", () => {
    // Balance 1250, subtotal 200 -> max 200 * 10 = 2000, capped by balance 1250 -> 1250
    expect(maxRedeemablePoints(1250, 200)).toBe(1250);

    // Balance 1250, subtotal 50 -> max 50 * 10 = 500, capped by goodsSubtotal 500
    expect(maxRedeemablePoints(1250, 50)).toBe(500);

    // Steps of 10
    expect(normalizeRedeem(45, 1000, 200)).toBe(40);
    expect(normalizeRedeem(50, 1000, 200)).toBe(50);
    expect(normalizeRedeem(58, 1000, 200)).toBe(50);
    expect(normalizeRedeem(9999, 1000, 50)).toBe(500);

    // Point conversion to Baht (10 pts = 1 THB)
    expect(pointsToBaht(50)).toBe(5);
    expect(pointsToBaht(120)).toBe(12);
  });

  it("calculates point earning at rate 5 points per 50 baht paid", () => {
    expect(pointsEarned(49)).toBe(0);
    expect(pointsEarned(50)).toBe(5);
    expect(pointsEarned(99)).toBe(5);
    expect(pointsEarned(100)).toBe(10);
    expect(pointsEarned(250)).toBe(25);
  });

  it("creates order with Buddhist Era format e.g. ORD-2569-xxxx and checks stock", () => {
    const member = repo.getMember("M0001");
    expect(member).toBeDefined();

    const initialStockP1 = repo.getProduct("P001")?.stock ?? 0;
    expect(initialStockP1).toBeGreaterThanOrEqual(1);

    // Valid order creation
    const order = repo.createOrder("M0001", {
      items: [
        {
          productId: "P001",
          productName: "ชุดของขวัญตุ๊กตาหมีพร้อมการ์ด",
          unit: "ชุด",
          qty: 1,
          price: 259,
        },
      ],
      goodsSubtotal: 259,
      shippingFee: 30,
      shippingMethod: "ส่งมาตรฐาน",
      pointsUsed: 50,
      discountBaht: 5,
      pointsEarned: 25,
      total: 284,
      addressId: "A1",
      paymentMethod: "โอนผ่านธนาคาร",
      invoiceType: "simplified",
    });

    expect(order).toBeDefined();
    expect(order?.status).toBe("รอชำระ");

    // Order ID must match Buddhist Era format ORD-2569-xxxx
    const thaiYear = new Date().getFullYear() + 543;
    expect(order?.id).toMatch(new RegExp(`^ORD-${thaiYear}-\\d{4}$`));

    // Stock should have decreased by 1
    const updatedStockP1 = repo.getProduct("P001")?.stock ?? 0;
    expect(updatedStockP1).toBe(initialStockP1 - 1);

    // Cancel order restores stock
    if (order) {
      const cancelRes = repo.cancelOrder("M0001", order.id, "ต้องการเปลี่ยนสินค้า");
      expect(cancelRes).toBe(true);

      const restoredStockP1 = repo.getProduct("P001")?.stock ?? 0;
      expect(restoredStockP1).toBe(initialStockP1);
    }
  });

  it("rejects order creation if stock is insufficient", () => {
    const member = repo.getMember("M0001");
    expect(member).toBeDefined();

    const p = repo.getProduct("P001");
    expect(p).toBeDefined();

    // Trying to order way more than stock
    const excessiveQty = (p?.stock ?? 0) + 999;
    const stockCheck = repo.checkStock([{ productId: "P001", qty: excessiveQty }]);
    expect(stockCheck.valid).toBe(false);
    expect(stockCheck.error).toContain("มีจำนวนไม่เพียงพอ");

    // createOrder should reject and return undefined
    const failedOrder = repo.createOrder("M0001", {
      items: [
        {
          productId: "P001",
          productName: p!.name,
          unit: p!.unit,
          qty: excessiveQty,
          price: p!.price,
        },
      ],
      goodsSubtotal: p!.price * excessiveQty,
      shippingFee: 0,
      shippingMethod: "ส่งฟรี",
      pointsUsed: 0,
      discountBaht: 0,
      pointsEarned: 100,
      total: p!.price * excessiveQty,
      addressId: "A1",
      paymentMethod: "โอนผ่านธนาคาร",
    });

    expect(failedOrder).toBeUndefined();
  });
});

