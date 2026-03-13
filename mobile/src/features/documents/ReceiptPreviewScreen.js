import React from 'react';
import DocumentPreviewScreen from './DocumentPreviewScreen';

export default function ReceiptPreviewScreen(props) {
  return <DocumentPreviewScreen {...props} documentType="receipt" />;
}