import { describe, it, expect } from "vitest";
import { checkRefundable } from "./refunds";

const untouched = {
  secondsWatched: 0,
  completedLessons: 0,
  totalLessons: 10,
  hasClaimedSeat: false,
};

describe("checkRefundable", () => {
  it("allows a Refund Request for an untouched purchase made today", () => {
    const purchasedAt = new Date(2026, 0, 1, 10, 0);
    const now = new Date(2026, 0, 1, 12, 0);

    expect(checkRefundable({ ...untouched, purchasedAt, now })).toEqual({
      refundable: true,
    });
  });

  it("refuses a purchase dated after today", () => {
    const purchasedAt = new Date(2026, 0, 5, 10, 0);
    const now = new Date(2026, 0, 4, 10, 0);

    expect(checkRefundable({ ...untouched, purchasedAt, now })).toEqual({
      refundable: false,
      reason: "window-closed",
    });
  });

  it("refuses once the Refund Window has closed", () => {
    const purchasedAt = new Date(2026, 0, 1, 23, 0);
    const now = new Date(2026, 0, 16, 0, 1);

    expect(checkRefundable({ ...untouched, purchasedAt, now })).toEqual({
      refundable: false,
      reason: "window-closed",
    });
  });

  it("still allows a Refund Request late on the last day of the Refund Window", () => {
    const purchasedAt = new Date(2026, 0, 1, 23, 0);
    const now = new Date(2026, 0, 15, 23, 59);

    expect(checkRefundable({ ...untouched, purchasedAt, now })).toEqual({
      refundable: true,
    });
  });

  it("refuses once the learner has watched two hours", () => {
    const purchasedAt = new Date(2026, 0, 1, 10, 0);
    const now = new Date(2026, 0, 2, 10, 0);

    expect(
      checkRefundable({
        ...untouched,
        purchasedAt,
        now,
        secondsWatched: 2 * 60 * 60,
      })
    ).toEqual({ refundable: false, reason: "watched-too-much" });
  });

  it("refuses once the learner has completed half of the lessons", () => {
    const purchasedAt = new Date(2026, 0, 1, 10, 0);
    const now = new Date(2026, 0, 2, 10, 0);

    expect(
      checkRefundable({
        ...untouched,
        purchasedAt,
        now,
        completedLessons: 5,
        totalLessons: 10,
      })
    ).toEqual({ refundable: false, reason: "completed-too-much" });
  });

  it("still allows a Refund Request for a course with no lessons", () => {
    const purchasedAt = new Date(2026, 0, 1, 10, 0);
    const now = new Date(2026, 0, 2, 10, 0);

    expect(
      checkRefundable({
        ...untouched,
        purchasedAt,
        now,
        completedLessons: 0,
        totalLessons: 0,
      })
    ).toEqual({ refundable: true });
  });

  it("refuses a purchase whose team seat has been claimed", () => {
    const purchasedAt = new Date(2026, 0, 1, 10, 0);
    const now = new Date(2026, 0, 2, 10, 0);

    expect(
      checkRefundable({ ...untouched, purchasedAt, now, hasClaimedSeat: true })
    ).toEqual({ refundable: false, reason: "claimed-seat" });
  });
});
