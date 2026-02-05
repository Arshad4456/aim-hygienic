"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function InventorySummaryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await apiFetch("/inventory/summary");
        setRows(data.summary || []);
      } catch (e) {
        setErr(e.message || "Failed to load summary");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AdminShell title="Stock Summary" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Stock Summary</div>
        <div className="text-sm text-zinc-500 mt-1">Real-time stock by warehouse.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product</th>
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-zinc-500">No stock data</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={`${row._id?.productId}-${row._id?.warehouseId}-${idx}`} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productName || row._id?.productId}</td>
                    <td className="px-3 py-2 border-b">{row.warehouseName || row._id?.warehouseId}</td>
                    <td className="px-3 py-2 border-b">{row.quantity}</td>
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
