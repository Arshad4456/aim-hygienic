"use client";
import { usePathname } from "next/navigation";
export function usePortal() {
  const pathname = usePathname();
  const parts = pathname.replace(/^\/portals\/?/, "").split("/").filter(Boolean);
  return { pathname, parts, portalRoot: parts[0] || "home" };
}
export default usePortal;
