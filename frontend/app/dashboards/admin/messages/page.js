"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function MessagesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/messages");
      setRows(data.messages || []);
    } catch (e) {
      setErr(e.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAsRead(id) {
    try {
      await apiFetch(`/messages/${id}/read`, { method: "PATCH" });
      setRows((prev) => prev.map((row) => (row._id === id ? { ...row, isRead: true } : row)));
    } catch (e) {
      setErr(e.message || "Failed to mark message as read");
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await apiFetch(`/messages/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((row) => row._id !== id));
    } catch (e) {
      setErr(e.message || "Failed to delete message");
    }
  }

  return (
    <AdminShell title="Messages" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Messages</div>
            <div className="text-sm text-zinc-500 mt-1">System alerts and user notifications.</div>
          </div>
          <button onClick={load} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50">Refresh</button>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[1020px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Title</th>
                <th className="text-left px-3 py-2 border-b">Message</th>
                <th className="text-left px-3 py-2 border-b">Sender</th>
                <th className="text-left px-3 py-2 border-b">Role</th>
                <th className="text-left px-3 py-2 border-b">Priority</th>
                <th className="text-left px-3 py-2 border-b">Date</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">No messages yet</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className={row.isRead ? "hover:bg-zinc-50" : "bg-amber-50/40 hover:bg-amber-50/70"}>
                    <td className="px-3 py-2 border-b">{row.title || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.body || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.senderName || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.senderRole || row.recipientRole || "-"}</td>
                    <td className="px-3 py-2 border-b uppercase">{row.priority || "normal"}</td>
                    <td className="px-3 py-2 border-b">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2 border-b">{row.isRead ? "Read" : "Unread"}</td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-2">
                        {row.isRead ? null : (
                          <button
                            onClick={() => markAsRead(row._id)}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-white"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => deleteMessage(row._id)}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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