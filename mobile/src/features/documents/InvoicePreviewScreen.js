import React from 'react';
import DocumentPreviewScreen from './DocumentPreviewScreen';

export default function InvoicePreviewScreen(props) {
  return <DocumentPreviewScreen {...props} documentType="invoice" />;
}