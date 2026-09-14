-- Off-platform Razorpay refunds have no staff requester.
ALTER TABLE "Refund" ALTER COLUMN "requestedById" DROP NOT NULL;
