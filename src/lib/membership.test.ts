import { describe, expect, it } from "vitest";
import { repo } from "./data/repo";
import { pointsEarned } from "./rules";

describe("Membership System", () => {
  it("authenticates valid user and records login history", () => {
    const res = repo.login("somchai", "1234");
    expect(res.success).toBe(true);
    expect(res.member).toBeDefined();
    expect(res.member?.username).toBe("somchai");

    // Login history should have at least 1 entry
    expect(res.member?.loginHistory.length).toBeGreaterThan(0);
  });

  it("fails login with wrong password and returns error message", () => {
    const res = repo.login("somchai", "wrong-password");
    expect(res.success).toBe(false);
    expect(res.error).toBe("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
  });

  it("fails login with non-existent user", () => {
    const res = repo.login("non_existent_user_999", "1234");
    expect(res.success).toBe(false);
    expect(res.error).toBe("ไม่พบชื่อผู้ใช้งานนี้ในระบบ");
  });

  it("handles multi-step registration and rejects duplicate username", () => {
    // Duplicate username test
    const dupRes = repo.register({
      firstName: "สมศรี",
      lastName: "สดใส",
      phone: "089-999-8888",
      email: "somsri@test.com",
      birthDate: "1995-01-01",
      address: {
        recipient: "สมศรี สดใส",
        phone: "089-999-8888",
        line: "123 ถนนกลางเมือง",
        label: "บ้าน",
      },
      username: "somchai", // Already exists!
      password: "password123",
    });

    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain("somchai");

    // New unique registration test
    const newUsername = `user_${Date.now()}`;
    const regRes = repo.register({
      firstName: "สมหญิง",
      lastName: "สุขใจ",
      phone: "082-111-2222",
      email: "somying@test.com",
      birthDate: "1996-03-20",
      address: {
        recipient: "สมหญิง สุขใจ",
        phone: "082-111-2222",
        line: "456 ซอยสุขสบาย ขอนแก่น",
        label: "บ้าน",
      },
      username: newUsername,
      password: "password123",
    });

    expect(regRes.success).toBe(true);
    expect(regRes.member?.points).toBe(50); // 50 welcome bonus points
    expect(regRes.member?.addresses.length).toBe(1);
    expect(regRes.member?.addresses[0].isPrimary).toBe(true); // 1 primary address only
  });

  it("resets password with username and matching phone/email", () => {
    // Fail when contact does not match
    const failRes = repo.resetPassword("somchai", "099-000-0000", "newpass123");
    expect(failRes.success).toBe(false);

    // Success when phone matches
    const okRes = repo.resetPassword("somchai", "081-234-5678", "1234");
    expect(okRes.success).toBe(true);
  });

  it("changes password verifying old password first", () => {
    // Fail with wrong old password
    const failRes = repo.changePassword("M0001", "wrong_old_pass", "new_secret_123");
    expect(failRes.success).toBe(false);
    expect(failRes.error).toBe("รหัสผ่านเดิมไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");

    // Success with correct old password
    const okRes = repo.changePassword("M0001", "1234", "1234");
    expect(okRes.success).toBe(true);
  });

  it("enforces exactly 1 primary address", () => {
    const m = repo.getMember("M0001");
    expect(m).toBeDefined();

    const primaries = m?.addresses.filter((a) => a.isPrimary) || [];
    expect(primaries.length).toBe(1);

    // Setting another address as primary unsets the first
    if (m && m.addresses.length >= 2) {
      const secondId = m.addresses[1].id;
      repo.setPrimaryAddress(m.id, secondId);

      const updated = repo.getMember("M0001");
      const updatedPrimaries = updated?.addresses.filter((a) => a.isPrimary) || [];
      expect(updatedPrimaries.length).toBe(1);
      expect(updatedPrimaries[0].id).toBe(secondId);
    }
  });

  it("awards points accurately when bill is paid (every 50 baht = 5 points)", () => {
    expect(pointsEarned(49)).toBe(0);
    expect(pointsEarned(50)).toBe(5);
    expect(pointsEarned(150)).toBe(15);
    expect(pointsEarned(259)).toBe(25);
  });
});

