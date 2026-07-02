import { describe, expect, it } from "vitest";
import { isValidKoreanMobile, normalizeKoreanPhone } from "./auth";

describe("Korean phone normalization", () => {
  it("normalizes a local mobile number to E.164", () => {
    expect(normalizeKoreanPhone("010-1234-5678")).toBe("+821012345678");
  });

  it("keeps a Korean country code", () => {
    expect(normalizeKoreanPhone("+82 10 1234 5678")).toBe("+821012345678");
  });

  it("rejects malformed mobile numbers", () => {
    expect(isValidKoreanMobile("010-123-4567")).toBe(false);
    expect(isValidKoreanMobile("032-123-4567")).toBe(false);
  });
});
