import { generateId } from "@/lib/id";

describe("generateId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateId()).toBe("string");
    expect(generateId().length).toBeGreaterThan(0);
  });

  it("returns an 8-character alphanumeric string", () => {
    // Math.random().toString(36).slice(2, 10) always produces exactly 8 chars
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]{1,8}$/);
  });

  it("returns unique values on consecutive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    // With 100 samples from a 36^8 space, collisions are astronomically unlikely
    expect(ids.size).toBe(100);
  });
});
