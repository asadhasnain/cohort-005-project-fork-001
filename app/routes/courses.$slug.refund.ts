import { data, redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/courses.$slug.refund";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import { courses, purchases, refunds, users, RefundStatus } from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { parseFormData, parseParams } from "~/lib/validation";
import { formatPrice } from "~/lib/utils";
import { REFUND_WINDOW_DAYS, type NotRefundableReason } from "~/lib/refunds";
import { getRefundability } from "~/lib/refunds.server";

const NOT_REFUNDABLE_MESSAGES: Record<NotRefundableReason, string> = {
  "window-closed": `The ${REFUND_WINDOW_DAYS}-day Refund Window has closed.`,
  "watched-too-much":
    "You have watched too much of this course to request a refund.",
  "completed-too-much":
    "You have completed too much of this course to request a refund.",
  "claimed-seat": "A claimed team seat cannot be refunded.",
};

const refundParamsSchema = z.object({
  slug: z.string().min(1),
});

const refundActionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Tell us a little more about why you want a refund.")
    .max(1000, "Please keep your reason under 1000 characters."),
});

function getCourseBySlug(slug: string) {
  return db.select().from(courses).where(eq(courses.slug, slug)).get();
}

function getLatestPurchase(userId: number, courseId: number) {
  return db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    .orderBy(sql`${purchases.createdAt} desc`)
    .get();
}

function getOpenRefundRequest(purchaseId: number) {
  return db
    .select()
    .from(refunds)
    .where(
      and(
        eq(refunds.purchaseId, purchaseId),
        eq(refunds.status, RefundStatus.Requested)
      )
    )
    .get();
}

/**
 * The confirmation the learner gets in their inbox. There is no mail
 * transport wired up yet, so the built message goes to the server log.
 */
function buildRefundRequestEmail(input: {
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  amount: number;
}) {
  return {
    to: input.learnerEmail,
    subject: `Refund requested — ${input.courseTitle}`,
    body: [
      `Hi ${input.learnerName},`,
      "",
      `We have your Refund Request for "${input.courseTitle}".`,
      `If it is approved, your Refund will be ${formatPrice(input.amount)}, the amount you paid.`,
      "",
      "Our team reviews every Refund Request by hand. You do not need to do anything else — we will email you again when it has been reviewed.",
      "",
      "— The Cadence team",
    ].join("\n"),
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("You must be logged in to request a refund.", { status: 401 });
  }

  const { slug } = parseParams(params, refundParamsSchema);
  const course = getCourseBySlug(slug);

  if (!course) {
    throw data("Course not found", { status: 404 });
  }

  const learner = db
    .select()
    .from(users)
    .where(eq(users.id, currentUserId))
    .get();

  if (!learner) {
    throw data("User not found", { status: 404 });
  }

  const purchase = getLatestPurchase(currentUserId, course.id);

  if (!purchase) {
    throw data("You have not bought this course.", { status: 403 });
  }

  if (getOpenRefundRequest(purchase.id)) {
    throw data("You already have a Refund Request open on this purchase.", {
      status: 409,
    });
  }

  const refundability = getRefundability(purchase);

  if (!refundability.refundable) {
    throw data(NOT_REFUNDABLE_MESSAGES[refundability.reason], { status: 403 });
  }

  const formData = await request.formData();
  const parsed = parseFormData(formData, refundActionSchema);

  if (!parsed.success) {
    return data({ errors: parsed.errors }, { status: 400 });
  }

  db
    .insert(refunds)
    .values({
      purchaseId: purchase.id,
      status: RefundStatus.Requested,
      reason: parsed.data.reason,
    })
    .returning()
    .get();

  const email = buildRefundRequestEmail({
    learnerName: learner.name,
    learnerEmail: learner.email,
    courseTitle: course.title,
    amount: purchase.amountPaid,
  });

  console.log(
    `[email] to=${email.to} subject=${email.subject}\n${email.body}`
  );

  return redirect("/settings");
}
