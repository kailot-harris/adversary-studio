import { describe, expect, it } from "vitest";
import { hashStringToSeed, mulberry32 } from "@/lib/mulberry32";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("produces values in [0, 1)", () => {
    const next = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashStringToSeed", () => {
  it("is deterministic for the same string", () => {
    expect(hashStringToSeed("hello")).toBe(hashStringToSeed("hello"));
  });

  it("differs across distinct strings", () => {
    expect(hashStringToSeed("hello")).not.toBe(hashStringToSeed("world"));
  });
});
