"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function SupplierMasterPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/users?role=Supplier");
        setSuppliers(data.users || []);
      } catch (e) {
        setErr(e.message || "Failed to load suppliers");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const active = suppliers.filter((supplier) => supplier.status === "active").length;
    const withWarehouses = suppliers.filter(
      (supplier) => supplier.supplierWarehouseName1 || supplier.supplierWarehouseName2
    ).length;
    return [
      { label: "Total Suppliers", value: formatNumber(suppliers.length) },
      { label: "Active Suppliers", value: formatNumber(active) },
      { label: "Linked Warehouses", value: formatNumber(withWarehouses) },
    ];
  }, [suppliers]);

  return (
    <AdminShell title="Supplier Master" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Supplier Master</div>
              <div className="text-sm text-zinc-500 mt-1">
                Maintain supplier profiles and warehouse linkages with live updates.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Auto-refreshing every 30 seconds</div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Suppliers</div>
          <div className="text-sm text-zinc-500 mt-1">
            Supplier contacts synced from User Management.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Supplier</th>
                  <th className="text-left px-3 py-2 border-b">Contact</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Warehouse Link 1</th>
                  <th className="text-left px-3 py-2 border-b">Warehouse Link 2</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length ? (
                  suppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">
                        {supplier.fullName}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div>{supplier.mobile || supplier.mobileNumber || "—"}</div>
                        <div className="text-xs text-zinc-500">{supplier.email || "—"}</div>
                      </td>
                      <td className="px-3 py-2 border-b capitalize">{supplier.status || "—"}</td>
                      <td className="px-3 py-2 border-b">{supplier.supplierWarehouseName1 || "—"}</td>
                      <td className="px-3 py-2 border-b">{supplier.supplierWarehouseName2 || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      No suppliers found. Add suppliers in User Management.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}