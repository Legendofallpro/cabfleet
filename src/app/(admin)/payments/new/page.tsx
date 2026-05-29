import { Metadata } from "next";
import { RecordPaymentForm } from "@/modules/payments/components/RecordPaymentForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";

export const metadata: Metadata = { title: "Record Payment | CabFleet Admin" };

export default async function NewPaymentPage({
 searchParams,
}: {
 searchParams: Promise<{ bookingId?: string; amount?: string }>;
}) {
 const { bookingId = "", amount } = await searchParams;

 return (
  <div>
   <PageBreadcrumb pageTitle="Record Payment" />
   <div className="mx-auto max-w-lg">
    <SurfaceCard title="Record a payment">
     <RecordPaymentForm
      bookingId={bookingId}
      defaultAmount={amount ? Number(amount) : undefined}
     />
    </SurfaceCard>
   </div>
  </div>
 );
}
