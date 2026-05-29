import { Metadata } from "next";

import ResetPasswordRequestForm from "@/components/auth/ResetPasswordRequestForm";

export const metadata: Metadata = {
 title: "Reset Password | CabFleet",
 description: "Request a CabFleet password reset link.",
};

export default function ResetPasswordPage() {
 return <ResetPasswordRequestForm />;
}
