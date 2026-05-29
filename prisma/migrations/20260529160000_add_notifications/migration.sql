-- =============================================================================
-- Phase 7 W2 — Notifications (outbox + log + per-customer preferences)
-- =============================================================================
-- Adds:
--   1. NotificationChannel enum                (EMAIL, WHATSAPP)
--   2. NotificationOutboxStatus enum           (queue lifecycle)
--   3. NotificationOutbox table                (in-tx queue, drained by cron)
--   4. NotificationLog table                   (permanent dispatch record)
--   5. Profile.notificationPrefs JSON          (opt-out + quiet hours per user)
--   6. Profile.locale text NOT NULL DEFAULT    (template localization)
--
-- The outbox-table pattern (vs queueMicrotask) is documented in the plan §6.2
-- and is required because Vercel functions can be frozen the moment the HTTP
-- response is flushed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

CREATE TYPE "NotificationOutboxStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED',
    'DEAD_LETTER'
);

-- ---------------------------------------------------------------------------
-- 2. NotificationOutbox
-- ---------------------------------------------------------------------------
CREATE TABLE "NotificationOutbox" (
    "id"            TEXT NOT NULL,
    "orgId"         TEXT,
    "bookingId"     TEXT,
    "templateId"    TEXT NOT NULL,
    "channel"       "NotificationChannel" NOT NULL,
    "recipient"     TEXT NOT NULL,
    "payload"       JSONB NOT NULL,
    "status"        "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts"      INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError"     TEXT,
    "sentAt"        TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "NotificationOutbox"
    ADD CONSTRAINT "NotificationOutbox_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "NotificationOutbox_orgId_idx"               ON "NotificationOutbox"("orgId");
CREATE INDEX "NotificationOutbox_status_nextAttemptAt_idx" ON "NotificationOutbox"("status", "nextAttemptAt");
CREATE INDEX "NotificationOutbox_bookingId_idx"           ON "NotificationOutbox"("bookingId");

-- ---------------------------------------------------------------------------
-- 3. NotificationLog
-- ---------------------------------------------------------------------------
CREATE TABLE "NotificationLog" (
    "id"                TEXT NOT NULL,
    "orgId"             TEXT,
    "bookingId"         TEXT,
    "channel"           "NotificationChannel" NOT NULL,
    "templateId"        TEXT NOT NULL,
    "recipient"         TEXT NOT NULL,
    "status"            TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage"      TEXT,
    "sentAt"            TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "NotificationLog"
    ADD CONSTRAINT "NotificationLog_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "NotificationLog_orgId_status_idx" ON "NotificationLog"("orgId", "status");
CREATE INDEX "NotificationLog_bookingId_idx"    ON "NotificationLog"("bookingId");
CREATE INDEX "NotificationLog_createdAt_idx"    ON "NotificationLog"("createdAt");

-- ---------------------------------------------------------------------------
-- 4. Profile additions
-- ---------------------------------------------------------------------------
ALTER TABLE "Profile"
    ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB,
    ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en-IN';
