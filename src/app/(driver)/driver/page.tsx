import React from "react";

export default function DriverHomePage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        Welcome, driver
      </h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Your assigned trips and open bookings will appear here once Phase 4 ships.
      </p>
    </div>
  );
}
