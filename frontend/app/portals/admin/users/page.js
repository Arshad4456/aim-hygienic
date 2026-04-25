"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import { listFieldsCompat } from "../../../lib/fieldApi";
import { FIELD_LABELS, ROLE_EXTRA_FIELDS, getAvailableRolesForActor, validatePassword } from "./roleConfig";

const BASE_EDIT_FIELDS = ["fullName", "email", "mobileNumber", "cnicNo", "address", "businessType", "businessName"];
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read PDF file"));
    reader.readAsDataURL(file);
  });
}

export default function UserListPage({ mode = "admin" }) {
  const distributorMode = mode === "distributor";
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fields, setFields] = useState([]);
  const [me, setMe] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "userId", direction: "asc" });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [fieldsWarning, setFieldsWarning] = useState("");

  const [editUser, setEditUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [usersRes, warehousesRes, regionsRes, zonesRes, areasRes] = await Promise.all([
        apiFetch("/users"),
        apiFetch("/warehouses"),
        apiFetch("/regions"),
        apiFetch("/zones"),
        apiFetch("/areas"),
      ]);
      setRows(usersRes.users || []);
      setWarehouses(warehousesRes.warehouses || []);
      setRegions(regionsRes.regions || []);
      setZones(zonesRes.zones || []);
      setAreas(areasRes.areas || []);
      const meRes = await apiFetch("/users/me");
      setMe(meRes?.user || null);
      try {
        const companiesRes = await apiFetch("/companies");
        setCompanies(companiesRes.companies || []);
      } catch (_companyErr) {
        const companyId = String(meRes?.user?.companyId || "").trim();
        const companyName = String(meRes?.user?.companyName || "").trim();
        setCompanies(companyId ? [{ companyId, name: companyName || companyId }] : []);
      }
      try {
        const fieldsRes = await listFieldsCompat();
        setFields(fieldsRes.fields || []);
        setFieldsWarning("");
      } catch (fieldErr) {
        setFields([]);
        setFieldsWarning(fieldErr.message || "Fields API unavailable");
      }
    } catch (e) {
      setErr(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedWarehouseFilter = useMemo(
    () => warehouses.find((w) => w.warehouseId === warehouseFilter),
    [warehouses, warehouseFilter]
  );
  const selectedRegionFilter = useMemo(
    () => regions.find((r) => r.regionId === regionFilter),
    [regions, regionFilter]
  );
  const selectedZoneFilter = useMemo(
    () => zones.find((z) => z.zoneId === zoneFilter),
    [zones, zoneFilter]
  );
  const selectedTerritoryFilter = useMemo(
    () => areas.find((a) => a.areaId === territoryFilter),
    [areas, territoryFilter]
  );

  const filterRegions = useMemo(() => {
    if (!selectedWarehouseFilter) return regions;
    return regions.filter((r) => !r.companyId || r.companyId === selectedWarehouseFilter.companyId);
  }, [regions, selectedWarehouseFilter]);

  const filterZones = useMemo(() => {
    return zones.filter((z) => {
      if (selectedWarehouseFilter && z.warehouseId !== selectedWarehouseFilter.warehouseId) return false;
      if (selectedRegionFilter && z.regionId !== selectedRegionFilter.regionId) return false;
      return true;
    });
  }, [zones, selectedWarehouseFilter, selectedRegionFilter]);

  const filterTerritories = useMemo(() => {
    return areas.filter((a) => {
      if (selectedWarehouseFilter && a.warehouseId !== selectedWarehouseFilter.warehouseId) return false;
      if (selectedRegionFilter && a.regionId !== selectedRegionFilter.regionId) return false;
      if (selectedZoneFilter && a.zoneId !== selectedZoneFilter.zoneId) return false;
      return true;
    });
  }, [areas, selectedWarehouseFilter, selectedRegionFilter, selectedZoneFilter]);

  const filterFields = useMemo(() => {
    return fields.filter((f) => {
      if (selectedWarehouseFilter && f.warehouseId !== selectedWarehouseFilter.warehouseId) return false;
      if (selectedRegionFilter && f.regionId !== selectedRegionFilter.regionId) return false;
      if (selectedZoneFilter && f.zoneId !== selectedZoneFilter.zoneId) return false;
      if (selectedTerritoryFilter && f.territoryId !== selectedTerritoryFilter.areaId) return false;
      return true;
    });
  }, [fields, selectedWarehouseFilter, selectedRegionFilter, selectedZoneFilter, selectedTerritoryFilter]);

  function matchLocation(rowValueId, rowValueName, selectedId, selectedName) {
    if (!selectedId) return true;
    if (rowValueId && rowValueId === selectedId) return true;
    if (rowValueName && selectedName && rowValueName === selectedName) return true;
    return false;
  }

  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter && row.role !== roleFilter) return false;
      if (companyFilter && row.companyId !== companyFilter) return false;
      if (!matchLocation(row.warehouseId, row.warehouseName, warehouseFilter, selectedWarehouseFilter?.name)) return false;
      if (!matchLocation(row.regionId, row.regionName, regionFilter, selectedRegionFilter?.name)) return false;
      if (!matchLocation(row.zoneId, row.zoneName, zoneFilter, selectedZoneFilter?.name)) return false;
      if (!matchLocation(row.territoryId, row.territoryName, territoryFilter, selectedTerritoryFilter?.name)) return false;
      if (!matchLocation(row.fieldId, row.fieldName, fieldFilter, filterFields.find((f) => f.fieldId === fieldFilter)?.name)) return false;
      if (!value) return true;
      const hay = [
        row.userId,
        row.fullName,
        row.role,
        row.companyName,
        row.mobile,
        row.mobileNumber,
        row.email,
        row.warehouseName,
        row.regionName,
        row.zoneName,
        row.territoryName,
        row.fieldName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(value);
    });
  }, [
    rows,
    search,
    roleFilter,
    companyFilter,
    warehouseFilter,
    regionFilter,
    zoneFilter,
    territoryFilter,
    fieldFilter,
    selectedWarehouseFilter,
    selectedRegionFilter,
    selectedZoneFilter,
    selectedTerritoryFilter,
    filterFields,
  ]);

  const sortedRows = useMemo(() => {
    const rowsCopy = [...filteredRows];
    if (sortConfig.key === "userId") {
      rowsCopy.sort((a, b) => {
        const aNum = Number.parseInt(String(a.userId || ""), 10);
        const bNum = Number.parseInt(String(b.userId || ""), 10);
        const aSafe = Number.isNaN(aNum) ? Number.MAX_SAFE_INTEGER : aNum;
        const bSafe = Number.isNaN(bNum) ? Number.MAX_SAFE_INTEGER : bNum;
        if (aSafe === bSafe) return String(a.userId || "").localeCompare(String(b.userId || ""));
        return sortConfig.direction === "asc" ? aSafe - bSafe : bSafe - aSafe;
      });
      return rowsCopy;
    }

    if (sortConfig.key === "fullName") {
      rowsCopy.sort((a, b) => {
        const aName = String(a.fullName || "");
        const bName = String(b.fullName || "");
        const compare = aName.localeCompare(bName, undefined, { sensitivity: "base" });
        return sortConfig.direction === "asc" ? compare : -compare;
      });
      return rowsCopy;
    }

    return rowsCopy;
  }, [filteredRows, sortConfig]);

  function onSort(columnKey) {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return { key: columnKey, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: columnKey, direction: "asc" };
    });
  }

  async function onDelete(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete user");
    }
  }

  function openEdit(user) {
    setEditErr("");
    setEditShowPassword(false);
    setEditUser({ ...user, password: "" });
  }

  function setEditField(key, value) {
    setEditUser((prev) => ({ ...prev, [key]: value }));
  }

  async function onSaveEdit() {
    if (!editUser?._id) return;
    setEditErr("");
    const normalizedRole = String(editUser.role || "").trim().toLowerCase();
    const requiresCompany = normalizedRole && normalizedRole !== "admin" && normalizedRole !== "system admin";
    if (requiresCompany && !String(editUser.companyId || "").trim()) {
      setEditErr("Please select a company for this role.");
      return;
    }

    if (editUser.password) {
      const passwordErr = validatePassword(editUser.password);
      if (passwordErr) {
        setEditErr(passwordErr);
        return;
      }
    }

    setEditSaving(true);
    try {
      await apiFetch(`/users/${editUser._id}`, {
        method: "PUT",
        body: {
          ...editUser,
          mobile: editUser.mobileNumber || editUser.mobile,
        },
      });
      setEditUser(null);
      await load();
    } catch (e) {
      setEditErr(e.message || "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  }

  function buildExportRows() {
    return sortedRows.map((row) => ({
      userId: row.userId || "",
      fullName: row.fullName || "",
      role: row.role || "",
      company: row.companyName || "",
      mobile: row.mobileNumber || row.mobile || "",
      email: row.email || "",
      warehouse: row.warehouseName || "",
      region: row.regionName || "",
      zone: row.zoneName || "",
      territory: row.territoryName || "",
      field: row.fieldName || "",
    }));
  }

  function toCsvValue(value) {
    const text = String(value ?? "");
    if (!text.includes('"') && !text.includes(",") && !text.includes("\n")) return text;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function downloadExcel() {
    const rowsForExport = buildExportRows();
    const headers = ["User ID", "Name", "Role", "Company", "Mobile", "Email", "Warehouse", "Region", "Zone", "Territory", "Field"];
    const csvRows = rowsForExport.map((row) => [
      row.userId,
      row.fullName,
      row.role,
      row.company,
      row.mobile,
      row.email,
      row.warehouse,
      row.region,
      row.zone,
      row.territory,
      row.field,
    ]);
    const csvContent = [headers, ...csvRows].map((line) => line.map(toCsvValue).join(",")).join("\r\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function wrapByChars(value, maxChars) {
    const text = String(value || "-");
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    words.forEach((w) => {
      if (!current) {
        current = w;
        return;
      }
      if (`${current} ${w}`.length <= maxChars) current = `${current} ${w}`;
      else {
        lines.push(current);
        current = w;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : ["-"];
  }

  function buildTablePdf(rowsForExport) {
    const pageWidth = 842;
    const pageHeight = 595;
    const margin = 20;
    const rowPadding = 3;
    const fontSize = 8;

    const columns = [
      { key: "userId", label: "User ID", width: 56, chars: 10 },
      { key: "fullName", label: "Name", width: 95, chars: 18 },
      { key: "role", label: "Role", width: 95, chars: 18 },
      { key: "mobile", label: "Mobile", width: 75, chars: 14 },
      { key: "email", label: "Email", width: 120, chars: 24 },
      { key: "warehouse", label: "Warehouse", width: 90, chars: 16 },
      { key: "region", label: "Region", width: 75, chars: 14 },
      { key: "zone", label: "Zone", width: 70, chars: 12 },
      { key: "territory", label: "Territory", width: 80, chars: 14 },
      { key: "field", label: "Field", width: 66, chars: 12 },
    ];

    let y = pageHeight - margin;
    let pageContent = "";
    const pageStreams = [];

    const esc = (v) => String(v).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

    function drawText(x, yy, text, size = fontSize) {
      pageContent += `BT /F1 ${size} Tf ${x} ${yy} Td (${esc(text)}) Tj ET
`;
    }

    function drawLine(x1, y1, x2, y2) {
      pageContent += `${x1} ${y1} m ${x2} ${y2} l S
`;
    }

    function drawHeader() {
      drawText(margin, y, `AIM Hygienic - User List (${new Date().toLocaleString()})`, 10);
      y -= 16;
      let x = margin;
      const top = y + 6;
      const bottom = y - 12;
      drawLine(margin, top, pageWidth - margin, top);
      drawLine(margin, bottom, pageWidth - margin, bottom);
      columns.forEach((col) => {
        drawText(x + 2, y - 8, col.label, 8);
        drawLine(x, top, x, bottom);
        x += col.width;
      });
      drawLine(pageWidth - margin, top, pageWidth - margin, bottom);
      y -= 18;
    }

    function startPage() {
      if (pageContent) pageStreams.push(pageContent);
      pageContent = "";
      y = pageHeight - margin;
      drawHeader();
    }

    startPage();

    rowsForExport.forEach((row) => {
      const lineGroups = columns.map((col) => wrapByChars(row[col.key], col.chars));
      const maxLines = Math.max(...lineGroups.map((g) => g.length));
      const rowHeight = maxLines * 10 + rowPadding * 2;

      if (y - rowHeight < margin) startPage();

      let x = margin;
      const top = y + 6;
      const bottom = y - rowHeight + 4;
      drawLine(margin, top, pageWidth - margin, top);
      drawLine(margin, bottom, pageWidth - margin, bottom);

      columns.forEach((col, idx) => {
        drawLine(x, top, x, bottom);
        lineGroups[idx].forEach((line, li) => drawText(x + 2, y - 8 - li * 10, line, 8));
        x += col.width;
      });
      drawLine(pageWidth - margin, top, pageWidth - margin, bottom);

      y -= rowHeight;
    });

    if (pageContent) pageStreams.push(pageContent);

    const objs = [];
    const catalogObjId = 1;
    const pagesObjId = 2;
    const fontObjId = 3;

    const pageObjIds = [];
    const streamObjIds = [];
    let nextObjId = 4;
    pageStreams.forEach(() => {
      pageObjIds.push(nextObjId);
      nextObjId += 1;
      streamObjIds.push(nextObjId);
      nextObjId += 1;
    });

    objs[catalogObjId] = `<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`;
    objs[pagesObjId] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`;
    objs[fontObjId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

    pageStreams.forEach((stream, index) => {
      objs[pageObjIds[index]] = `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${streamObjIds[index]} 0 R >>`;
      objs[streamObjIds[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = new Array(objs.length).fill(0);
    for (let idx = 1; idx < objs.length; idx += 1) {
      const obj = objs[idx];
      if (!obj) continue;
      offsets[idx] = pdf.length;
      pdf += `${idx} 0 obj\n${obj}\nendobj\n`;
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objs.length; i += 1) {
      const offset = offsets[i] || 0;
      const marker = objs[i] ? "n" : "f";
      pdf += `${String(offset).padStart(10, "0")} 00000 ${marker} \n`;
    }
    pdf += `trailer\n<< /Size ${objs.length} /Root ${catalogObjId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return pdf;
  }

  function downloadPdf() {
    const rowsForExport = buildExportRows();
    const pdfContent = buildTablePdf(rowsForExport);
    const blob = new Blob([pdfContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const visibleRoles = useMemo(() => getAvailableRolesForActor({
    actorRole: me?.role || "",
    distributorMode,
  }), [distributorMode, me?.role]);

  return (
    <AdminShell title={distributorMode ? "Distributor User List" : "User List"} user={null}>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Users</div>
        <div className="mt-1 text-sm text-zinc-500">All users list with role-based details and edit support. Click User ID or Name to sort.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {fieldsWarning ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{fieldsWarning} (User list is loaded without Field master mapping.)</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All roles</option>
            {visibleRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.companyId} value={c.companyId}>{c.name}</option>)}
          </select>
          <select
            value={warehouseFilter}
            onChange={(e) => {
              setWarehouseFilter(e.target.value);
              setRegionFilter("");
              setZoneFilter("");
              setTerritoryFilter("");
              setFieldFilter("");
            }}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All warehouses</option>
            {warehouses.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.name}</option>)}
          </select>
          <select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setZoneFilter("");
              setTerritoryFilter("");
              setFieldFilter("");
            }}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All regions</option>
            {filterRegions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
          </select>
          <select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value);
              setTerritoryFilter("");
              setFieldFilter("");
            }}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All zones</option>
            {filterZones.map((z) => <option key={z.zoneId} value={z.zoneId}>{z.name}</option>)}
          </select>
          <select
            value={territoryFilter}
            onChange={(e) => {
              setTerritoryFilter(e.target.value);
              setFieldFilter("");
            }}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All territories</option>
            {filterTerritories.map((a) => <option key={a.areaId} value={a.areaId}>{a.name}</option>)}
          </select>
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All fields</option>
            {filterFields.map((f) => <option key={f.fieldId} value={f.fieldId}>{f.name}</option>)}
          </select>
          <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Total users: <b>{sortedRows.length}</b></div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={downloadExcel}
            className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Download Excel (CSV)
          </button>
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="border-b px-3 py-2 text-left">
                  <button type="button" onClick={() => onSort("userId")} className="inline-flex items-center gap-1 font-medium hover:text-emerald-700">
                    User ID
                    {sortConfig.key === "userId" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="border-b px-3 py-2 text-left">
                  <button type="button" onClick={() => onSort("fullName")} className="inline-flex items-center gap-1 font-medium hover:text-emerald-700">
                    Name
                    {sortConfig.key === "fullName" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="border-b px-3 py-2 text-left">Role</th>
                <th className="border-b px-3 py-2 text-left">Company</th>
                <th className="border-b px-3 py-2 text-left">Mobile</th>
                <th className="border-b px-3 py-2 text-left">Warehouse</th>
                <th className="border-b px-3 py-2 text-left">Region</th>
                <th className="border-b px-3 py-2 text-left">Zone</th>
                <th className="border-b px-3 py-2 text-left">Territory</th>
                <th className="border-b px-3 py-2 text-left">Field</th>
                <th className="border-b px-3 py-2 text-left">Documents</th>
                <th className="border-b px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-6 text-center text-zinc-500">No users found</td></tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="border-b px-3 py-2">{row.userId || "-"}</td>
                    <td className="border-b px-3 py-2">{row.fullName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.role || "-"}</td>
                    <td className="border-b px-3 py-2">{row.companyName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.mobileNumber || row.mobile || "-"}</td>
                    <td className="border-b px-3 py-2">{row.warehouseName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.regionName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.zoneName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.territoryName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.fieldName || "-"}</td>
                    <td className="border-b px-3 py-2">
                      <button onClick={() => openEdit(row)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">
                        {row.documentPdfUrl || row.documentPdf ? "View / Edit" : "Upload"}
                      </button>
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Edit</button>
                        <button onClick={() => onDelete(row._id)} className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-zinc-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editUser ? (
        <EditUserModal
          user={editUser}
          setField={setEditField}
          onClose={() => setEditUser(null)}
          onSave={onSaveEdit}
          saving={editSaving}
          error={editErr}
          warehouses={warehouses}
          companies={companies}
          regions={regions}
          zones={zones}
          areas={areas}
          fields={fields}
          showPassword={editShowPassword}
          setShowPassword={setEditShowPassword}
        />
      ) : null}
    </AdminShell>
  );
}

function EditUserModal({
  user,
  setField,
  onClose,
  onSave,
  saving,
  error,
  warehouses,
  companies,
  regions,
  zones,
  areas,
  fields,
  showPassword,
  setShowPassword,
}) {
  const roleNeeds = ROLE_EXTRA_FIELDS[user.role] || [];
  const requiresCompany = useMemo(() => {
    const normalizedRole = String(user.role || "").trim().toLowerCase();
    return Boolean(normalizedRole && normalizedRole !== "admin" && normalizedRole !== "system admin");
  }, [user.role]);

  const selectedWarehouse = warehouses.find((x) => x.warehouseId === user.warehouseId);
  const selectedRegion = regions.find((x) => x.regionId === user.regionId);
  const selectedZone = zones.find((x) => x.zoneId === user.zoneId);

  const filteredRegions = regions.filter((r) => {
    if (!selectedWarehouse) return true;
    return !r.companyId || r.companyId === selectedWarehouse.companyId;
  });
  const filteredZones = zones.filter((z) => {
    if (selectedWarehouse && z.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && z.regionId !== selectedRegion.regionId) return false;
    return true;
  });
  const filteredAreas = areas.filter((a) => {
    if (selectedWarehouse && a.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && a.regionId !== selectedRegion.regionId) return false;
    if (selectedZone && a.zoneId !== selectedZone.zoneId) return false;
    return true;
  });
  const filteredTerritories = filteredAreas;
  const filteredFields = fields.filter((f) => {
    if (selectedWarehouse && f.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && f.regionId !== selectedRegion.regionId) return false;
    if (selectedZone && f.zoneId !== selectedZone.zoneId) return false;
    if (user.territoryId && f.territoryId !== user.territoryId) return false;
    return true;
  });


  const visibleTextFields = BASE_EDIT_FIELDS.filter((f) => !!user[f] || ["fullName", "mobileNumber", "cnicNo", "email", "address"].includes(f));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-xl sm:w-[680px]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-lg font-semibold text-zinc-900">Edit User</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField label="User ID" value={user.userId || ""} readOnly />
            <InputField label="Role" value={user.role || ""} readOnly />
            {requiresCompany ? (
              <SelectField
                label="Company"
                value={user.companyId || ""}
                onChange={(companyId) => {
                  const item = companies.find((c) => c.companyId === companyId);
                  setField("companyId", item?.companyId || "");
                  setField("companyName", item?.name || "");
                }}
                options={companies.map((c) => ({ value: c.companyId, label: `${c.name} (${c.companyId})` }))}
              />
            ) : null}

            {roleNeeds.includes("warehouse") ? (
              <SelectField
                label="Warehouse Name"
                value={user.warehouseId || ""}
                onChange={(warehouseId) => {
                  const item = warehouses.find((w) => w.warehouseId === warehouseId);
                  setField("warehouseId", item?.warehouseId || "");
                  setField("warehouseName", item?.name || "");
                  setField("regionId", "");
                  setField("regionName", "");
                  setField("zoneId", "");
                  setField("zoneName", "");
                  setField("territoryId", "");
                  setField("territoryName", "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))}
              />
            ) : null}

            {roleNeeds.includes("region") ? (
              <SelectField
                label="Region Name"
                value={user.regionId || ""}
                onChange={(regionId) => {
                  const item = regions.find((r) => r.regionId === regionId);
                  setField("regionId", item?.regionId || "");
                  setField("regionName", item?.name || "");
                  setField("zoneId", "");
                  setField("zoneName", "");
                  setField("territoryId", "");
                  setField("territoryName", "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={filteredRegions.map((r) => ({ value: r.regionId, label: r.name }))}
              />
            ) : null}

            {roleNeeds.includes("zone") ? (
              <SelectField
                label="Zone Name"
                value={user.zoneId || ""}
                onChange={(zoneId) => {
                  const item = zones.find((z) => z.zoneId === zoneId);
                  setField("zoneId", item?.zoneId || "");
                  setField("zoneName", item?.name || "");
                  setField("territoryId", "");
                  setField("territoryName", "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={filteredZones.map((z) => ({ value: z.zoneId, label: z.name }))}
              />
            ) : null}

            {roleNeeds.includes("territory") ? (
              <SelectField
                label="Territory Name"
                value={user.territoryId || ""}
                onChange={(areaId) => {
                  const item = areas.find((a) => a.areaId === areaId);
                  setField("territoryId", item?.areaId || "");
                  setField("territoryName", item?.name || "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={filteredTerritories.map((a) => ({ value: a.areaId, label: a.name }))}
              />
            ) : null}

            {roleNeeds.includes("field") ? (
              <SelectField
                label="Field Name"
                value={user.fieldId || ""}
                onChange={(areaId) => {
                  const item = fields.find((a) => a.fieldId === areaId);
                  setField("fieldId", item?.fieldId || "");
                  setField("fieldName", item?.name || "");
                }}
                options={filteredFields.map((a) => ({ value: a.fieldId, label: a.name }))}
              />
            ) : null}

            {visibleTextFields.map((field) => (
              <InputField
                key={field}
                label={FIELD_LABELS[field] || field}
                value={user[field] || ""}
                onChange={(v) => setField(field, v)}
              />
            ))}

            <PasswordField
              label="New Password (optional)"
              value={user.password || ""}
              onChange={(v) => setField("password", v)}
              show={showPassword}
              setShow={setShowPassword}
            />
            <DocumentPdfField
              userId={user.userId || user._id || "unknown"}
              fileName={user.documentPdfName || ""}
              fileUrl={user.documentPdfUrl || user.documentPdf || ""}
              onSetFile={(fileUrl, fileName, objectKey) => {
                setField("documentPdfUrl", fileUrl);
                setField("documentPdfObjectKey", objectKey || "");
                setField("documentPdfName", fileName);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t p-4">
          <button onClick={onSave} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? "Updating..." : "Update User"}
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function InputField({ label, value, onChange, readOnly = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">Choose...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, setShow }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2 pr-16 outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

function DocumentPdfField({ userId, fileName, fileUrl, onSetFile }) {
  async function onSelectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF documents are allowed.");
      return;
    }
    try {
      const data = await readFileAsDataUrl(file);
      const uploadRes = await apiFetch("/uploads/user-document", {
        method: "POST",
        body: {
          userId: userId || "unknown",
          contentType: "application/pdf",
          fileBase64: data,
          fileName: file.name || "document.pdf",
        },
      });
      onSetFile(uploadRes.publicUrl || "", file.name || "document.pdf", uploadRes.objectKey || "");
    } catch (error) {
      alert(error.message || "Failed to read PDF file");
    }
  }

  return (
    <div className="md:col-span-2">
      <Label>User Document PDF</Label>
      <input type="file" accept="application/pdf" onChange={onSelectFile} className="mt-1 block w-full text-sm" />
      {fileName ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-700">{fileName}</span>
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-2 py-1 text-xs hover:bg-zinc-50">
              Open PDF
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!confirm("Are you sure, to delete this document pdf")) return;
              onSetFile("", "", "");
            }}
            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Delete Document
          </button>
        </div>
      ) : (
        <div className="mt-1 text-xs text-zinc-500">No document uploaded.</div>
      )}
    </div>
  );
}