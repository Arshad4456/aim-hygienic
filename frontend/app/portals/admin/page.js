"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../admin/components/AdminShell";
import { getAuthSnapshot, getAuthItem } from "../../lib/clientAuth";
import SystemAdminWorkspace from "./components/SystemAdminWorkspace";
import CompanyAdminWorkspace from "./components/CompanyAdminWorkspace";

export default function AdminDashboardPage() {
  const router = useRouter();
  const authSnapshot = useMemo(() => getAuthSnapshot(), []);
  const resolvedUser = authSnapshot.user;
  const normalizedRole = String(resolvedUser?.role || getAuthItem("aim_role") || "").trim().toLowerCase();
  const isSystemAdmin = normalizedRole === "admin" || normalizedRole === "system admin";

  useEffect(() => {
    const token = getAuthItem("aim_token");
    const role = String(getAuthItem("aim_role") || resolvedUser?.role || "").trim().toLowerCase();
    const allowedAdminRoles = new Set(["admin", "system admin", "company admin"]);

    if (!token || !allowedAdminRoles.has(role)) {
      router.replace("/login");
    }
  }, [resolvedUser?.role, router]);

  return (
    <AdminShell title={isSystemAdmin ? "System Admin" : "Company Admin"} user={resolvedUser}>
      {isSystemAdmin ? <SystemAdminWorkspace /> : <CompanyAdminWorkspace />}
    </AdminShell>
  );
}
