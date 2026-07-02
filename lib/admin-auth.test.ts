import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./admin-auth";

const NOW = 1_700_000_000_000;
const SECRET = "test-secret-with-enough-entropy";

describe("admin session tokens", () => {
  it("accepts a valid signed token", () => {
    const token = createAdminSessionToken(NOW, SECRET);
    expect(verifyAdminSessionToken(token, NOW, SECRET)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = createAdminSessionToken(NOW, SECRET);
    expect(verifyAdminSessionToken(`${token}x`, NOW, SECRET)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createAdminSessionToken(NOW, SECRET);
    const expiredAt = NOW + (ADMIN_SESSION_TTL_SECONDS + 1) * 1000;
    expect(verifyAdminSessionToken(token, expiredAt, SECRET)).toBe(false);
  });

  it("rejects tokens signed with another secret", () => {
    const token = createAdminSessionToken(NOW, SECRET);
    expect(verifyAdminSessionToken(token, NOW, "different-secret")).toBe(false);
  });
});
