import { describe, expect, it } from "vitest";
import {
  calculateVat,
  clampQty,
  formatTimeRemaining,
  isOrderExpired,
  maxRedeemablePoints,
  normalizeRedeem,
  pointsEarned,
  pointsToBaht,
  shippingFee,
} from "./rules";

describe("store rules", () => {
  it("earns 5 points per full 50 baht, rounded down", () => {
    expect(pointsEarned(49)).toBe(0);
    expect(pointsEarned(50)).toBe(5);
    expect(pointsEarned(99)).toBe(5);
    expect(pointsEarned(100)).toBe(10);
    expect(pointsEarned(149)).toBe(10);
    expect(pointsEarned(259)).toBe(25);
  });

  it("redeems in steps of 10 points, capped by goods subtotal", () => {
    expect(normalizeRedeem(1255, 1250, 500)).toBe(1250);
    expect(maxRedeemablePoints(1250, 35)).toBe(350);
    expect(pointsToBaht(1250)).toBe(125);
  });

  it("ships free from 300 baht", () => {
    expect(shippingFee(299, 30, 300)).toBe(30);
    expect(shippingFee(300, 30, 300)).toBe(0);
    expect(shippingFee(350, 60, 300)).toBe(0);
  });

  it("clamps cart quantity to stock", () => {
    expect(clampQty(5, 3)).toBe(3);
    expect(clampQty(0, 3)).toBe(1);
    expect(clampQty(10, 0)).toBe(0);
  });

  it("calculates 7% inclusive VAT correctly", () => {
    expect(calculateVat(107)).toBe(7);
  });

  it("detects expired orders past 24 hours", () => {
    const fresh = new Date().toISOString();
    const expired = new Date(Date.now() - 25 * 3600_000).toISOString();
    expect(isOrderExpired(fresh, 24)).toBe(false);
    expect(isOrderExpired(expired, 24)).toBe(true);

    const remaining = formatTimeRemaining(fresh, 24);
    expect(remaining.expired).toBe(false);
    expect(remaining.hours).toBeGreaterThanOrEqual(23);
  });
});
