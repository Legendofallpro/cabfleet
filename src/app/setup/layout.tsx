import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup | CabFleet",
  description: "Configure country and locale for this CabFleet deployment.",
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-surface px-4 py-12">
      <div className="mx-auto w-full max-w-md flex-1">{children}</div>
    </main>
  );
}
