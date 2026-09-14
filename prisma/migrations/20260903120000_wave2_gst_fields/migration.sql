-- Wave 2: GSTIN + GST rate on the org, snapshotted onto each invoice at issue time.

ALTER TABLE "Organization" ADD COLUMN "gstin" TEXT;
ALTER TABLE "Organization" ADD COLUMN "gstRate" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Invoice" ADD COLUMN "gstin" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "gstRate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "sacCode" TEXT NOT NULL DEFAULT '9964';
