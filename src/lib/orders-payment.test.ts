import { describe, expect, it } from "vitest";
import { repo } from "./data/repo";
import { isOrderExpired, pointsEarned } from "./rules";

describe("Payment & Order Tracking Workflow", () => {
  it("handles slip upload and transitions to 'รอตรวจสอบการชำระ'", () => {
    const member = repo.getMember("M0001");
    expect(member).toBeDefined();

    // Create a new order to test payment
    const order = repo.createOrder("M0001", {
      items: [
        {
          productId: "P002",
          productName: "สบู่สมุนไพรขมิ้นน้ำผึ้ง",
          unit: "ก้อน 100 กรัม",
          qty: 2,
          price: 35,
        },
      ],
      goodsSubtotal: 70,
      shippingFee: 30,
      shippingMethod: "ส่งมาตรฐาน",
      pointsUsed: 0,
      discountBaht: 0,
      pointsEarned: 10,
      total: 100,
      addressId: "A1",
      paymentMethod: "โอนผ่านธนาคาร",
      invoiceType: "simplified",
    });

    expect(order).toBeDefined();
    expect(order?.status).toBe("รอชำระ");

    // Upload slip
    const ok = repo.uploadSlip("M0001", order!.id, {
      slipUrl: "/mock-slip.jpg",
      channel: "โอนผ่านธนาคารกสิกรไทย",
      amount: 100,
      paidAt: new Date().toISOString(),
    });

    expect(ok).toBe(true);

    const updated = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(updated?.status).toBe("รอตรวจสอบการชำระ");
    expect(updated?.slipUrl).toBe("/mock-slip.jpg");
    expect(updated?.slipAmount).toBe(100);
  });

  it("handles payment rejection and allows resubmitting slip", () => {
    const member = repo.getMember("M0001");
    expect(member).toBeDefined();

    const order = member!.orders.find((o) => o.status === "รอตรวจสอบการชำระ");
    expect(order).toBeDefined();

    // Reject payment
    const rejectRes = repo.rejectPayment("M0001", order!.id, "ยอดเงินในสลิปไม่ตรงตามยอดบิล");
    expect(rejectRes).toBe(true);

    const rejectedOrder = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(rejectedOrder?.status).toBe("รอชำระ");
    expect(rejectedOrder?.rejectReason).toBe("ยอดเงินในสลิปไม่ตรงตามยอดบิล");

    // Notifications should record the rejection
    const notifications = repo.getMember("M0001")?.notifications || [];
    const rejectNotif = notifications.find((n) => n.orderId === order!.id && n.title.includes("ไม่ผ่าน"));
    expect(rejectNotif).toBeDefined();

    // Resubmit slip
    const resubmitOk = repo.uploadSlip("M0001", order!.id, {
      slipUrl: "/new-correct-slip.jpg",
      amount: order!.total,
    });
    expect(resubmitOk).toBe(true);

    const resubmittedOrder = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(resubmittedOrder?.status).toBe("รอตรวจสอบการชำระ");
    expect(resubmittedOrder?.rejectReason).toBeUndefined();
  });

  it("handles payment approval, changes to 'ชำระแล้ว' and awards points", () => {
    const member = repo.getMember("M0001");
    const order = member!.orders.find((o) => o.status === "รอตรวจสอบการชำระ");
    expect(order).toBeDefined();

    const prevPoints = member!.points;
    const expectedPoints = pointsEarned(order!.total);

    const approveOk = repo.confirmPaymentAndAwardPoints("M0001", order!.id);
    expect(approveOk).toBe(true);

    const approvedOrder = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(approvedOrder?.status).toBe("ชำระแล้ว");

    // Member points increased
    const updatedMember = repo.getMember("M0001");
    expect(updatedMember?.points).toBe(prevPoints + expectedPoints);
  });

  it("handles shipment and customer delivery confirmation", () => {
    const member = repo.getMember("M0001");
    const order = member!.orders.find((o) => o.status === "ชำระแล้ว");
    expect(order).toBeDefined();

    // Mark as shipped with tracking number
    const trackNo = "TH256999999RA";
    const shipOk = repo.markAsShipped("M0001", order!.id, trackNo);
    expect(shipOk).toBe(true);

    const shippedOrder = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(shippedOrder?.status).toBe("จัดส่งแล้ว");
    expect(shippedOrder?.trackingNumber).toBe(trackNo);

    // Customer confirms receipt
    const deliveryOk = repo.confirmDelivery("M0001", order!.id);
    expect(deliveryOk).toBe(true);

    const deliveredOrder = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(deliveredOrder?.status).toBe("ส่งสำเร็จ");

    // Notification center should contain delivered notification
    const notifications = repo.getMember("M0001")?.notifications || [];
    const delivNotif = notifications.find((n) => n.orderId === order!.id && n.status === "ส่งสำเร็จ");
    expect(delivNotif).toBeDefined();
  });

  it("detects expired orders past 24 hours", () => {
    const now = Date.now();
    const freshIso = new Date(now - 2 * 3600_000).toISOString(); // 2 hours ago
    const expiredIso = new Date(now - 25 * 3600_000).toISOString(); // 25 hours ago

    expect(isOrderExpired(freshIso, 24)).toBe(false);
    expect(isOrderExpired(expiredIso, 24)).toBe(true);
  });

  it("handles cancellation request, restores stock and refunds points upon approval", () => {
    // Create order with used points
    const member = repo.getMember("M0001");
    expect(member).toBeDefined();

    const order = repo.createOrder("M0001", {
      items: [
        {
          productId: "P001",
          productName: "ข้าวหอมมะลิ 105 ตราฉัตรทิพย์ 5 กก.",
          unit: "ถุง 5 กิโลกรัม",
          qty: 1,
          price: 215,
        },
      ],
      goodsSubtotal: 215,
      shippingFee: 30,
      shippingMethod: "ส่งมาตรฐาน",
      pointsUsed: 50,
      discountBaht: 5,
      pointsEarned: 24,
      total: 240,
      addressId: "A1",
      paymentMethod: "พร้อมเพย์",
      invoiceType: "simplified",
    });
    expect(order).toBeDefined();

    const pointsBeforeCancel = repo.getMember("M0001")!.points;
    const initialStock = repo.getProduct("P001")?.stock ?? 0;

    // Submit cancellation request
    const req = repo.createRefundRequest("M0001", {
      orderId: order!.id,
      type: "ยกเลิก",
      reason: "ต้องการเปลี่ยนรายการสินค้า",
      items: [{ productId: "P001", productName: "ข้าวหอมมะลิ", qty: 1, price: 215, unit: "ถุง 5 กิโลกรัม" }],
    });

    expect(req).toBeDefined();
    expect(req?.status).toBe("รอพิจารณา");
    expect(req?.id).toMatch(/^REQ-/);

    // Approve cancellation
    const reviewResult = repo.reviewRefundRequest("M0001", req!.id, "approve", "อนุมัติการยกเลิกเรียบร้อย");
    expect(reviewResult).toBe(true);

    const updatedOrder = repo.getMember("M0001")?.orders.find((o) => o.id === order!.id);
    expect(updatedOrder?.status).toBe("ยกเลิก");

    // Stock should be restored by 1
    expect(repo.getProduct("P001")?.stock).toBe(initialStock + 1);

    // Points should be refunded
    expect(repo.getMember("M0001")?.points).toBe(pointsBeforeCancel + 50);
  });

  it("handles return request on delivered order and simulates refund completion", () => {
    const member = repo.getMember("M0001");
    // Find or create delivered order
    let deliveredOrder = member?.orders.find((o) => o.status === "ส่งสำเร็จ");
    if (!deliveredOrder) {
      deliveredOrder = repo.createOrder("M0001", {
        items: [{ productId: "P003", productName: "ไข่ไก่สดเบอร์ 2", qty: 1, price: 135, unit: "แผง 30 ฟอง" }],
        goodsSubtotal: 135,
        shippingFee: 30,
        shippingMethod: "ส่งมาตรฐาน",
        pointsUsed: 0,
        discountBaht: 0,
        pointsEarned: 16,
        total: 165,
        addressId: "A1",
        paymentMethod: "โอนผ่านธนาคาร",
        invoiceType: "simplified",
      });
      repo.confirmPaymentAndAwardPoints("M0001", deliveredOrder!.id);
      repo.markAsShipped("M0001", deliveredOrder!.id, "TH9988776655");
      repo.confirmDelivery("M0001", deliveredOrder!.id);
    }

    const req = repo.createRefundRequest("M0001", {
      orderId: deliveredOrder!.id,
      type: "คืนสินค้า",
      reason: "สินค้าชำรุดเสียหายระหว่างขนส่ง",
      items: [{ productId: "P003", productName: "ไข่ไก่สดเบอร์ 2", qty: 1, price: 135, unit: "แผง 30 ฟอง" }],
    });
    expect(req).toBeDefined();

    // Approve return
    const approved = repo.reviewRefundRequest("M0001", req!.id, "approve", "ยินดีรับสินค้าคืน");
    expect(approved).toBe(true);

    const orderAfterApprove = repo.getMember("M0001")?.orders.find((o) => o.id === deliveredOrder!.id);
    expect(orderAfterApprove?.status).toBe("คืนสินค้า");

    // Employee marks item received
    repo.markRefundReceived("M0001", req!.id);
    const reqAfterReceived = repo.listRefundRequests("M0001").find((r) => r.id === req!.id);
    expect(reqAfterReceived?.status).toBe("รับสินค้าคืนแล้ว");

    // Employee marks refund paid
    repo.markRefundPaid("M0001", req!.id);
    const reqAfterPaid = repo.listRefundRequests("M0001").find((r) => r.id === req!.id);
    expect(reqAfterPaid?.status).toBe("คืนเงินแล้ว");
  });

  it("handles birthday and New Year gift delivery to primary address", () => {
    const member = repo.getMember("M0001");
    expect(member).toBeDefined();
    const primaryAddr = member!.addresses.find((a) => a.isPrimary);
    expect(primaryAddr).toBeDefined();

    // Send birthday gift
    const bdayOk = repo.simulateSendGift("M0001", "birthday");
    expect(bdayOk).toBe(true);

    // Send New Year gift
    const nyOk = repo.simulateSendGift("M0001", "newyear");
    expect(nyOk).toBe(true);

    // Verify member gift history and notifications
    const updatedMember = repo.getMember("M0001");
    const bdayGift = updatedMember?.giftHistory?.find((g) => g.type === "birthday");
    const nyGift = updatedMember?.giftHistory?.find((g) => g.type === "newyear");

    expect(bdayGift).toBeDefined();
    expect(bdayGift?.shippingAddress).toContain(primaryAddr!.line);

    expect(nyGift).toBeDefined();
    expect(nyGift?.shippingAddress).toContain(primaryAddr!.line);

    const giftNotif = updatedMember?.notifications.find((n) => n.title.includes("ของขวัญ"));
    expect(giftNotif).toBeDefined();
    expect(giftNotif?.giftAddress).toContain(primaryAddr!.line);
  });
});

