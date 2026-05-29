import { Metadata } from "next";

import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
 title: "Sign Up | CabFleet",
 description: "Create a CabFleet customer account.",
};

export default function SignUpPage() {
 return <SignUpForm />;
}
