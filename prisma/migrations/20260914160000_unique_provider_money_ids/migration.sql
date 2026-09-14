-- Unique provider ids so webhook/order retries cannot insert duplicates.
DROP INDEX IF EXISTS "Payment_providerOrderId_idx";
DROP INDEX IF EXISTS "Refund_providerRefundId_idx";

CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");
