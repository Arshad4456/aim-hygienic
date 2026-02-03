"use client";

import { useEffect, useState } from "react";

export default function RegionsPage() {
  const [rows, setRows] = useState([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/regions");
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addRegion(e) {
    e.preventDefault();
    await fetch("/api/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    setCode("");
    setName("");
    load();
  }

  async function remove(id) {
    await fetch(`/api/regions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xl font-bold">Regions</div>
          <div className="text-sm text-gray-500">Region Code + Region Name</div>
        </div>
        <button
          onClick={load}
          className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <form onSubmit={addRegion} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Region Code</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="RWP"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Region Name</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rawalpindi Region"
              required
            />
          </div>

          <div className="flex items-end">
            <button className="w-full rounded-xl bg-black text-white py-2 font-medium">
              Add Region
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Region List</div>

        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Code</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-right px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(r.id)}
                      className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-gray-500" colSpan={3}>
                    No regions yet. Add your first region.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
