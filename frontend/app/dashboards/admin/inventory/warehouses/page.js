"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function WarehouseMasterPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await apiFetch("/warehouses");
        setRows(data.warehouses || []);
      } catch (e) {
        setErr(e.message || "Failed to load warehouses");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AdminShell title="Warehouse Master" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Warehouse Master</div>
        <div className="text-sm text-zinc-500 mt-1">Master data for warehouses and capacity.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Warehouse ID</th>
                <th className="text-left px-3 py-2 border-b">Name</th>
                <th className="text-left px-3 py-2 border-b">City</th>
                <th className="text-left px-3 py-2 border-b">Region</th>
                <th className="text-left px-3 py-2 border-b">Manager</th>
                <th className="text-left px-3 py-2 border-b">Capacity</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No warehouses found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.warehouseId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.city || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.region || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.managerName || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.capacity || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.status || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
