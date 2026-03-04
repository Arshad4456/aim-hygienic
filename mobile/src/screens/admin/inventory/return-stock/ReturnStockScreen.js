import React from 'react';
import InventoryTransactionModule from '../components/InventoryTransactionModule';

export default function ReturnStockScreen() {
  return <InventoryTransactionModule title="Return Stock" subtitle="Create return stock entries with product details and return ledger." transactionType="RETURN_STOCK" showDates />;
}
