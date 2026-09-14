-- Private invoices bucket. PDFs are never publicly readable; the app mints
-- short-lived signed URLs after an ownership check (downloadInvoiceAction).
-- Apply in the Supabase SQL editor after deploy (storage is not in Prisma).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "invoices_public_read" ON storage.objects;
DROP POLICY IF EXISTS "invoices_no_direct_read" ON storage.objects;
CREATE POLICY "invoices_no_direct_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'invoices' AND false);

DROP POLICY IF EXISTS "invoices_no_direct_write" ON storage.objects;
CREATE POLICY "invoices_no_direct_write"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (false);
