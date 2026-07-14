export const EDGE_GESTURE_WIDTH = 28;
export const SWIPE_VELOCITY = 700;

export function drawerWidth(screenWidth: number): number {
  return Math.min(300, screenWidth * 0.74);
}

/**
 * Distance and velocity are normalized to the intended travel direction.
 * Keeping this rule shared prevents drawer and page transitions from feeling
 * like two unrelated navigation systems.
 */
export function shouldCompleteSwipe(
  distance: number,
  width: number,
  velocity: number,
  distanceRatio: number,
): boolean {
  "worklet";
  return distance >= width * distanceRatio || velocity >= SWIPE_VELOCITY;
}
