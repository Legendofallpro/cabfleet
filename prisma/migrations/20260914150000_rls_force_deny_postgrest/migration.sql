-- RLS lockdown for PostgREST (anon / authenticated). Prisma still connects
-- as a superuser and bypasses RLS. This migration is the source of truth;
-- prisma/sql/*.sql files are emergency SQL-editor copies only.
--
-- ENABLE + FORCE RLS + restrictive deny-all + REVOKE grants for every
-- Prisma model in public. Idempotent.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'Organization',
    'Branch',
    'Profile',
    'Driver',
    'Staff',
    'Customer',
    'Vehicle',
    'VehicleAssignment',
    'BookingType',
    'Booking',
    'TripLocation',
    'AssignmentHistory',
    'PricingRule',
    'DispatchRule',
    'Payment',
    'Refund',
    'WebhookEvent',
    'Invoice',
    'Attendance',
    'Shift',
    'FuelLog',
    'Expense',
    'MaintenanceLog',
    'NotificationOutbox',
    'NotificationLog',
    'AuditLog'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated, PUBLIC', t);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = 'deny_direct_api_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "deny_direct_api_access" ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        t
      );
    END IF;
  END LOOP;
END $$;
