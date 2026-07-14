import { describe, expect, test } from "bun:test";
import { drawerWidth, shouldCompleteSwipe } from "./navigationMotion";

describe("navigation motion", () => {
  test("keeps the drawer compact on common phone widths", () => {
    expect(drawerWidth(320)).toBeCloseTo(236.8);
    expect(drawerWidth(390)).toBeCloseTo(288.6);
    expect(drawerWidth(480)).toBe(300);
  });

  test("settles by either distance or velocity", () => {
    expect(shouldCompleteSwipe(101, 300, 0, 0.35)).toBe(false);
    expect(shouldCompleteSwipe(105, 300, 0, 0.35)).toBe(true);
    expect(shouldCompleteSwipe(20, 300, 700, 0.35)).toBe(true);
  });
});
