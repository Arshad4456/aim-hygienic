"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function UserMessagesView({ titlePrefix }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch("/messages");
        setRows(data.messages || []);
      } catch (error) {
        setErr(error.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">{titlePrefix} Messages</h1>
        <p className="text-sm text-zinc-500 mt-1">Role-specific alerts and notifications.</p>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-4 overflow-auto rounded-xl border">
          <table className="min-w-[840px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Title</th>
                <th className="text-left px-3 py-2 border-b">Message</th>
                <th className="text-left px-3 py-2 border-b">Sender</th>
                <th className="text-left px-3 py-2 border-b">Role</th>
                <th className="text-left px-3 py-2 border-b">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No messages yet</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.title || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.body || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.senderName || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.senderRole || row.recipientRole || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
