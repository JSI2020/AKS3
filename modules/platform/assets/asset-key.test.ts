import { describe, expect, it } from "vitest";

import { assertSafeAssetKey } from "./r2";

describe("assertSafeAssetKey", () => {
  it("accepts normal relative keys", () => {
    expect(assertSafeAssetKey("temp-merch/unsplash/a.jpg")).toBe(
      "temp-merch/unsplash/a.jpg",
    );
    expect(assertSafeAssetKey("/uploads/user/x.png")).toBe(
      "uploads/user/x.png",
    );
  });

  it("rejects path traversal", () => {
    expect(() => assertSafeAssetKey("../.env")).toThrow(/Invalid asset key/);
    expect(() => assertSafeAssetKey("foo/../../.env")).toThrow(
      /Invalid asset key/,
    );
    expect(() => assertSafeAssetKey("..%2F.env")).toThrow(/Invalid asset key/);
  });

  it("rejects Windows absolute and backslash keys", () => {
    expect(() => assertSafeAssetKey("C:/Windows/win.ini")).toThrow(
      /Invalid asset key/,
    );
    expect(() => assertSafeAssetKey("C:\\Windows\\win.ini")).toThrow(
      /Invalid asset key/,
    );
    expect(() => assertSafeAssetKey("foo\\bar.jpg")).toThrow(
      /Invalid asset key/,
    );
  });

  it("rejects empty and null-byte keys", () => {
    expect(() => assertSafeAssetKey("")).toThrow(/Invalid asset key/);
    expect(() => assertSafeAssetKey("   ")).toThrow(/Invalid asset key/);
    expect(() => assertSafeAssetKey("a\0b")).toThrow(/Invalid asset key/);
  });
});
