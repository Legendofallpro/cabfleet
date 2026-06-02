-- Phase 7 W5 — TripLocation table + Booking realtime/consent columns.
--
-- Tenant-scoped (orgId). Application-layer org context (W1 Prisma
-- extension) filters reads automatically; RLS lockdown is in
-- prisma/sql/11_rls_trip_location.sql.
--
-- The booking-level columns are nullable / zero-default so the migration
-- is safe to deploy ahead of the application rollout.

-- 1. Booking columns
alter table "Booking"
  add column "locationConsentAt"       timestamp(3),
  add column "suspiciousLocationCount" integer not null default 0,
  add column "tripPolyline"            text;

-- 2. TripLocation table
create table "TripLocation" (
  "id"         text          primary key,
  "orgId"      text,
  "bookingId"  text          not null,
  "driverId"   text,
  "lat"        decimal(9,6)  not null,
  "lng"        decimal(9,6)  not null,
  "speedKph"   decimal(6,2),
  "recordedAt" timestamp(3)  not null,
  "createdAt"  timestamp(3)  not null default current_timestamp,
  "flagged"    boolean       not null default false,
  "flagReason" text,

  constraint "TripLocation_bookingId_fkey"
    foreign key ("bookingId") references "Booking"("id") on update cascade on delete cascade,
  constraint "TripLocation_orgId_fkey"
    foreign key ("orgId") references "Organization"("id") on update cascade on delete set null
);

create index "TripLocation_orgId_idx"                  on "TripLocation"("orgId");
create index "TripLocation_bookingId_recordedAt_idx"   on "TripLocation"("bookingId", "recordedAt");
create index "TripLocation_createdAt_idx"              on "TripLocation"("createdAt");
create index "TripLocation_driverId_idx"               on "TripLocation"("driverId");
