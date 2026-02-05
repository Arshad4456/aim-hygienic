"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function ProductBarcodeListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await apiFetch("/products/barcodes");
        setRows(data.products || []);
      } catch (e) {
        setErr(e.message || "Failed to load barcodes");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AdminShell title="Product Barcode List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Product Barcodes</div>
        <div className="text-sm text-zinc-500 mt-1">View barcode values for products.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product ID</th>
                <th className="text-left px-3 py-2 border-b">Name</th>
                <th className="text-left px-3 py-2 border-b">Category</th>
                <th className="text-left px-3 py-2 border-b">Sub-Category</th>
                <th className="text-left px-3 py-2 border-b">Size</th>
                <th className="text-left px-3 py-2 border-b">Barcode</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No barcodes found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.category}</td>
                    <td className="px-3 py-2 border-b">{row.subCategory || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.size || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.barcode || "-"}</td>
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
