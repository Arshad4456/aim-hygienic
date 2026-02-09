"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function PurchaseOrdersPage() {
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [movementData, warehouseData] = await Promise.all([
          apiFetch("/inventory/movements?movementType=PURCHASE_IN"),
          apiFetch("/warehouses"),
        ]);
        setMovements(movementData.movements || []);
        setWarehouses(warehouseData.warehouses || []);
      } catch (e) {
        setErr(e.message || "Failed to load purchase order data");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const groupedOrders = useMemo(() => {
    const map = new Map();
    movements.forEach((movement) => {
      const key = movement.referenceId || "Unassigned";
      const entry = map.get(key) || {
        referenceId: key,
        receiptCount: 0,
        totalQuantity: 0,
        latestAt: null,
      };
      entry.receiptCount += 1;
      entry.totalQuantity += Number(movement.quantity || 0);
      const createdAt = movement.createdAt ? new Date(movement.createdAt) : null;
      if (createdAt && (!entry.latestAt || createdAt > entry.latestAt)) {
        entry.latestAt = createdAt;
      }
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (!a.latestAt) return 1;
      if (!b.latestAt) return -1;
      return b.latestAt - a.latestAt;
    });
  }, [movements]);

  const metrics = useMemo(() => {
    const totalQty = movements.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    return [
      { label: "Purchase Orders", value: formatNumber(groupedOrders.length) },
      { label: "Inbound Receipts", value: formatNumber(movements.length) },
      { label: "Total Quantity", value: formatNumber(totalQty) },
      { label: "Warehouses", value: formatNumber(warehouses.length) },
    ];
  }, [groupedOrders.length, movements, warehouses.length]);

  return (
    <AdminShell title="Purchase Orders" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Purchase Orders</div>
              <div className="text-sm text-zinc-500 mt-1">
                Track inbound procurement receipts and warehouse coverage in real time.
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
          <div className="text-lg font-semibold text-zinc-900">Receipt Summary by PO</div>
          <div className="text-sm text-zinc-500 mt-1">
            Purchase order references are derived from inbound receipts (referenceId).
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">PO Reference</th>
                  <th className="text-left px-3 py-2 border-b">Receipt Count</th>
                  <th className="text-left px-3 py-2 border-b">Total Quantity</th>
                  <th className="text-left px-3 py-2 border-b">Latest Receipt</th>
                </tr>
              </thead>
              <tbody>
                {groupedOrders.length ? (
                  groupedOrders.map((order) => (
                    <tr key={order.referenceId} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">
                        {order.referenceId}
                      </td>
                      <td className="px-3 py-2 border-b">{formatNumber(order.receiptCount)}</td>
                      <td className="px-3 py-2 border-b">{formatNumber(order.totalQuantity)}</td>
                      <td className="px-3 py-2 border-b">
                        {order.latestAt ? order.latestAt.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                      No purchase receipts found.
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
