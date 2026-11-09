# Cadence

An online course platform where learners buy courses and can ask for their money back.

## Language

### Refunds

**Refund Request**:
A learner's ask to get their money back for a Purchase. It is Requested until someone Approves or Declines it.
_Avoid_: Reversal, Chargeback, Cancellation, Pending Chargeback, Pending (a Refund Request is never "pending")

**Refund**:
Money returned to a learner for a Purchase, always the full amount they paid. It is Pending until the money has gone back, then Completed, or Failed if it could not be returned.
_Avoid_: Reversal, Chargeback, Partial refund, Issued, Processed, Settled

**Decline Reason**:
The note written by whoever declines a Refund Request, explaining to the learner why it was declined.
_Avoid_: Reason (on its own, it means the learner's reason for asking), Rejection note

**Refund Window**:
The 14 calendar days after a Purchase during which the learner may make a Refund Request.
_Avoid_: Cancel window, Cancellation window

**Refundable**:
A Purchase is Refundable when it is inside its Refund Window, the learner has watched less than 2 hours and completed less than half of the lessons, and it is not a claimed team seat.
_Avoid_: Cancellable, Eligible

## Relationships

- A learner can make a **Refund Request** only for a **Refundable** Purchase.
- A **Purchase** can have many **Refund Requests** over time, but at most one Requested at once. A learner may ask again after a Decline.
- A learner cannot withdraw a **Refund Request**.
- Approving a **Refund Request** creates exactly one **Refund**, which starts Pending.
- A Declined **Refund Request** never results in a **Refund**, and always has a **Decline Reason**.
- A **Refund** can exist without a **Refund Request**, for example when support gives money back unprompted.
- A Failed **Refund** is retried, which returns it to Pending. It is never replaced with a second **Refund**.
- A learner loses access to the course when their **Refund Request** is Approved, not when the **Refund** is Completed.
