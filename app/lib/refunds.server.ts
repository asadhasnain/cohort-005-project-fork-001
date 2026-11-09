import { db } from "~/db";
import {
  coupons,
  lessonProgress,
  lessons,
  modules,
  videoWatchEvents,
  LessonProgressStatus,
} from "~/db/schema";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { checkRefundable, type Refundability } from "~/lib/refunds";

function getLessonIdsForCourse(courseId: number): number[] {
  return db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((row) => row.id);
}

function getCompletedLessonCount(userId: number, lessonIds: number[]) {
  if (lessonIds.length === 0) return 0;

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .get();

  return result?.count ?? 0;
}

function getSecondsWatched(userId: number, lessonIds: number[]) {
  if (lessonIds.length === 0) return 0;

  const furthestPerLesson = db
    .select({
      furthest: sql<number>`max(${videoWatchEvents.positionSeconds})`,
    })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        inArray(videoWatchEvents.lessonId, lessonIds)
      )
    )
    .groupBy(videoWatchEvents.lessonId)
    .all();

  return furthestPerLesson.reduce((total, row) => total + row.furthest, 0);
}

function hasClaimedSeat(purchaseId: number) {
  return Boolean(
    db
      .select({ id: coupons.id })
      .from(coupons)
      .where(
        and(eq(coupons.purchaseId, purchaseId), isNotNull(coupons.redeemedAt))
      )
      .get()
  );
}

/** Whether the learner may make a Refund Request for this Purchase right now. */
export function getRefundability(purchase: {
  id: number;
  userId: number;
  courseId: number;
  createdAt: string;
}): Refundability {
  const lessonIds = getLessonIdsForCourse(purchase.courseId);

  return checkRefundable({
    purchasedAt: new Date(purchase.createdAt),
    now: new Date(),
    secondsWatched: getSecondsWatched(purchase.userId, lessonIds),
    completedLessons: getCompletedLessonCount(purchase.userId, lessonIds),
    totalLessons: lessonIds.length,
    hasClaimedSeat: hasClaimedSeat(purchase.id),
  });
}
