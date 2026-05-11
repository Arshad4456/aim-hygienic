"use client";

import { useEffect, useMemo, useState } from "react";
import notificationService from "@/src/app/modules/common/notifications/services/notificationService";

const CHANNEL_OPTIONS = [
  ["in_app", "In-app"],
  ["push", "Mobile push"],
  ["sms", "SMS"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
];

const EVENT_OPTIONS = [
  ["dispatch_assigned", "Dispatch assigned"],
  ["delivery_completed", "Delivery completed"],
  ["invoice_generated", "Invoice generated"],
  ["payment_received", "Payment received"],
  ["overdue_invoice", "Overdue invoice"],
  ["stock_low", "Low stock"],
  ["vehicle_maintenance_due", "Vehicle maintenance due"],
  ["return_requested", "Return requested"],
];

function number(value) {
  return Number(value || 0).toLocaleString();
}

function asDate(value) {
  if (!value) return "-";
  try { return new Date(value).toLocaleString(); } catch (_error) { return "-"; }
}

function statusClass(value = "") {
  const safe = String(value || "").toLowerCase();
  if (["sent", "read"].includes(safe)) return "bg-emerald-50 text-emerald-700";
  if (["queued", "partial", "pending"].includes(safe)) return "bg-amber-50 text-amber-700";
  if (safe.includes("not_configured")) return "bg-sky-50 text-sky-700";
  if (safe.includes("failed")) return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function Pill({ value }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(value)}`}>{String(value || "-").replace(/_/g, " ")}</span>;
}

function ChannelStatus({ row }) {
  const statuses = Array.isArray(row.channelStatuses) ? row.channelStatuses : [];
  if (!statuses.length) return <Pill value={(row.channels || ["in_app"]).join(", ")} />;
  return <div className="flex flex-wrap gap-1">
    {statuses.map((item, index) => <span key={`${item.channel}-${index}`} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClass(item.status)}`} title={item.error || item.provider || ""}>
      {String(item.channel || "in_app").replace(/_/g, " ")}: {String(item.status || "queued").replace(/_/g, " ")}
    </span>)}
  </div>;
}

function readOverview(payload = {}) {
  return payload.overview || payload.data || payload || {};
}

export default function NotificationCenterPage() {
  const [overview, setOverview] = useState({ kpis: {}, notifications: [], templates: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    body: "",
    module: "general",
    priority: "normal",
    recipientRole: "",
    recipientMobile: "",
    recipientEmail: "",
    channels: ["in_app", "push"],
  });
  const [trigger, setTrigger] = useState({ eventType: "dispatch_assigned", relatedLabel: "", recipientRole: "delivery boy", channels: ["in_app", "push"] });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const payload = await notificationService.overview({ limit: 200 });
      setOverview(readOverview(payload));
    } catch (err) {
      setError(err?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const notifications = useMemo(() => Array.isArray(overview.notifications) ? overview.notifications : [], [overview]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((row) => {
      const matchesSearch = !q || JSON.stringify(row || {}).toLowerCase().includes(q);
      const matchesFilter = filter === "all" || (filter === "unread" ? !row.isRead : String(row.status || "") === filter);
      return matchesSearch && matchesFilter;
    });
  }, [filter, notifications, query]);

  function toggleChannel(target, key) {
    const source = target === "form" ? form : trigger;
    const current = new Set(source.channels || []);
    if (current.has(key)) current.delete(key); else current.add(key);
    const next = [...current];
    if (!next.length) next.push("in_app");
    if (target === "form") setForm({ ...form, channels: next });
    else setTrigger({ ...trigger, channels: next });
  }

  async function submitManual(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await notificationService.create(form);
      setSuccess("Notification created and queued successfully.");
      setForm({ ...form, title: "", body: "" });
      await load();
    } catch (err) {
      setError(err?.message || "Unable to create notification.");
    } finally {
      setSaving(false);
    }
  }

  async function submitTrigger(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await notificationService.trigger(trigger);
      setSuccess("Workflow notification trigger created successfully.");
      setTrigger({ ...trigger, relatedLabel: "" });
      await load();
    } catch (err) {
      setError(err?.message || "Unable to run notification trigger.");
    } finally {
      setSaving(false);
    }
  }

  async function markRead(id) {
    setError("");
    try {
      await notificationService.markRead(id);
      await load();
    } catch (err) {
      setError(err?.message || "Unable to mark notification as read.");
    }
  }

  async function markAllRead() {
    setError("");
    try {
      await notificationService.markAllRead();
      await load();
    } catch (err) {
      setError(err?.message || "Unable to mark all notifications as read.");
    }
  }

  const kpis = overview.kpis || {};

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-indigo-700 to-cyan-500 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">Phase 15 Communication</p>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black">Notification Center</h2>
          <p className="mt-2 max-w-4xl text-sm text-cyan-50">In-app notifications, mobile push queue, SMS, WhatsApp, email status tracking, workflow triggers, and read/unread control for all portals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white ring-1 ring-white/25 hover:bg-white/20">Refresh</button>
          <button onClick={markAllRead} className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">Mark all read</button>
        </div>
      </div>
    </div>

    {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
    {success ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div> : null}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Total" value={number(kpis.total)} help="Loaded from notifications" />
      <Kpi label="Unread" value={number(kpis.unread)} help="Needs user attention" />
      <Kpi label="High priority" value={number(kpis.highPriority)} help="High and critical" />
      <Kpi label="Queued" value={number(kpis.queued)} help="Pending/partial channels" />
      <Kpi label="Provider setup" value={number(kpis.providerNotConfigured)} help="SMS/WhatsApp/email creds missing" />
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={submitManual} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Manual notification</p>
        <h3 className="mt-2 text-xl font-black text-slate-950">Create alert</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 md:col-span-2" required />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message" className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 md:col-span-2" required />
          <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400">
            {["general", "sales", "finance", "inventory", "logistics", "fleet", "returns", "users"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400">
            {["low", "normal", "high", "critical"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={form.recipientRole} onChange={(e) => setForm({ ...form, recipientRole: e.target.value })} placeholder="Recipient role e.g. delivery boy" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400" />
          <input value={form.recipientMobile} onChange={(e) => setForm({ ...form, recipientMobile: e.target.value })} placeholder="Mobile for SMS/WhatsApp" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400" />
          <input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} placeholder="Email recipient" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 md:col-span-2" />
        </div>
        <ChannelPicker selected={form.channels} onToggle={(key) => toggleChannel("form", key)} />
        <button disabled={saving} className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Create notification"}</button>
      </form>

      <form onSubmit={submitTrigger} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Workflow automation</p>
        <h3 className="mt-2 text-xl font-black text-slate-950">Trigger business alert</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={trigger.eventType} onChange={(e) => setTrigger({ ...trigger, eventType: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 md:col-span-2">
            {EVENT_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input value={trigger.relatedLabel} onChange={(e) => setTrigger({ ...trigger, relatedLabel: e.target.value })} placeholder="Document / invoice / vehicle no." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400" />
          <input value={trigger.recipientRole} onChange={(e) => setTrigger({ ...trigger, recipientRole: e.target.value })} placeholder="Recipient role" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400" />
        </div>
        <ChannelPicker selected={trigger.channels} onToggle={(key) => toggleChannel("trigger", key)} />
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Triggers are saved in the notification engine now. Business modules can call <b>/api/notifications/trigger</b> after order, dispatch, invoice, receipt, return, stock, and vehicle events.</div>
        <button disabled={saving} className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Run trigger"}</button>
      </form>
    </div>

    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">Notification log</h3>
          <p className="text-xs text-slate-500">{rows.length} shown from {notifications.length} records</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-cyan-400">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="queued">Queued</option>
            <option value="partial">Partial</option>
            <option value="sent">Sent</option>
            <option value="read">Read</option>
          </select>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notifications..." className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-cyan-400 lg:w-80" />
        </div>
      </div>
      {loading ? <div className="p-6 text-sm text-slate-500">Loading notifications…</div> : <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Message</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Channels</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row._id} className="border-t border-slate-100 align-top">
            <td className="px-4 py-3"><div className="font-black text-slate-950">{row.title || "Notification"}</div><div className="mt-1 max-w-md text-xs text-slate-500">{row.body || "-"}</div><div className="mt-2 flex gap-1"><Pill value={row.module || "general"} /><Pill value={row.priority || "normal"} /></div></td>
            <td className="px-4 py-3 text-slate-700"><div>{row.recipientName || row.recipientRole || row.audience || "all"}</div><div className="mt-1 text-xs text-slate-400">{row.recipientMobile || row.recipientEmail || row.recipientUserId || "-"}</div></td>
            <td className="px-4 py-3"><ChannelStatus row={row} /></td>
            <td className="px-4 py-3"><Pill value={row.readStatus || row.status} /></td>
            <td className="px-4 py-3 text-slate-500">{asDate(row.createdAt)}</td>
            <td className="px-4 py-3">{row.isRead ? <span className="text-xs font-bold text-slate-400">Read</span> : <button onClick={() => markRead(row._id)} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">Mark read</button>}</td>
          </tr>)}{!rows.length ? <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-400">No notifications yet.</td></tr> : null}</tbody>
        </table>
      </div>}
    </div>
  </div>;
}

function Kpi({ label, value, help }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{help}</p>
  </div>;
}

function ChannelPicker({ selected = [], onToggle }) {
  return <div className="mt-4 flex flex-wrap gap-2">
    {CHANNEL_OPTIONS.map(([key, label]) => <button type="button" key={key} onClick={() => onToggle(key)} className={`rounded-full px-3 py-2 text-xs font-black ring-1 ${selected.includes(key) ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200"}`}>{label}</button>)}
  </div>;
}
