import React from 'react';
import InventoryTransactionModule from '../components/InventoryTransactionModule';

export default function DamageStockScreen() {
  return <InventoryTransactionModule title="Damage Stock" subtitle="Create damage stock entries with product details and damage ledger." transactionType="DAMAGE_STOCK" />;
}
