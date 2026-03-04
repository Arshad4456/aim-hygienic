import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const CARDS = [
  { key: 'PURCHASING_STOCK', title: '1 Purchasing Stock' },
  { key: 'SALE_STOCK', title: '2 Sale Stock' },
  { key: 'DAMAGE_STOCK', title: '3 Damage Stock' },
  { key: 'RETURN_STOCK', title: '4 Return Stock' },
  { key: 'W2W_TRANSFER', title: '5 Warehouse to Warehouse Transfer' },
  { key: 'STOCK_SUMMARY', title: '6 Stock Summary' },
  { key: 'LOW_STOCK', title: '7 Low Stock Alert' },
  { key: 'INVENTORY_LEDGER', title: '8 Inventory Ledger' },
  { key: 'WAREHOUSE_MASTER', title: '9 Warehouse Master' },
];

const TXN_EMPTY = {
  warehouseId: '',
  fromEntityName: '',
  toEntityName: '',
  note: '',
  productId: '',
  quantity: '',
  toValue: '0',
  discValue: '0',
  extraValue: '0',
  bonsValue: '0',
  gstPer: '0',
  manufactureDate: '',
  expiryDate: '',
};
const TRANSFER_EMPTY = { productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' };

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const computeLine = (line, product) => {
  const qty = num(line.quantity);
  const rate = num(product?.wholesalePrice || 0);
  const gross = qty * rate;
  const toValue = num(line.toValue);
  const discValue = num(line.discValue);
  const extraValue = num(line.extraValue);
  const bonsValue = num(line.bonsValue);
  const v4gst = gross - toValue - discValue - extraValue - bonsValue;
  const gstPer = num(line.gstPer);
  const gstAmt = (v4gst * gstPer) / 100;
  const net = v4gst + gstAmt;
  return { qty, rate, gross, toValue, discValue, extraValue, bonsValue, v4gst, gstPer, gstAmt, net };
};

export default function WarehouseInventoryScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState('PURCHASING_STOCK');
  const [err, setErr] = useState('');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);

  const [txnForm, setTxnForm] = useState(TXN_EMPTY);
  const [transferForm, setTransferForm] = useState(TRANSFER_EMPTY);
  const [saving, setSaving] = useState(false);
  const [transferEdit, setTransferEdit] = useState(null);
  const [summaryEdits, setSummaryEdits] = useState({});
  const [summaryDetailModal, setSummaryDetailModal] = useState(null);
  const [summaryDetailRows, setSummaryDetailRows] = useState([]);
  const [summaryDetailLoading, setSummaryDetailLoading] = useState(false);

  const loadAll = async () => {
    setErr('');
    setLoading(true);
    try {
      const [productsRes, warehousesRes, txRes, transferRes, summaryRes, lowRes, moveRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/warehouses'),
        apiClient.get('/inventory/transactions'),
        apiClient.get('/inventory/transfers'),
        apiClient.get('/inventory/summary'),
        apiClient.get('/inventory/low-stock'),
        apiClient.get('/inventory/movements'),
      ]);
      setProducts(productsRes.data?.products || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setTransactions(txRes.data?.transactions || []);
      setTransfers(transferRes.data?.transfers || []);
      setSummary(summaryRes.data?.summary || []);
      setLowStock(lowRes.data?.lowStock || []);
      setMovements(moveRes.data?.movements || []);
    } catch (e) {
      setErr(e.message || 'Failed to load warehouse inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const txRows = useMemo(() => transactions.filter((t) => t.transactionType === selectedCard), [transactions, selectedCard]);
  const selectedProduct = useMemo(() => products.find((p) => p.productId === txnForm.productId), [products, txnForm.productId]);
  const line = useMemo(() => computeLine(txnForm, selectedProduct), [txnForm, selectedProduct]);

  const submitTransaction = async () => {
    setSaving(true);
    setErr('');
    try {
      const warehouse = warehouses.find((w) => w.warehouseId === txnForm.warehouseId);
      const product = products.find((p) => p.productId === txnForm.productId);
      if (!warehouse || !product) throw new Error('Please select warehouse and product.');
      await apiClient.post('/inventory/transactions', {
        transactionType: selectedCard,
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.name,
        fromEntityName: txnForm.fromEntityName || warehouse.name,
        toEntityName: txnForm.toEntityName || selectedCard.replaceAll('_', ' '),
        note: txnForm.note,
        items: [{
          productId: product.productId,
          productName: product.name,
          size: product.size || '-',
          totalPacks: line.qty,
          quantity: line.qty,
          unitPrice: line.rate,
          gross: line.gross,
          toValue: line.toValue,
          discValue: line.discValue,
          extraValue: line.extraValue,
          bonsValue: line.bonsValue,
          v4gst: line.v4gst,
          gstPer: line.gstPer,
          gstAmt: line.gstAmt,
          totalPrice: line.net,
          netAmount: line.net,
          manufactureDate: txnForm.manufactureDate || undefined,
          expiryDate: txnForm.expiryDate || undefined,
        }],
      });
      setTxnForm(TXN_EMPTY);
      await loadAll();
    } catch (e) {
      setErr(e.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = (id) => {
    Alert.alert('Delete Record', 'Delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/inventory/transactions/${id}`);
            await loadAll();
          } catch (e) {
            setErr(e.message || 'Failed to delete record');
          }
        },
      },
    ]);
  };

  const printInvoice = async (row) => {
    await Share.share({
      title: 'Invoice/Receipt',
      message: `Invoice/Receipt\nType: ${row.transactionType}\nID: ${row._id}\nDate: ${row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}\nNote: ${row.note || '-'}`,
    });
  };

  const createTransfer = async () => {
    setSaving(true);
    setErr('');
    try {
      await apiClient.post('/inventory/transfers', { ...transferForm, quantity: num(transferForm.quantity) });
      setTransferForm(TRANSFER_EMPTY);
      await loadAll();
    } catch (e) {
      setErr(e.message || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const saveTransfer = async () => {
    if (!transferEdit) return;
    setSaving(true);
    try {
      await apiClient.put(`/inventory/transfers/${transferEdit._id}`, { ...transferEdit, quantity: num(transferEdit.quantity) });
      setTransferEdit(null);
      await loadAll();
    } catch (e) {
      setErr(e.message || 'Failed to update transfer');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransfer = (id) => {
    Alert.alert('Delete Transfer', 'Delete this transfer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/inventory/transfers/${id}`);
            await loadAll();
          } catch (e) {
            setErr(e.message || 'Failed to delete transfer');
          }
        },
      },
    ]);
  };

  const transferReceipt = async (row) => {
    await Share.share({ title: 'Transfer Receipt', message: `Transfer Receipt\nID: ${row._id}\nProduct: ${row.productName || row.productId}\nFrom: ${row.fromWarehouseName || row.fromWarehouseId}\nTo: ${row.toWarehouseName || row.toWarehouseId}\nQty: ${row.quantity}\nStatus: ${row.status}` });
  };

  const updateMinStock = async (productDbId, value) => {
    const product = products.find((p) => p._id === productDbId);
    if (!product) return;
    try {
      await apiClient.put(`/products/${productDbId}`, { ...product, minStockLevel: num(value) });
      await loadAll();
    } catch (e) {
      setErr(e.message || 'Failed to update minimum stock');
    }
  };

  const openSummaryDetail = async (row) => {
    setSummaryDetailModal(row);
    setSummaryDetailRows([]);
    setSummaryDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/inventory/summary-detail?productId=${encodeURIComponent(row._id.productId)}&warehouseId=${encodeURIComponent(row._id.warehouseId)}`);
      setSummaryDetailRows(data?.rows || []);
    } catch (e) {
      setErr(e.message || 'Failed to load stock details');
    } finally {
      setSummaryDetailLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Warehouse & Inventory</Text>
        <Text style={styles.subtitle}>Module Overview</Text>
        <View style={styles.cardGrid}>
          {CARDS.map((c) => (
            <Pressable key={c.key} style={[styles.cardBtn, selectedCard === c.key ? styles.cardBtnActive : null]} onPress={() => setSelectedCard(c.key)}>
              <Text style={[styles.cardBtnText, selectedCard === c.key ? styles.cardBtnTextActive : null]}>{c.title}</Text>
            </Pressable>
          ))}
        </View>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      {['PURCHASING_STOCK', 'SALE_STOCK', 'DAMAGE_STOCK', 'RETURN_STOCK'].includes(selectedCard) ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>{selectedCard.replaceAll('_', ' ')}</Text>
            <Text style={styles.label}>Warehouse</Text>
            <PillRow options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))} value={txnForm.warehouseId} onPick={(v) => setTxnForm((s) => ({ ...s, warehouseId: v }))} />
            <Text style={styles.label}>Product</Text>
            <PillRow options={products.map((p) => ({ value: p.productId, label: `${p.productId} - ${p.name}` }))} value={txnForm.productId} onPick={(v) => setTxnForm((s) => ({ ...s, productId: v }))} />
            <Text style={styles.label}>From Entity Name</Text><TextInput style={styles.input} value={txnForm.fromEntityName} onChangeText={(v) => setTxnForm((s) => ({ ...s, fromEntityName: v }))} />
            <Text style={styles.label}>To Entity Name</Text><TextInput style={styles.input} value={txnForm.toEntityName} onChangeText={(v) => setTxnForm((s) => ({ ...s, toEntityName: v }))} />
            <Text style={styles.label}>Quantity</Text><TextInput style={styles.input} keyboardType="numeric" value={txnForm.quantity} onChangeText={(v) => setTxnForm((s) => ({ ...s, quantity: v }))} />
            <Text style={styles.label}>TO Value</Text><TextInput style={styles.input} keyboardType="numeric" value={txnForm.toValue} onChangeText={(v) => setTxnForm((s) => ({ ...s, toValue: v }))} />
            <Text style={styles.label}>Disc Value</Text><TextInput style={styles.input} keyboardType="numeric" value={txnForm.discValue} onChangeText={(v) => setTxnForm((s) => ({ ...s, discValue: v }))} />
            <Text style={styles.label}>Extra Value</Text><TextInput style={styles.input} keyboardType="numeric" value={txnForm.extraValue} onChangeText={(v) => setTxnForm((s) => ({ ...s, extraValue: v }))} />
            <Text style={styles.label}>Bons Value</Text><TextInput style={styles.input} keyboardType="numeric" value={txnForm.bonsValue} onChangeText={(v) => setTxnForm((s) => ({ ...s, bonsValue: v }))} />
            <Text style={styles.label}>GST %</Text><TextInput style={styles.input} keyboardType="numeric" value={txnForm.gstPer} onChangeText={(v) => setTxnForm((s) => ({ ...s, gstPer: v }))} />
            {['PURCHASING_STOCK', 'DAMAGE_STOCK', 'RETURN_STOCK'].includes(selectedCard) ? (
              <>
                <Text style={styles.label}>Manufacture Date</Text><TextInput style={styles.input} value={txnForm.manufactureDate} onChangeText={(v) => setTxnForm((s) => ({ ...s, manufactureDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#71717a" />
                <Text style={styles.label}>Expiry Date</Text><TextInput style={styles.input} value={txnForm.expiryDate} onChangeText={(v) => setTxnForm((s) => ({ ...s, expiryDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#71717a" />
              </>
            ) : null}
            <Text style={styles.label}>Note</Text><TextInput style={styles.input} value={txnForm.note} onChangeText={(v) => setTxnForm((s) => ({ ...s, note: v }))} />

            <Text style={styles.productDetailTitle}>Product Detail</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.productTableWrap}>
                <View style={styles.headerRow}>
                  {['Product', 'Size', 'Qty', 'Rate', 'Gross', 'TO', 'Disc', 'Extra', 'Bons', 'V4GST', 'GST %', 'GST Amt', 'Net Amt'].map((h) => <Text key={h} style={[styles.headCell, styles.colMini]}>{h}</Text>)}
                </View>
                <View style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colMini]}>{selectedProduct?.name || '-'}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{selectedProduct?.size || '-'}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.qty}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.rate}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.gross.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.toValue.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.discValue.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.extraValue.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.bonsValue.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.v4gst.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.gstPer.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.gstAmt.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colMini]}>{line.net.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>

            <Pressable style={styles.primaryBtn} onPress={submitTransaction} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save Entry'}</Text></Pressable>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Ledger</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrapWide}>
                <View style={styles.headerRow}>
                  {['Date', 'Product', 'Warehouse', 'Qty', 'TO', 'Disc', 'Extra', 'Bons', 'V4GST', 'GST Amt', 'Net', 'MFG', 'EXP', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colAction : styles.colData]}>{h}</Text>)}
                </View>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {txRows.length === 0 ? <Text style={styles.help}>No records found.</Text> : txRows.map((r) => {
                    const i = r.items?.[0] || {};
                    return (
                      <View key={r._id} style={styles.dataRow}>
                        <Text style={[styles.cell, styles.colData]}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</Text>
                        <Text style={[styles.cell, styles.colData]}>{i.productName || '-'}</Text>
                        <Text style={[styles.cell, styles.colData]}>{r.warehouseName || '-'}</Text>
                        <Text style={[styles.cell, styles.colData]}>{i.totalPacks ?? i.quantity ?? 0}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.toValue).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.discValue).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.extraValue).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.bonsValue).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.v4gst).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.gstAmt).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{num(i.netAmount || i.totalPrice).toFixed(2)}</Text>
                        <Text style={[styles.cell, styles.colData]}>{i.manufactureDate || '-'}</Text>
                        <Text style={[styles.cell, styles.colData]}>{i.expiryDate || '-'}</Text>
                        <View style={styles.actionCell}>
                          <Pressable style={styles.lightBtn} onPress={() => printInvoice(r)}><Text style={styles.lightText}>Invoice/Receipt</Text></Pressable>
                          <Pressable style={styles.deleteBtn} onPress={() => deleteTransaction(r._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </Card>
        </>
      ) : null}

      {selectedCard === 'W2W_TRANSFER' ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Warehouse to Warehouse Transfer</Text>
            <Text style={styles.label}>Product</Text><PillRow options={products.map((p) => ({ value: p.productId, label: `${p.productId} - ${p.name}` }))} value={transferForm.productId} onPick={(v) => setTransferForm((s) => ({ ...s, productId: v }))} />
            <Text style={styles.label}>From</Text><PillRow options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))} value={transferForm.fromWarehouseId} onPick={(v) => setTransferForm((s) => ({ ...s, fromWarehouseId: v }))} />
            <Text style={styles.label}>To</Text><PillRow options={warehouses.filter((w) => w.warehouseId !== transferForm.fromWarehouseId).map((w) => ({ value: w.warehouseId, label: w.name }))} value={transferForm.toWarehouseId} onPick={(v) => setTransferForm((s) => ({ ...s, toWarehouseId: v }))} />
            <Text style={styles.label}>Quantity</Text><TextInput style={styles.input} keyboardType="numeric" value={transferForm.quantity} onChangeText={(v) => setTransferForm((s) => ({ ...s, quantity: v }))} />
            <Text style={styles.label}>Note</Text><TextInput style={styles.input} value={transferForm.note} onChangeText={(v) => setTransferForm((s) => ({ ...s, note: v }))} />
            <Pressable style={styles.primaryBtn} onPress={createTransfer} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Create Transfer'}</Text></Pressable>
          </Card>

          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrapWide}>
                <View style={styles.headerRow}>
                  {['Product', 'From', 'To', 'Qty', 'Date and Time', 'Status', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colAction : styles.colData]}>{h}</Text>)}
                </View>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {transfers.length === 0 ? <Text style={styles.help}>No transfers yet.</Text> : transfers.map((r) => (
                    <View key={r._id} style={styles.dataRow}>
                      <Text style={[styles.cell, styles.colData]}>{r.productName || r.productId || '-'}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.fromWarehouseName || r.fromWarehouseId || '-'}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.toWarehouseName || r.toWarehouseId || '-'}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.quantity ?? 0}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.status || '-'}</Text>
                      <View style={styles.actionCell}>
                        <Pressable style={styles.lightBtn} onPress={() => transferReceipt(r)}><Text style={styles.lightText}>Receipt</Text></Pressable>
                        <Pressable style={styles.editBtn} onPress={() => setTransferEdit({ ...r })}><Text style={styles.editText}>Edit</Text></Pressable>
                        <Pressable style={styles.deleteBtn} onPress={() => deleteTransfer(r._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Card>
        </>
      ) : null}

      {selectedCard === 'STOCK_SUMMARY' ? (
        <Card>
          <Text style={styles.sectionTitle}>Stock Summary</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.tableWrapWide}>
              <View style={styles.headerRow}>
                {['Product', 'Warehouse', 'Quantity', 'Minimum Stock Level', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colAction : styles.colData]}>{h}</Text>)}
              </View>
              <View style={{ marginTop: 8, gap: 8 }}>
                {summary.length === 0 ? <Text style={styles.help}>No summary data.</Text> : summary.map((r) => {
                  const p = products.find((x) => x.productId === r?._id?.productId);
                  return (
                    <View key={`${r?._id?.productId}-${r?._id?.warehouseId}`} style={styles.dataRow}>
                      <Text style={[styles.cell, styles.colData]}>{r.productName || '-'}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.warehouseName || '-'}</Text>
                      <Text style={[styles.cell, styles.colData]}>{r.quantity ?? 0}</Text>
                      <TextInput style={[styles.inputInline, styles.colData]} value={String(summaryEdits[p?._id] ?? p?.minStockLevel ?? 0)} onChangeText={(v) => setSummaryEdits((s) => ({ ...s, [p?._id]: v }))} />
                      <View style={styles.actionCell}>
                        <Pressable style={styles.editBtn} onPress={() => p && updateMinStock(p._id, summaryEdits[p._id] ?? p.minStockLevel)}><Text style={styles.editText}>Update</Text></Pressable>
                        <Pressable style={styles.lightBtn} onPress={() => openSummaryDetail(r)}><Text style={styles.lightText}>Detail</Text></Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Card>
      ) : null}

      {selectedCard === 'LOW_STOCK' ? <Card><Text style={styles.sectionTitle}>Low Stock Alert</Text><Text style={styles.help}>{lowStock.length} products are at or below minimum stock.</Text></Card> : null}
      {selectedCard === 'INVENTORY_LEDGER' ? <Card><Text style={styles.sectionTitle}>Inventory Ledger</Text><Text style={styles.help}>Movement rows: {movements.length}</Text></Card> : null}
      {selectedCard === 'WAREHOUSE_MASTER' ? <Card><Text style={styles.sectionTitle}>Warehouse Master</Text><Text style={styles.help}>Total Warehouses: {warehouses.length}</Text></Card> : null}

      <Modal visible={Boolean(transferEdit)} transparent animationType="slide" onRequestClose={() => setTransferEdit(null)}>
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Transfer</Text>
          {transferEdit ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Status</Text><PillRow options={[{ value: 'pending', label: 'pending' }, { value: 'approved', label: 'approved' }, { value: 'transit-in', label: 'transit-in' }, { value: 'completed', label: 'completed' }]} value={transferEdit.status} onPick={(v) => setTransferEdit((s) => ({ ...s, status: v }))} />
              <Text style={styles.label}>Quantity</Text><TextInput style={styles.input} keyboardType="numeric" value={String(transferEdit.quantity ?? '')} onChangeText={(v) => setTransferEdit((s) => ({ ...s, quantity: v }))} />
              <Text style={styles.label}>Note</Text><TextInput style={styles.input} value={transferEdit.note || ''} onChangeText={(v) => setTransferEdit((s) => ({ ...s, note: v }))} />
              <View style={styles.modalActions}><Pressable style={styles.cancelBtn} onPress={() => setTransferEdit(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable style={styles.saveBtn} onPress={saveTransfer}><Text style={styles.saveText}>Update</Text></Pressable></View>
            </View>
          ) : null}
        </View></View>
      </Modal>

      <Modal visible={Boolean(summaryDetailModal)} transparent animationType="slide" onRequestClose={() => setSummaryDetailModal(null)}>
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Stock Detail</Text>
          {summaryDetailLoading ? <Text style={styles.help}>Loading...</Text> : (
            <ScrollView style={{ maxHeight: 360 }}>
              {summaryDetailRows.length === 0 ? <Text style={styles.help}>No batch details.</Text> : summaryDetailRows.map((r, idx) => (
                <View key={idx} style={styles.detailRow}><Text style={styles.detailText}>Batch Qty: {r.quantity ?? 0}</Text><Text style={styles.detailText}>MFG: {r.manufactureDate || '-'}</Text><Text style={styles.detailText}>EXP: {r.expiryDate || '-'}</Text></View>
              ))}
            </ScrollView>
          )}
          <Pressable style={styles.cancelBtn} onPress={() => setSummaryDetailModal(null)}><Text style={styles.cancelText}>Close</Text></Pressable>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function PillRow({ options, value, onPick }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => (
        <Pressable key={`${o.value}`} style={[styles.chip, value === o.value ? styles.chipActive : null]} onPress={() => onPick(o.value)}>
          <Text style={[styles.chipText, value === o.value ? styles.chipTextActive : null]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 15, color: '#374151', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  productDetailTitle: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#111827' },
  help: { marginTop: 8, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  cardGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  cardBtnActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  cardBtnText: { fontSize: 12, color: '#111827' },
  cardBtnTextActive: { color: '#047857', fontWeight: '700' },
  label: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#374151' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  inputInline: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff', color: '#111827' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { color: '#52525b', fontSize: 12 },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  primaryBtn: { marginTop: 10, backgroundColor: '#059669', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tableWrapWide: { minWidth: 1500 },
  productTableWrap: { minWidth: 1560, marginTop: 6 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 150 },
  colMini: { width: 120 },
  colAction: { width: 240 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center', marginTop: 8 },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { width: 240, flexDirection: 'row', gap: 6 },
  lightBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', paddingVertical: 7, alignItems: 'center' },
  lightText: { color: '#1d4ed8', fontWeight: '700', fontSize: 11 },
  editBtn: { flex: 1, borderRadius: 8, backgroundColor: '#e0f2fe', paddingVertical: 7, alignItems: 'center' },
  editText: { color: '#075985', fontWeight: '700', fontSize: 11 },
  deleteBtn: { flex: 1, borderRadius: 8, backgroundColor: '#fee2e2', paddingVertical: 7, alignItems: 'center' },
  deleteText: { color: '#b91c1c', fontWeight: '700', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { marginTop: 10, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  detailRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginTop: 8, backgroundColor: '#fff' },
  detailText: { fontSize: 12, color: '#374151' },
});
