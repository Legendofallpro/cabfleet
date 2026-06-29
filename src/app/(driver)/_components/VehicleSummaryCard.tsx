import React from "react";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";

interface Vehicle {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  odometer: number;
  insuranceExpiry: Date | null;
  fitnessExpiry: Date | null;
  pucExpiry: Date | null;
}

interface VehicleAssignment {
  vehicle: Vehicle;
}

interface VehicleSummaryCardProps {
  assignment: VehicleAssignment | null;
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryRow({ label, date }: { label: string; date: Date | null }) {
  if (!date) return null;
  const days = daysUntil(new Date(date));
  const tone = days <= 0 ? "error" : days <= 30 ? "error" : days <= 60 ? "warning" : "neutral";
  const text = days <= 0 ? "Expired" : `${days}d left`;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <StatusBadge tone={tone}>{text}</StatusBadge>
    </div>
  );
}

export function VehicleSummaryCard({ assignment }: VehicleSummaryCardProps) {
  if (!assignment) {
    return (
      <SurfaceCard title="Your Vehicle" padding="md">
        <p className="text-sm text-muted">No vehicle assigned. Contact your administrator.</p>
      </SurfaceCard>
    );
  }

  const v = assignment.vehicle;
  const hasExpiries = v.insuranceExpiry ?? v.fitnessExpiry ?? v.pucExpiry;

  return (
    <SurfaceCard padding="md">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-caption text-muted uppercase tracking-wide">Your Vehicle</p>
          <p className="mt-0.5 text-lg font-bold text-default">
            {v.make} {v.model} {v.year}
          </p>
          <p className="text-sm text-muted">
            {v.registrationNumber}
            {v.color ? ` · ${v.color}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-caption text-muted">Odometer</p>
          <p className="text-sm font-semibold text-default">
            {v.odometer.toLocaleString()} km
          </p>
        </div>
      </div>

      {hasExpiries && (
        <div className="divide-y divide-default border-t border-default pt-2">
          <ExpiryRow label="Insurance" date={v.insuranceExpiry} />
          <ExpiryRow label="Fitness" date={v.fitnessExpiry} />
          <ExpiryRow label="PUC" date={v.pucExpiry} />
        </div>
      )}
    </SurfaceCard>
  );
}
