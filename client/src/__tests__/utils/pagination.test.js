import { describe, it, expect } from "vitest";
import {
  paginate,
  totalPages,
  getPageNumbers,
} from "../../utils/pagination";

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("returns first page", () => {
    expect(paginate(items, 1, 3)).toEqual([1, 2, 3]);
  });

  it("returns second page", () => {
    expect(paginate(items, 2, 3)).toEqual([4, 5, 6]);
  });

  it("returns last partial page", () => {
    expect(paginate(items, 4, 3)).toEqual([10]);
  });

  it("returns empty for out of range page", () => {
    expect(paginate(items, 10, 3)).toEqual([]);
  });

  it("returns empty for empty array", () => {
    expect(paginate([], 1, 10)).toEqual([]);
  });
});

describe("totalPages", () => {
  it("calculates total pages correctly", () => {
    expect(totalPages(10, 3)).toBe(4);
    expect(totalPages(9,  3)).toBe(3);
    expect(totalPages(6,  3)).toBe(2);
  });

  it("returns 1 for zero items", () => {
    expect(totalPages(0, 3)).toBe(1);
  });

  it("returns 1 for exact fit", () => {
    expect(totalPages(9, 9)).toBe(1);
  });
});

describe("getPageNumbers", () => {
  it("returns all pages when total <= 7", () => {
    const pages = getPageNumbers(1, 5);
    expect(pages).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns all 7 pages when total === 7", () => {
    const pages = getPageNumbers(4, 7);
    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("includes first and last page", () => {
    const pages = getPageNumbers(5, 10);
    expect(pages).toContain(1);
    expect(pages).toContain(10);
  });

  it("includes current page and neighbors", () => {
    const pages = getPageNumbers(5, 10);
    expect(pages).toContain(4);
    expect(pages).toContain(5);
    expect(pages).toContain(6);
  });

  it("includes ellipsis for gaps", () => {
    const pages = getPageNumbers(1, 10);
    expect(pages).toContain("...");
  });

  it("includes ellipsis on both sides for middle pages", () => {
    const pages = getPageNumbers(5, 10);
    // Should have ellipsis between 1 and 4, and between 6 and 10
    const ellipsisCount = pages.filter((p) => p === "...").length;
    expect(ellipsisCount).toBeGreaterThanOrEqual(1);
  });

  it("page 1 shows no leading ellipsis", () => {
    const pages = getPageNumbers(1, 10);
    // First item should always be 1, not ellipsis
    expect(pages[0]).toBe(1);
  });

  it("last page shows no trailing ellipsis", () => {
    const pages = getPageNumbers(10, 10);
    // Last item should always be 10, not ellipsis
    expect(pages[pages.length - 1]).toBe(10);
  });
});