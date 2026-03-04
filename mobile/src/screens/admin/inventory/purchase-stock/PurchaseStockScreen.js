import React from 'react';
import InventoryTransactionModule from '../components/InventoryTransactionModule';

export default function PurchaseStockScreen() {
  return <InventoryTransactionModule title="Purchasing Stock" subtitle="Create purchasing stock entries with product details and purchase ledger." transactionType="PURCHASING_STOCK" showDates />;
}
