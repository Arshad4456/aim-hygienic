"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function GrnPage() {
  const [movements, setMovements] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/inventory/movements?movementType=PURCHASE_IN");
        setMovements(data.movements || []);
      } catch (e) {
        setErr(e.message || "Failed to load GRN data");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const totalQty = movements.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysReceipts = movements.filter((row) => {
      if (!row.createdAt) return false;
      return new Date(row.createdAt) >= today;
    });
    const todaysQty = todaysReceipts.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    return [
      { label: "Receipts Logged", value: formatNumber(movements.length) },
      { label: "Total Quantity", value: formatNumber(totalQty) },
      { label: "Today Receipts", value: formatNumber(todaysReceipts.length) },
      { label: "Today Quantity", value: formatNumber(todaysQty) },
    ];
  }, [movements]);

  return (
    <AdminShell title="Goods Receipt (GRN)" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Goods Receipt (GRN)</div>
              <div className="text-sm text-zinc-500 mt-1">
                Record received goods, QC status, batches, and warehouse placement.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Auto-refreshing every 30 seconds</div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Recent GRN Receipts</div>
          <div className="text-sm text-zinc-500 mt-1">
            Latest inbound movements captured for procurement receipts.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Product</th>
                  <th className="text-left px-3 py-2 border-b">Warehouse</th>
                  <th className="text-left px-3 py-2 border-b">Quantity</th>
                  <th className="text-left px-3 py-2 border-b">Reference</th>
                  <th className="text-left px-3 py-2 border-b">Received</th>
                </tr>
              </thead>
              <tbody>
                {movements.length ? (
                  movements.slice(0, 10).map((row) => (
                    <tr key={row._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b">{row.productName || row.productId}</td>
                      <td className="px-3 py-2 border-b">{row.warehouseName || row.warehouseId}</td>
                      <td className="px-3 py-2 border-b">{formatNumber(row.quantity)}</td>
                      <td className="px-3 py-2 border-b">{row.referenceId || "—"}</td>
                      <td className="px-3 py-2 border-b">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      No receipts yet. Link GRN entries to purchase orders and inventory movements.
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
