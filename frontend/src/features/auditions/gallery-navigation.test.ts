import { describe, expect, it } from "vitest";
import { selectGalleryIndex } from "./gallery-navigation";

describe("selectGalleryIndex", () => {
  it("returns no selection when there are no submitted photos", () => {
    expect(selectGalleryIndex(0, 0)).toBeNull();
  });

  it("keeps the only submitted photo selected", () => {
    expect(selectGalleryIndex(8, 1)).toBe(0);
  });

  it("keeps the selected photo within the three-photo gallery", () => {
    expect(selectGalleryIndex(-1, 3)).toBe(0);
    expect(selectGalleryIndex(1, 3)).toBe(1);
    expect(selectGalleryIndex(8, 3)).toBe(2);
  });
});
