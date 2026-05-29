-- =============================================================================
-- Phase 7 W3 — Payment gateway (webhook idempotency + provider Order linkage)
-- =============================================================================
-- Adds:
--   1. Payment.providerOrderId    (Razorpay Order id; null for MANUAL)
--   2. WebhookEvent table         (idempotency + audit for inbound webhooks)
--
-- Locked down by prisma/sql/09_rls_webhook_event.sql in the same PR (deny
-- direct API access to anon + authenticated; Prisma + service-role bypass).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Payment.providerOrderId
-- ---------------------------------------------------------------------------
ALTER TABLE "Payment"
    ADD COLUMN IF NOT EXISTS "providerOrderId" TEXT;

CREATE INDEX IF NOT EXISTS "Payment_providerOrderId_idx"
    ON "Payment"("providerOrderId");

-- ---------------------------------------------------------------------------
-- 2. WebhookEvent
-- ---------------------------------------------------------------------------
CREATE TABLE "WebhookEvent" (
    "id"         TEXT NOT NULL,
    "provider"   TEXT NOT NULL,
    "eventId"    TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload"    JSONB NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key"
    ON "WebhookEvent"("provider", "eventId");

CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");
