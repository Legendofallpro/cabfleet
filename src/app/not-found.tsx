import GridShape from "@/components/common/GridShape";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function NotFound() {
 return (
 <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1">
  <GridShape />
  <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
  <h1 className="mb-8 font-bold text-default text-title-md dark:text-default xl:text-title-2xl">
   ERROR
  </h1>

  <Image
   src="/images/error/404.svg"
   alt="404"
   className="dark:hidden"
   width={472}
   height={152}
  />
  <Image
   src="/images/error/404-dark.svg"
   alt="404"
   className="hidden dark:block"
   width={472}
   height={152}
  />

  <p className="mt-10 mb-6 text-base text-default sm:text-lg">
   We can’t seem to find the page you are looking for!
  </p>

  <Link
   href="/"
   className="inline-flex items-center justify-center rounded-lg border border-default bg-surface-elevated px-5 py-3.5 text-sm font-medium text-default shadow-theme-xs hover:bg-surface-inset hover:text-default "
  >
   Back to Home Page
  </Link>
  </div>
  {/* <!-- Footer --> */}
  <p className="absolute text-sm text-center text-muted -translate-x-1/2 bottom-6 left-1/2 ">
  &copy; {new Date().getFullYear()} - TailAdmin
  </p>
 </div>
 );
}
