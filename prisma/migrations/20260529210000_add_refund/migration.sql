-- Phase 7 W3 §7.5 S12 — Refund model + RefundStatus enum.
--
-- Refunds are linked siblings of Payment, not in-place mutations. The
-- four-eyes flow is enforced in the service layer (requestedById <>
-- approvedById); the DB only stores the rows.
--
-- RLS lockdown is in prisma/sql/10_rls_refund.sql.

create type "RefundStatus" as enum ('REQUESTED', 'REJECTED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

create table "Refund" (
  "id"               text          primary key,
  "orgId"            text,
  "paymentId"        text          not null,
  "amount"           decimal(10,2) not null,
  "reason"           text          not null,
  "status"           "RefundStatus" not null default 'REQUESTED',
  "providerRefundId" text,
  "requestedById"    uuid          not null,
  "approvedById"     uuid,
  "processedAt"      timestamp(3),
  "failureReason"    text,
  "createdAt"        timestamp(3)  not null default current_timestamp,
  "updatedAt"        timestamp(3)  not null,

  constraint "Refund_paymentId_fkey"
    foreign key ("paymentId") references "Payment"("id") on update cascade on delete restrict,
  constraint "Refund_requestedById_fkey"
    foreign key ("requestedById") references "Profile"("id") on update cascade on delete restrict,
  constraint "Refund_approvedById_fkey"
    foreign key ("approvedById") references "Profile"("id") on update cascade on delete set null,
  constraint "Refund_orgId_fkey"
    foreign key ("orgId") references "Organization"("id") on update cascade on delete set null
);

create index "Refund_orgId_idx"           on "Refund"("orgId");
create index "Refund_paymentId_idx"       on "Refund"("paymentId");
create index "Refund_status_idx"          on "Refund"("status");
create index "Refund_providerRefundId_idx" on "Refund"("providerRefundId");
