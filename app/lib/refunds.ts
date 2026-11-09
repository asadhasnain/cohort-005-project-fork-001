export const REFUND_WINDOW_DAYS = 14;
export const REFUND_WATCH_LIMIT_SECONDS = 2 * 60 * 60;
export const REFUND_COMPLETION_LIMIT = 0.5;

export type RefundableInput = {
  purchasedAt: Date;
  now: Date;
  secondsWatched: number;
  completedLessons: number;
  totalLessons: number;
  hasClaimedSeat: boolean;
};

export type NotRefundableReason =
  "window-closed" | "watched-too-much" | "completed-too-much" | "claimed-seat";

export type Refundability =
  { refundable: true } | { refundable: false; reason: NotRefundableReason };

// The Refund Window is counted in whole calendar days, not hours — someone
// who buys at 23:00 still gets the whole of their fourteenth day.
function calendarDay(when: Date): string {
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${when.getFullYear()}-${month}-${day}`;
}

export function lastDayOfRefundWindow(purchasedAt: Date): string {
  const deadline = new Date(purchasedAt);
  deadline.setDate(deadline.getDate() + REFUND_WINDOW_DAYS);
  return calendarDay(deadline);
}

export function checkRefundable(input: RefundableInput): Refundability {
  const today = calendarDay(input.now);
  if (
    today < calendarDay(input.purchasedAt) ||
    today > lastDayOfRefundWindow(input.purchasedAt)
  ) {
    return { refundable: false, reason: "window-closed" };
  }

  if (input.secondsWatched >= REFUND_WATCH_LIMIT_SECONDS) {
    return { refundable: false, reason: "watched-too-much" };
  }

  if (
    input.totalLessons > 0 &&
    input.completedLessons / input.totalLessons >= REFUND_COMPLETION_LIMIT
  ) {
    return { refundable: false, reason: "completed-too-much" };
  }

  // A claimed seat from a team licence belongs to the team, so the buyer
  // cannot hand it back on their own.
  if (input.hasClaimedSeat) {
    return { refundable: false, reason: "claimed-seat" };
  }

  return { refundable: true };
}
