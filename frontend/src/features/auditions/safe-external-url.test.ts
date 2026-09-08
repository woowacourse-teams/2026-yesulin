import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./safe-external-url";

describe("safeExternalUrl", () => {
  it("keeps an https profile link", () => {
    expect(safeExternalUrl("https://www.instagram.com/actor")).toBe("https://www.instagram.com/actor");
  });

  it("keeps an http portfolio link", () => {
    expect(safeExternalUrl("http://portfolio.example.com")).toBe("http://portfolio.example.com/");
  });

  it("rejects a non-web URL before it is rendered as a link", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
  });
});
