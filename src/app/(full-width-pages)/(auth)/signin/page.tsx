import { Suspense } from "react";
import { Metadata } from "next";

import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In | CabFleet",
  description: "Sign in to your CabFleet account.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
