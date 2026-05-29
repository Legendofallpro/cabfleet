"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Fallback for uncaught render/runtime errors that escape every route group's
 * error boundary. Renders without the root layout, so we can't rely on shared
 * UI primitives. Messaging is intentionally generic — see
 * `docs/web-app-security.md` §5 and `src/lib/errors.ts`.
 */
export default function GlobalError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
  // Surface the digest in the browser console only; the server-side error
  // and stack are already captured by Next's logger.
  if (error?.digest) {
   // eslint-disable-next-line no-console
   console.error("Application error", { digest: error.digest });
  }
 }, [error]);

 return (
  <html lang="en">
   <body className="bg-surface text-default">
    <main className="flex min-h-screen items-center justify-center p-6">
     <div className="w-full max-w-md rounded-2xl border border-default bg-surface-elevated p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-default">
       Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted">
       An unexpected error occurred. Our team has been notified. You can
       try again, or return to the dashboard.
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
   </body>
  </html>
 );
}
