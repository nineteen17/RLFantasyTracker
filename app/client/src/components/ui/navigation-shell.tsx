"use client";

import { usePathname, useSearchParams } from "next/navigation";
import MobileMenu from "@/components/ui/mobile-menu";
import DesktopNav from "@/components/ui/desktop-nav";

export default function NavigationShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const locationKey = `${pathname}?${searchKey}`;

  return (
    <>
      <MobileMenu key={locationKey} />
      <DesktopNav />
    </>
  );
}
