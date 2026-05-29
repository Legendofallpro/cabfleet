"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Generic error boundary mounted inside the root layout. Catches uncaught
 * render errors from any non-route-group page. Route groups can ship their
 * own `error.tsx` for richer recovery. Copy stays generic — see
 * docs/web-app-security.md §5.
 */
export default function RootError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
  if (error?.digest) {
   // eslint-disable-next-line no-console
   console.error("Page error", { digest: error.digest });
  }
 }, [error]);

 return (
  <main className="flex min-h-[60vh] items-center justify-center p-6">
   <div className="w-full max-w-md rounded-2xl border border-default bg-surface-elevated p-8 text-center shadow-sm">
    <h1 className="text-xl font-semibold text-default">
     Something went wrong
    </h1>
    <p className="mt-2 text-sm text-muted">
     We hit an unexpected error. You can try again or head back home.
    </p>
    <div className="mt-6 flex justify-center gap-3">
     <button
      onClick={reset}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
     >
      Try again
     </button>
     <Link
      href="/"
      className="rounded-lg border border-default px-4 py-2 text-sm font-medium text-default hover:bg-surface"
     >
      Go home
     </Link>
    </div>
   </div>
  </main>
 );
}
