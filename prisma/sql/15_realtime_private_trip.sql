-- Private Realtime authorization for live trip channels (`trip:{bookingId}`).
-- Apply in the Supabase SQL editor AND enable "Realtime Authorization"
-- for Broadcast in the dashboard. Keep REALTIME_TRACKING_ENABLED=false
-- until this is live — public channel names are otherwise guessable from
-- booking ids in URLs.
--
-- Who may subscribe:
--   * authenticated customer whose Profile owns the booking's Customer
--   * authenticated driver assigned to or claiming the booking
--
-- The ingest path publishes with the service-role client (bypasses RLS).

alter table realtime.messages enable row level security;

drop policy if exists "cabfleet_trip_broadcast_select" on realtime.messages;
create policy "cabfleet_trip_broadcast_select"
on realtime.messages
for select
to authenticated
using (
  exists (
    select 1
    from public."Booking" b
    join public."Customer" c on c.id = b."customerId"
    where realtime.topic() = concat('trip:', b.id)
      and c."profileId" = auth.uid()
      and b."deletedAt" is null
      and c."deletedAt" is null
  )
  or exists (
    select 1
    from public."Booking" b
    join public."Driver" d on d.id in (b."claimedByDriverId", b."assignedDriverId")
    where realtime.topic() = concat('trip:', b.id)
      and d."profileId" = auth.uid()
      and b."deletedAt" is null
      and d."deletedAt" is null
  )
);

drop policy if exists "cabfleet_trip_broadcast_insert" on realtime.messages;
create policy "cabfleet_trip_broadcast_insert"
on realtime.messages
for insert
to authenticated
with check (false);
