"use client";

/**
 * Thin client-component wrapper that lazy-loads the LiveTripMap.
 *
 * Why this exists: `next/dynamic({ ssr: false })` is illegal inside
 * Server Components in Next 15 — the option must live in a Client
 * Component. So the customer booking detail page (RSC) imports THIS
 * file, and this file does the dynamic import of the heavy MapLibre
 * bundle.
 */
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type LiveTripMap from "@/modules/tracking/components/LiveTripMap";

const InnerMap = dynamic(
  () => import("@/modules/tracking/components/LiveTripMap"),
  { ssr: false, loading: () => null },
);

type Props = ComponentProps<typeof LiveTripMap>;

export default function LiveTripMapLoader(props: Props) {
  return <InnerMap {...props} />;
}
