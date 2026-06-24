"use client";

import Image from "next/image";

import { cn } from "@/lib/cn";
import {
  getHeaderDisplayName,
  getHeaderInitials,
  type HeaderUser,
} from "@/layout/header-user";

type Props = {
  user: HeaderUser;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-11 w-11 text-sm",
  md: "h-14 w-14 text-xl",
  lg: "h-20 w-20 text-2xl",
} as const;

const IMAGE_PX = {
  sm: 44,
  md: 56,
  lg: 80,
} as const;

export function ProfileAvatar({ user, size = "sm", className }: Props) {
  const displayName = getHeaderDisplayName(user);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-subtle font-semibold text-primary",
        SIZE_CLASS[size],
        className,
      )}
    >
      {user.avatarUrl ? (
        <Image
          width={IMAGE_PX[size]}
          height={IMAGE_PX[size]}
          src={user.avatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        getHeaderInitials(user)
      )}
    </span>
  );
}
