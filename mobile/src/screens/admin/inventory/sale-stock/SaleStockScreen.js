import React from 'react';
import InventoryTransactionModule from '../components/InventoryTransactionModule';

export default function SaleStockScreen() {
  return <InventoryTransactionModule title="Sale Stock" subtitle="Create sale stock entries with product details and sale stock ledger." transactionType="SALE_STOCK" />;
}
