import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Support | CabFleet Admin",
  description: "Help and support for CabFleet administrators",
};

const FAQ = [
  {
    question: "How do I reset my password?",
    answer:
      "Use Account settings → Security to set a new password while signed in, or sign out and use Forgot password on the sign-in page.",
  },
  {
    question: "How do I change notification preferences?",
    answer: "Open Account settings → Notifications to toggle email and WhatsApp alerts and configure quiet hours.",
  },
  {
    question: "Who can change my role or branch?",
    answer:
      "Only an organization administrator can promote staff, assign branches, or change roles. Contact your admin if you need access changes.",
  },
] as const;

export default async function AdminSupportPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/support");

  const org = session.profile.orgId
    ? await db.organization.findFirst({
        where: { id: session.profile.orgId, deletedAt: null },
        select: { name: true },
      })
    : null;

  const supportEmail = env.SUPPORT_EMAIL;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBreadcrumb pageTitle="Support" />
      <p className="text-sm text-muted">
        Quick answers for common account questions. For operational issues, contact your
        organization administrator.
      </p>

      {session.profile.role === Role.SUPER_ADMIN && !org && (
        <SurfaceCard title="Platform administrator">
          <p className="text-sm text-default">
            You are signed in as a CabFleet platform administrator without an organization
            context.
          </p>
          <p className="mt-2 text-sm text-muted">
            For platform operations, billing, or escalations, contact CabFleet ops
            {supportEmail ? (
              <>
                {" "}
                at{" "}
                <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                  {supportEmail}
                </a>
              </>
            ) : (
              " (set SUPPORT_EMAIL in environment configuration)."
            )}
            .
          </p>
        </SurfaceCard>
      )}

      {org && (
        <SurfaceCard title="Your organization">
          <p className="text-sm text-default">{org.name}</p>
          <p className="mt-1 text-sm text-muted">
            Reach out to an admin in {org.name} for branch access, role changes, or fleet
            configuration.
          </p>
          {supportEmail && (
            <p className="mt-3 text-sm">
              <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                Email platform support
              </a>
            </p>
          )}
        </SurfaceCard>
      )}

      <SurfaceCard title="Frequently asked questions">
        <dl className="divide-y divide-default">
          {FAQ.map((item) => (
            <div key={item.question} className="py-4 first:pt-0 last:pb-0">
              <dt className="text-sm font-medium text-default">{item.question}</dt>
              <dd className="mt-1 text-sm text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </SurfaceCard>

      <SurfaceCard title="Related links">
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/profile" className="text-primary hover:underline">
              Edit profile
            </Link>
          </li>
          <li>
            <Link href="/profile/account" className="text-primary hover:underline">
              Account settings
            </Link>
          </li>
          <li>
            <Link href="/reset-password" className="text-primary hover:underline">
              Reset password (signed out)
            </Link>
          </li>
        </ul>
      </SurfaceCard>
    </div>
  );
}
