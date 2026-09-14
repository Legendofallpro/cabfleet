-- Wave 1: desk phone-primary customers + booking quote extras / landmarks.

-- Normalize blank phones so a unique index is valid.
UPDATE "Profile" SET phone = NULL WHERE phone IS NOT NULL AND btrim(phone) = '';

-- Collapse duplicate phones: keep the earliest Profile row's number, null the rest.
UPDATE "Profile" AS p
SET phone = NULL
WHERE p.phone IS NOT NULL
  AND p.id <> (
    SELECT p2.id
    FROM "Profile" AS p2
    WHERE p2.phone = p.phone
    ORDER BY p2."createdAt" ASC
    LIMIT 1
  );

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_phone_key" UNIQUE ("phone");

ALTER TABLE "Customer" ADD COLUMN "staffManaged" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Booking" ADD COLUMN "pickupLandmark" TEXT;
ALTER TABLE "Booking" ADD COLUMN "dropLandmark" TEXT;
ALTER TABLE "Booking" ADD COLUMN "notes" TEXT;
ALTER TABLE "Booking" ADD COLUMN "tollAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "parkingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
