import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import { AIM_USER_ROLES, FIELD_LABELS, ROLE_EXTRA_FIELDS, validatePassword } from './roleConfig';

const BASE_EDIT_FIELDS = ['fullName', 'email', 'mobileNumber', 'cnicNo', 'address', 'businessType', 'businessName'];
const PAGE_SIZE = 50;

function Field({ label, value, onChangeText, secureTextEntry = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} style={styles.input} placeholderTextColor="#71717a" />
    </View>
  );
}

function toCsv(rows) {
  const headers = ['User ID', 'Name', 'Role', 'Warehouse', 'Region', 'Zone', 'Territory', 'Field', 'Mobile', 'Email'];
  const lines = rows.map((u) => [
    u.userId || '', u.fullName || '', u.role || '', u.warehouseName || '', u.regionName || '', u.zoneName || '', u.territoryName || '', u.fieldName || '', u.mobileNumber || '', u.email || '',
  ]);
  return [headers.join(','), ...lines.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
}

function wrapByChars(value, maxChars) {
  const text = String(value || '-');
  if (text.length <= maxChars) return [text];
  const out = [];
  let rest = text;
  while (rest.length > maxChars) {
    out.push(rest.slice(0, maxChars));
    rest = rest.slice(maxChars);
  }
  if (rest) out.push(rest);
  return out;
}

function pdfEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildTablePdf(rows) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 26;
  const rowPadding = 3;

  const columns = [
    { key: 'userId', label: 'User ID', width: 64, chars: 12 },
    { key: 'fullName', label: 'Name', width: 110, chars: 20 },
    { key: 'role', label: 'Role', width: 95, chars: 17 },
    { key: 'warehouseName', label: 'Warehouse', width: 86, chars: 16 },
    { key: 'regionName', label: 'Region', width: 72, chars: 14 },
    { key: 'zoneName', label: 'Zone', width: 72, chars: 14 },
    { key: 'territoryName', label: 'Territory', width: 82, chars: 15 },
    { key: 'fieldName', label: 'Field', width: 68, chars: 13 },
    { key: 'mobileNumber', label: 'Mobile', width: 84, chars: 14 },
    { key: 'email', label: 'Email', width: 123, chars: 24 },
  ];

  const rowsForExport = rows.map((row) => ({
    userId: row.userId || '-',
    fullName: row.fullName || '-',
    role: row.role || '-',
    warehouseName: row.warehouseName || '-',
    regionName: row.regionName || '-',
    zoneName: row.zoneName || '-',
    territoryName: row.territoryName || '-',
    fieldName: row.fieldName || '-',
    mobileNumber: row.mobileNumber || '-',
    email: row.email || '-',
  }));

  const pageStreams = [];
  let pageContent = '';
  let y = pageHeight - margin;

  function drawText(x, yy, text, size = 8) {
    pageContent += `BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET\n`;
  }

  function drawLine(x1, y1, x2, y2) {
    pageContent += `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
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
    pageContent = '';
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
  objs[pagesObjId] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;
  objs[fontObjId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pageStreams.forEach((stream, index) => {
    objs[pageObjIds[index]] = `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${streamObjIds[index]} 0 R >>`;
    objs[streamObjIds[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
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
    const marker = objs[i] ? 'n' : 'f';
    pdf += `${String(offset).padStart(10, '0')} 00000 ${marker} \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length} /Root ${catalogObjId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function toBase64(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++) & 0xff;
    const c2 = i < str.length ? str.charCodeAt(i++) & 0xff : Number.NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) & 0xff : Number.NaN;

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;

    if (Number.isNaN(c2)) {
      e3 = 64;
      e4 = 64;
    } else if (Number.isNaN(c3)) {
      e4 = 64;
    }

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
}

export default function UsersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fields, setFields] = useState([]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [sortBy, setSortBy] = useState('userId');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);

  const [err, setErr] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [usersRes, warehousesRes, regionsRes, zonesRes, areasRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/warehouses'),
        apiClient.get('/regions'),
        apiClient.get('/zones'),
        apiClient.get('/areas'),
      ]);
      setRows(usersRes.data?.users || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setRegions(regionsRes.data?.regions || []);
      setZones(zonesRes.data?.zones || []);
      setAreas(areasRes.data?.areas || []);
      try {
        const fieldsRes = await apiClient.get('/fields');
        setFields(fieldsRes.data?.fields || []);
      } catch {
        setFields([]);
      }
    } catch (e) {
      setErr(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, warehouseFilter, regionFilter, zoneFilter, territoryFilter, fieldFilter, sortBy, sortDirection]);

  const selectedWarehouse = useMemo(() => warehouses.find((w) => w.warehouseId === warehouseFilter), [warehouses, warehouseFilter]);
  const selectedRegion = useMemo(() => regions.find((r) => r.regionId === regionFilter), [regions, regionFilter]);
  const selectedZone = useMemo(() => zones.find((z) => z.zoneId === zoneFilter), [zones, zoneFilter]);
  const selectedTerritory = useMemo(() => areas.find((a) => a.areaId === territoryFilter), [areas, territoryFilter]);

  const filterRegions = useMemo(() => {
    if (!selectedWarehouse) return regions;
    return regions.filter((r) => !r.companyId || r.companyId === selectedWarehouse.companyId);
  }, [regions, selectedWarehouse]);

  const filterZones = useMemo(() => zones.filter((z) => {
    if (selectedWarehouse && z.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && z.regionId !== selectedRegion.regionId) return false;
    return true;
  }), [zones, selectedWarehouse, selectedRegion]);

  const filterTerritories = useMemo(() => areas.filter((a) => {
    if (selectedWarehouse && a.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && a.regionId !== selectedRegion.regionId) return false;
    if (selectedZone && a.zoneId !== selectedZone.zoneId) return false;
    return true;
  }), [areas, selectedWarehouse, selectedRegion, selectedZone]);

  const filterFields = useMemo(() => fields.filter((f) => {
    if (selectedWarehouse && f.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && f.regionId !== selectedRegion.regionId) return false;
    if (selectedZone && f.zoneId !== selectedZone.zoneId) return false;
    if (selectedTerritory && f.territoryId !== selectedTerritory.areaId) return false;
    return true;
  }), [fields, selectedWarehouse, selectedRegion, selectedZone, selectedTerritory]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((u) => {
      if (term) {
        const inSearch = [u.userId, u.fullName, u.email, u.mobileNumber, u.role].some((v) => String(v || '').toLowerCase().includes(term));
        if (!inSearch) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (warehouseFilter && u.warehouseId !== warehouseFilter) return false;
      if (regionFilter && u.regionId !== regionFilter) return false;
      if (zoneFilter && u.zoneId !== zoneFilter) return false;
      if (territoryFilter && u.territoryId !== territoryFilter) return false;
      if (fieldFilter && u.fieldId !== fieldFilter) return false;
      return true;
    });
  }, [rows, search, roleFilter, warehouseFilter, regionFilter, zoneFilter, territoryFilter, fieldFilter]);

  const filteredSorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      const left = String(a[sortBy] || '').toLowerCase();
      const right = String(b[sortBy] || '').toLowerCase();
      const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? result : -result;
    });
    return next;
  }, [filtered, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, safePage]);

  const onDelete = (id) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/users/${id}`);
            await load();
          } catch (e) {
            setErr(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const openEdit = (user) => {
    setEditUser({ ...user, password: '' });
  };

  const updateUser = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setErr('');
    try {
      if (editUser.password) {
        const passwordError = validatePassword(editUser.password);
        if (passwordError) throw new Error(passwordError);
      }
      const payload = { ...editUser };
      if (!payload.password) delete payload.password;
      await apiClient.put(`/users/${editUser._id}`, payload);
      setEditUser(null);
      await load();
    } catch (e) {
      setErr(e.message || 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const onSortColumn = (column) => {
    if (sortBy === column) {
      setSortDirection((s) => (s === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const downloadCsv = async () => {
    try {
      const csv = toCsv(filteredSorted);
      const uri = `data:text/csv;base64,${toBase64(csv)}`;
      await Share.share({
        title: 'Users Excel (CSV)',
        url: uri,
      });
      Alert.alert('Downloaded Successfully', 'CSV file is ready. Save it from the share options to local File Manager.');
    } catch (e) {
      Alert.alert('Download Failed', e.message || 'Could not export CSV file.');
    }
  };

  const downloadPdf = async () => {
    try {
      const htmlTable = buildPdfHtml(filteredSorted)
        .replace(/\n\s+/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      await Share.share({
        title: 'Users PDF Report',
        message: htmlTable,
      });
      Alert.alert('Downloaded Successfully', 'PDF report content generated. Use the share sheet to save it in your File Manager.');
    } catch (e) {
      Alert.alert('Download Failed', e.message || 'Could not export PDF file.');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>User List</Text>
            <Text style={styles.subtitle}>Maintain roles, regions, zones, and territories.</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => navigation?.navigate?.('admin:users/add')}><Text style={styles.addBtnText}>Add User</Text></Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Users</Text>
            <Text style={styles.totalCount}>{rows.length}</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Filtered Users</Text>
            <Text style={styles.totalCount}>{filteredSorted.length}</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor="#71717a" style={styles.input} />

          <FilterRow label="Role" value={roleFilter} onClear={() => setRoleFilter('')} options={AIM_USER_ROLES} onPick={setRoleFilter} />
          <FilterRow label="Warehouse" value={warehouseFilter} onClear={() => setWarehouseFilter('')} options={warehouses.map((w) => ({ label: w.name, value: w.warehouseId }))} onPick={setWarehouseFilter} />
          <FilterRow label="Region" value={regionFilter} onClear={() => setRegionFilter('')} options={filterRegions.map((r) => ({ label: r.name, value: r.regionId }))} onPick={setRegionFilter} />
          <FilterRow label="Zone" value={zoneFilter} onClear={() => setZoneFilter('')} options={filterZones.map((z) => ({ label: z.name, value: z.zoneId }))} onPick={setZoneFilter} />
          <FilterRow label="Territory" value={territoryFilter} onClear={() => setTerritoryFilter('')} options={filterTerritories.map((a) => ({ label: a.name, value: a.areaId }))} onPick={setTerritoryFilter} />
          <FilterRow label="Field" value={fieldFilter} onClear={() => setFieldFilter('')} options={filterFields.map((f) => ({ label: f.name, value: f.fieldId }))} onPick={setFieldFilter} />

          <View style={styles.exportRow}>
            <Pressable style={styles.exportBtnPrimary} onPress={downloadPdf}><Text style={styles.exportTextPrimary}>Download PDF</Text></Pressable>
            <Pressable style={styles.exportBtnSecondary} onPress={downloadCsv}><Text style={styles.exportTextSecondary}>Download Excel (CSV)</Text></Pressable>
          </View>
        </View>

        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <Pressable onPress={() => onSortColumn('userId')} style={[styles.headCell, styles.colData, styles.sortableHead]}>
                <Text style={styles.headText}>User ID {sortBy === 'userId' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</Text>
              </Pressable>
              <Pressable onPress={() => onSortColumn('fullName')} style={[styles.headCell, styles.colData, styles.sortableHead]}>
                <Text style={styles.headText}>Name {sortBy === 'fullName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</Text>
              </Pressable>
              {['Role', 'Warehouse', 'Region', 'Zone', 'Territory', 'Field', 'Mobile', 'Email', 'Actions'].map((h) => (
                <View key={h} style={[styles.headCell, h === 'Actions' ? styles.colAction : styles.colData]}>
                  <Text style={styles.headText}>{h}</Text>
                </View>
              ))}
            </View>

            <View style={styles.stack}>
              {paginatedRows.length === 0 ? (
                <Text style={styles.help}>No users found.</Text>
              ) : (
                paginatedRows.map((u) => (
                  <View key={u._id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.colData]}>{u.userId || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.fullName || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.role || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.warehouseName || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.regionName || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.zoneName || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.territoryName || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.fieldName || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.mobileNumber || '-'}</Text>
                    <Text style={[styles.cell, styles.colData]}>{u.email || '-'}</Text>
                    <View style={styles.actionCell}>
                      <Pressable style={styles.editBtn} onPress={() => openEdit(u)}><Text style={styles.editBtnText}>Edit</Text></Pressable>
                      <Pressable style={styles.deleteBtn} onPress={() => onDelete(u._id)}><Text style={styles.deleteBtnText}>Delete</Text></Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.paginationWrap}>
          <Text style={styles.pageText}>Page {safePage} of {totalPages}</Text>
          <View style={styles.pageActions}>
            <Pressable style={[styles.pageBtn, safePage === 1 ? styles.pageBtnDisabled : null]} disabled={safePage === 1} onPress={() => setPage(1)}><Text style={styles.pageBtnText}>Start</Text></Pressable>
            <Pressable style={[styles.pageBtn, safePage === 1 ? styles.pageBtnDisabled : null]} disabled={safePage === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}><Text style={styles.pageBtnText}>Previous</Text></Pressable>
            <Pressable style={[styles.pageBtn, safePage === totalPages ? styles.pageBtnDisabled : null]} disabled={safePage === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}><Text style={styles.pageBtnText}>Next</Text></Pressable>
            <Pressable style={[styles.pageBtn, safePage === totalPages ? styles.pageBtnDisabled : null]} disabled={safePage === totalPages} onPress={() => setPage(totalPages)}><Text style={styles.pageBtnText}>End</Text></Pressable>
          </View>
        </View>
      </Card>

      <Modal visible={Boolean(editUser)} transparent animationType="slide" onRequestClose={() => setEditUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit User</Text>
            {editUser ? (
              <ScrollView contentContainerStyle={styles.formWrap}>
                {BASE_EDIT_FIELDS.map((field) => (
                  <Field
                    key={field}
                    label={FIELD_LABELS[field] || field}
                    value={editUser[field] || ''}
                    onChangeText={(v) => setEditUser((s) => ({ ...s, [field]: v }))}
                  />
                ))}
                <Field label="Password (optional)" value={editUser.password || ''} secureTextEntry onChangeText={(v) => setEditUser((s) => ({ ...s, password: v }))} />

                {(ROLE_EXTRA_FIELDS[editUser.role] || []).includes('businessType') ? <Field label="Business Type" value={editUser.businessType || ''} onChangeText={(v) => setEditUser((s) => ({ ...s, businessType: v }))} /> : null}
                {(ROLE_EXTRA_FIELDS[editUser.role] || []).includes('businessName') ? <Field label="Business Name" value={editUser.businessName || ''} onChangeText={(v) => setEditUser((s) => ({ ...s, businessName: v }))} /> : null}

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEditUser(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} disabled={editSaving} onPress={updateUser}><Text style={styles.saveText}>{editSaving ? 'Updating...' : 'Update'}</Text></Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FilterRow({ label, options, onPick, value, onClear }) {
  const normalized = options.map((item) => (typeof item === 'string' ? { label: item, value: item } : item));
  return (
    <View>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Pressable style={[styles.roleChip, !value ? styles.roleChipActive : null]} onPress={onClear}><Text style={[styles.roleChipText, !value ? styles.roleChipTextActive : null]}>All</Text></Pressable>
        {normalized.map((opt) => (
          <Pressable key={`${label}-${opt.value}`} style={[styles.roleChip, value === opt.value ? styles.roleChipActive : null]} onPress={() => onPick(opt.value)}>
            <Text style={[styles.roleChipText, value === opt.value ? styles.roleChipTextActive : null]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  totalCard: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 10 },
  totalLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  totalCount: { marginTop: 2, color: '#111827', fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  filters: { marginTop: 10, gap: 8 },
  filterLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 13,
  },
  roleChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  roleChipText: { color: '#52525b', fontSize: 12 },
  roleChipTextActive: { color: '#047857', fontWeight: '700' },
  exportRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  exportBtnPrimary: { flex: 1, borderWidth: 1, borderColor: '#0284c7', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#0284c7' },
  exportTextPrimary: { fontSize: 12, fontWeight: '700', color: '#fff' },
  exportBtnSecondary: { flex: 1, borderWidth: 1, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  exportTextSecondary: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 1420 },
  tableHeader: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 8 },
  headCell: { justifyContent: 'center' },
  headText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  sortableHead: { borderRadius: 8 },
  tableRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  stack: { gap: 8, marginTop: 8 },
  cell: { fontSize: 12, color: '#374151' },
  colData: { width: 120 },
  colAction: { width: 220 },
  actionCell: { width: 220, flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, borderRadius: 8, backgroundColor: '#e0f2fe', paddingVertical: 7, alignItems: 'center' },
  editBtnText: { color: '#075985', fontWeight: '700', fontSize: 12 },
  deleteBtn: { flex: 1, borderRadius: 8, backgroundColor: '#fee2e2', paddingVertical: 7, alignItems: 'center' },
  deleteBtnText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  help: { color: '#6b7280', fontSize: 13 },
  paginationWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, gap: 8 },
  pageText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  pageActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pageBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  formWrap: { gap: 8, paddingBottom: 8 },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
});
