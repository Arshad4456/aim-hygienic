import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import InvoiceRenderer, { FALLBACK_INVOICE_TEMPLATE } from './InvoiceRenderer';
import ReceiptRenderer, { FALLBACK_RECEIPT_TEMPLATE } from './ReceiptRenderer';

export default function DocumentPreviewScreen({ visible, onClose, documentType = 'invoice', documentId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [company, setCompany] = useState({});
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (!visible || !documentId) return;

    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [runtime, tplRes, docRes] = await Promise.all([
          apiClient.get('/runtime/dashboard').catch(() => ({ data: null })),
          apiClient.get(`/runtime/document-templates/default/${documentType}`).catch(() => ({ data: null })),
          apiClient.get(`/runtime/documents/${documentType}/${documentId}`),
        ]);

        if (!active) return;

        const resolvedTemplate = tplRes?.data?.template || (documentType === 'receipt' ? FALLBACK_RECEIPT_TEMPLATE : FALLBACK_INVOICE_TEMPLATE);
        setTemplate(resolvedTemplate);
        setDocumentData(docRes?.data?.document || null);
        setCompany(runtime?.data?.dashboard?.company || {});
        setSettings(runtime?.data?.dashboard?.settings || {});
      } catch (e) {
        if (active) {
          setError(e.message || 'Failed to load document preview');
          setTemplate(documentType === 'receipt' ? FALLBACK_RECEIPT_TEMPLATE : FALLBACK_INVOICE_TEMPLATE);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [visible, documentType, documentId]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.title}>{documentType === 'receipt' ? 'Receipt Preview' : 'Invoice Preview'}</Text>
          <Pressable onPress={onClose} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>

        {loading ? <Text style={styles.msg}>Loading preview...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && documentData ? (
          <ScrollView contentContainerStyle={styles.scroll}>
            {documentType === 'receipt' ? (
              <ReceiptRenderer documentData={documentData} templateConfig={template} company={company} settings={settings} />
            ) : (
              <InvoiceRenderer documentData={documentData} templateConfig={template} company={company} settings={settings} />
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e4e4e7', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', color: '#111827' },
  close: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 12, color: '#27272a' },
  msg: { padding: 16, color: '#52525b' },
  error: { padding: 16, color: '#b91c1c' },
  scroll: { padding: 12, backgroundColor: '#fff', margin: 10, borderRadius: 12 },
});
