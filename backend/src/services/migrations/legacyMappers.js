function asText(value) {
  return String(value || "").trim();
}

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function makePartySnapshot({ partyType, partyId, partyName, address, mobile }) {
  return {
    partyType: asText(partyType),
    partyId: asText(partyId),
    partyName: asText(partyName),
    address: asText(address),
    mobile: asText(mobile),
  };
}

function makeStatusHistory(status, changedBy = "legacy-migration", note = "Migrated from legacy") {
  return [{ status: asText(status), changedBy: asText(changedBy), note: asText(note), changedAt: new Date() }];
}

function mapSalesItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    lineNo: index + 1,
    productId: asText(item.productId),
    productCode: asText(item.productCode),
    productName: asText(item.productName),
    uom: "pack",
    qty: asNumber(item.quantity),
    unitPrice: asNumber(item.unitPrice),
    unitCost: asNumber(item.unitCost),
    discountValue: asNumber(item.discValue),
    taxPercent: asNumber(item.gstPer),
    taxValue: 0,
    netLineAmount: asNumber(item.toValue || item.quantity * item.unitPrice),
    bonusQty: asNumber(item.bonsValue),
  }));
}

function mapWarehouseItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    lineNo: index + 1,
    productId: asText(item.productId),
    productName: asText(item.productName),
    uom: asText(item.cartonSize) || "pack",
    qty: asNumber(item.totalPacks || item.packs || item.cartons),
    receivedQty: asNumber(item.totalPacks || item.packs || item.cartons),
    dispatchedQty: asNumber(item.totalPacks || item.packs || item.cartons),
    returnedQty: 0,
    unitPrice: asNumber(item.unitPrice || item.onePackPrice),
    unitCost: asNumber(item.unitCost || item.onePackPrice),
    netLineAmount: asNumber(item.totalPrice),
    batchNo: asText(item.batchNo),
    manufactureDate: asDate(item.manufactureDate),
    expiryDate: asDate(item.expiryDate),
    returnDate: asDate(item.returnDate),
    notes: asText(item.notes),
  }));
}

function mapLegacySalesOrder(legacy) {
  const common = {
    companyId: asText(legacy.companyId),
    companyName: asText(legacy.companyName),
    documentNo: asText(legacy.orderNo),
    lines: mapSalesItems(legacy.items),
    totals: {
      subtotal: asNumber(legacy.totalAmount),
      discountTotal: 0,
      taxTotal: 0,
      freightTotal: 0,
      otherChargesTotal: 0,
      grandTotal: asNumber(legacy.totalAmount),
    },
    notes: asText(legacy.notes),
  };

  if (asText(legacy.saleType).toLowerCase() === 'secondary') {
    return {
      target: 'SecondaryOrder',
      payload: {
        ...common,
        ownerId: asText(legacy.distributorId || legacy.createdBy || legacy.companyId),
        distributorId: asText(legacy.distributorId),
        sourceType: asText(legacy.sourceType).toLowerCase() === 'order_booker' ? 'order_booker' : (asText(legacy.sourceType).toLowerCase() === 'customer' ? 'customer' : 'salesman'),
        customer: makePartySnapshot({
          partyType: 'customer',
          partyId: legacy.customerId,
          partyName: legacy.customerName,
          address: legacy.address,
        }),
        orderBookerUserId: asText(legacy.orderBookerId),
        salesmanUserId: asText(legacy.salesmanId),
        territoryId: asText(legacy.territoryId || legacy.territoryName),
        fieldId: asText(legacy.fieldId),
        status: legacy.status === 'pending' ? 'submitted' : asText(legacy.status),
        financialStatus: legacy.invoiceNo ? 'unpaid' : 'not_invoiced',
        dispatchStatus: legacy.status === 'delivered' ? 'delivered' : (legacy.status === 'dispatched' ? 'dispatched' : 'not_dispatched'),
        podUrl: asText(legacy.podUrl || legacy.proofOfDeliveryImageUrl),
        podUploadedBy: asText(legacy.podUploadedBy || legacy.proofOfDeliveryBy),
        podUploadedAt: asDate(legacy.podUploadedAt || legacy.proofOfDeliveryAt),
        createdByUserId: asText(legacy.createdBy),
        approvedByUserId: asText(legacy.receiptAgreementBy),
        statusHistory: makeStatusHistory(legacy.status === 'pending' ? 'submitted' : legacy.status),
      },
    };
  }

  return {
    target: 'CompanySalesOrder',
    payload: {
      ...common,
      ownerId: asText(legacy.companyId),
      distributorId: asText(legacy.distributorId || legacy.customerId),
      distributor: makePartySnapshot({
        partyType: 'distributor',
        partyId: legacy.distributorId || legacy.customerId,
        partyName: legacy.customerName,
        address: legacy.address,
      }),
      dispatchFromWarehouse: makePartySnapshot({
        partyType: 'warehouse',
        partyId: legacy.toWarehouseId,
        partyName: legacy.toWarehouseName,
      }),
      receiveAtWarehouse: makePartySnapshot({
        partyType: 'warehouse',
        partyId: legacy.toWarehouseId,
        partyName: legacy.toWarehouseName,
      }),
      freightPayer: 'company',
      deliveryMode: legacy.dispatchVehicleId ? 'company_truck' : 'transporter',
      status: legacy.status === 'pending' ? 'draft' : (legacy.status === 'approved' ? 'approved' : legacy.status),
      financialStatus: legacy.invoiceNo ? 'unpaid' : 'not_invoiced',
      createdByUserId: asText(legacy.createdBy),
      approvedByUserId: asText(legacy.receiptAgreementBy),
      statusHistory: makeStatusHistory(legacy.status === 'pending' ? 'draft' : legacy.status),
    },
  };
}

function mapLegacyInventoryMovement(legacy) {
  const movementTypeMap = {
    PURCHASE_IN: { movementType: 'purchase_receipt', direction: 'in', ownerType: 'company' },
    TRANSFER_IN: { movementType: 'transfer_in', direction: 'in', ownerType: 'company' },
    TRANSFER_OUT: { movementType: 'transfer_out', direction: 'out', ownerType: 'company' },
    SALE_OUT: { movementType: 'secondary_dispatch', direction: 'out', ownerType: 'distributor' },
    RETURN_IN: { movementType: 'return_in', direction: 'in', ownerType: 'company' },
    ADJUSTMENT: { movementType: legacy.quantity >= 0 ? 'adjustment_in' : 'adjustment_out', direction: legacy.quantity >= 0 ? 'in' : 'out', ownerType: 'company' },
  };
  const mapped = movementTypeMap[asText(legacy.movementType)] || { movementType: 'adjustment_in', direction: 'in', ownerType: 'company' };
  return {
    companyId: asText(legacy.companyId),
    ownerType: mapped.ownerType,
    ownerId: mapped.ownerType === 'company' ? asText(legacy.companyId) : asText(legacy.distributorId || legacy.companyId),
    distributorId: asText(legacy.distributorId),
    warehouseId: asText(legacy.warehouseId),
    warehouseName: asText(legacy.warehouseName),
    productId: asText(legacy.productId),
    productCode: asText(legacy.productCode),
    productName: asText(legacy.productName),
    batchNo: asText(legacy.batchNo),
    movementType: mapped.movementType,
    direction: mapped.direction,
    qty: Math.abs(asNumber(legacy.quantity)),
    unitCost: asNumber(legacy.unitCost),
    totalValue: Math.abs(asNumber(legacy.quantity)) * asNumber(legacy.unitCost),
    referenceType: 'legacy_inventory_movement',
    referenceId: legacy._id,
    referenceNo: asText(legacy.referenceId),
    postedAt: asDate(legacy.createdAt) || new Date(),
    postedByUserId: asText(legacy.createdBy),
  };
}

function mapLegacyWarehouseTransaction(legacy) {
  const txType = asText(legacy.transactionType);
  const common = {
    companyId: asText(legacy.companyId),
    documentNo: asText(legacy.transactionCode),
    notes: asText(legacy.note),
    createdByUserId: asText(legacy.createdBy),
    statusHistory: makeStatusHistory(txType === 'MOVEMENT' ? 'posted' : 'approved'),
  };

  if (txType === 'PURCHASING_STOCK' || txType === 'STOCK_IN') {
    return {
      target: 'GoodsReceipt',
      payload: {
        ...common,
        companyName: asText(legacy.companyName),
        ownerId: asText(legacy.companyId),
        supplier: makePartySnapshot({ partyType: 'supplier', partyId: legacy.supplierId, partyName: legacy.supplierName }),
        receivedAtWarehouse: makePartySnapshot({ partyType: 'warehouse', partyId: legacy.warehouseId, partyName: legacy.warehouseName }),
        transporter: makePartySnapshot({ partyType: 'transporter', partyName: legacy.fromEntityName }),
        podUrl: asText(legacy.podUrl || legacy.proofOfDeliveryImageUrl),
        status: 'posted',
        receivedAt: asDate(legacy.transactionAt),
        lines: mapWarehouseItems(legacy.items),
        totals: {
          subtotal: asNumber(legacy.subtotal),
          discountTotal: asNumber(legacy.adjustment),
          taxTotal: 0,
          freightTotal: asNumber(legacy.expense),
          otherChargesTotal: 0,
          grandTotal: asNumber(legacy.grandTotal),
        },
        ledgerPosting: { postingState: 'posted', postingKey: `legacy_warehouse_transaction:${legacy._id}`, postedAt: asDate(legacy.transactionAt) || new Date() },
      },
    };
  }

  if (txType === 'SALE_STOCK' || txType === 'PURCHASING_OUT' || txType === 'STOCK_OUT') {
    return {
      target: 'CompanyDispatchNote',
      payload: {
        ...common,
        ownerId: asText(legacy.companyId),
        companySalesOrderId: null,
        distributorId: asText(legacy.distributorId),
        dispatchFromWarehouse: makePartySnapshot({ partyType: 'warehouse', partyId: legacy.dispatchFromWarehouseId || legacy.warehouseId, partyName: legacy.dispatchFromWarehouseName || legacy.warehouseName }),
        transporter: makePartySnapshot({ partyType: 'transporter', partyName: legacy.toEntityName || legacy.fromEntityName }),
        podUrl: asText(legacy.podUrl || legacy.proofOfDeliveryImageUrl),
        status: legacy.requestStatus === 'DELIVERED' ? 'delivered' : 'posted',
        dispatchedAt: asDate(legacy.transactionAt),
        lines: mapWarehouseItems(legacy.items),
        ledgerPosting: { postingState: 'unposted', postingKey: '', postedAt: null },
      },
    };
  }

  if (txType === 'RETURN_STOCK' || txType === 'RETURN_TO_SD') {
    return {
      target: 'ReturnDocument',
      payload: {
        ...common,
        ownerType: legacy.distributorId ? 'distributor' : 'company',
        ownerId: asText(legacy.distributorId || legacy.companyId),
        distributorId: asText(legacy.distributorId),
        returnType: legacy.distributorId ? 'distributor_return_to_company' : 'purchase_return',
        sourceDocumentType: 'legacy_warehouse_transaction',
        sourceDocumentId: legacy._id,
        fromParty: makePartySnapshot({ partyType: legacy.distributorId ? 'distributor' : 'supplier', partyId: legacy.distributorId || legacy.supplierId, partyName: legacy.distributorName || legacy.supplierName }),
        toParty: makePartySnapshot({ partyType: 'warehouse', partyId: legacy.warehouseId, partyName: legacy.warehouseName }),
        warehouseId: asText(legacy.warehouseId),
        warehouseName: asText(legacy.warehouseName),
        status: 'posted',
        reasonCode: txType,
        lines: mapWarehouseItems(legacy.items),
        totals: {
          subtotal: asNumber(legacy.subtotal),
          discountTotal: asNumber(legacy.adjustment),
          taxTotal: 0,
          freightTotal: asNumber(legacy.expense),
          otherChargesTotal: 0,
          grandTotal: asNumber(legacy.grandTotal),
        },
        ledgerPosting: { postingState: 'unposted', postingKey: '', postedAt: null },
      },
    };
  }

  return {
    target: null,
    payload: null,
    skipReason: `No direct document target for transactionType=${txType}`,
  };
}

function mapLegacyReceipt(legacy, linkedOrder = null) {
  const isSecondary = linkedOrder && asText(linkedOrder.saleType).toLowerCase() === 'secondary';

  if (isSecondary) {
    return {
      target: 'CustomerReceipt',
      payload: {
        companyId: asText(linkedOrder.companyId || legacy.companyId),
        documentNo: asText(legacy.receiptNo),
        ownerId: asText(linkedOrder.distributorId),
        distributorId: asText(linkedOrder.distributorId),
        customer: makePartySnapshot({
          partyType: 'customer',
          partyId: asText(legacy.payerUserId || linkedOrder.customerId),
          partyName: asText(legacy.payerName || linkedOrder.customerName),
        }),
        paymentDate: asDate(legacy.paymentDate) || new Date(),
        amount: asNumber(legacy.amount),
        paymentMethod: asText(legacy.paymentMethod),
        toAccountId: asText(legacy.paidToAccountId),
        status: legacy.status === 'approved' ? 'posted' : legacy.status,
        allocations: legacy.linkedInvoiceNo ? [{ invoiceId: null, invoiceNo: asText(legacy.linkedInvoiceNo), allocatedAmount: asNumber(legacy.amount) }] : [],
        attachmentUrl: asText(legacy.attachmentUrl),
        referenceNo: asText(legacy.referenceNo),
        createdByUserId: asText(legacy.createdByUserId),
        approvedByUserId: asText(legacy.approvedBy),
        notes: asText(legacy.notes),
        statusHistory: makeStatusHistory(legacy.status === 'approved' ? 'posted' : legacy.status),
      },
    };
  }

  return {
    target: 'CompanyReceiptFromDistributor',
    payload: {
      companyId: asText(linkedOrder?.companyId || legacy.companyId),
      documentNo: asText(legacy.receiptNo),
      ownerId: asText(linkedOrder?.companyId || legacy.companyId),
      distributorId: asText(linkedOrder?.distributorId || legacy.payerUserId),
      payer: makePartySnapshot({ partyType: 'distributor', partyId: linkedOrder?.distributorId || legacy.payerUserId, partyName: legacy.payerName }),
      paymentDate: asDate(legacy.paymentDate) || new Date(),
      amount: asNumber(legacy.amount),
      paymentMethod: asText(legacy.paymentMethod),
      toAccountId: asText(legacy.paidToAccountId),
      status: legacy.status === 'approved' ? 'posted' : legacy.status,
      allocations: legacy.linkedInvoiceNo ? [{ invoiceId: null, invoiceNo: asText(legacy.linkedInvoiceNo), allocatedAmount: asNumber(legacy.amount) }] : [],
      attachmentUrl: asText(legacy.attachmentUrl),
      referenceNo: asText(legacy.referenceNo),
      createdByUserId: asText(legacy.createdByUserId),
      approvedByUserId: asText(legacy.approvedBy),
      notes: asText(legacy.notes),
      statusHistory: makeStatusHistory(legacy.status === 'approved' ? 'posted' : legacy.status),
    },
  };
}

function mapLegacyPrimaryPayment(legacy) {
  return {
    target: 'CompanyInvoiceToDistributor',
    payload: {
      companyId: asText(legacy.companyId),
      documentNo: asText(legacy.invoiceNo),
      ownerId: asText(legacy.companyId),
      distributorId: asText(legacy.distributorId),
      distributor: makePartySnapshot({
        partyType: 'distributor',
        partyId: legacy.distributorId,
        partyName: legacy.distributorName,
        address: legacy.distributorAddress,
      }),
      invoiceDate: asDate(legacy.payDate) || new Date(),
      dueDate: asDate(legacy.returnDate),
      status: 'posted',
      paymentStatus: asNumber(legacy.amountRemaining) <= 0 ? 'paid' : (asNumber(legacy.amountPaidBack) > 0 ? 'partial' : 'unpaid'),
      invoiceTotal: asNumber(legacy.amountTotal),
      allocatedReceiptTotal: asNumber(legacy.amountPaidBack),
      balanceAmount: Math.max(asNumber(legacy.amountRemaining), 0),
      lines: [],
      totals: {
        subtotal: asNumber(legacy.amountTotal),
        discountTotal: 0,
        taxTotal: 0,
        freightTotal: 0,
        otherChargesTotal: 0,
        grandTotal: asNumber(legacy.amountTotal),
      },
      ledgerPosting: { postingState: 'posted', postingKey: `legacy_primary_payment:${legacy._id}`, postedAt: asDate(legacy.payDate) || new Date() },
      createdByUserId: asText(legacy.createdBy),
      notes: asText(legacy.details),
      statusHistory: makeStatusHistory('posted'),
    },
  };
}

function mapLegacySecondaryPayment(legacy) {
  return {
    target: 'CompanyReceiptFromDistributor',
    payload: {
      companyId: asText(legacy.companyId),
      documentNo: `SPAY-${asText(legacy.primaryInvoiceNo)}-${String(legacy._id).slice(-6)}`,
      ownerId: asText(legacy.companyId),
      distributorId: asText(legacy.distributorId),
      payer: makePartySnapshot({
        partyType: 'distributor',
        partyId: legacy.distributorId,
        partyName: legacy.distributorName,
        address: legacy.distributorAddress,
      }),
      paymentDate: asDate(legacy.paidDate) || new Date(),
      amount: asNumber(legacy.amountPaid),
      paymentMethod: 'cash',
      toAccountId: asText(legacy.warehouseId),
      status: 'posted',
      allocations: [{ invoiceId: null, invoiceNo: asText(legacy.primaryInvoiceNo), allocatedAmount: asNumber(legacy.amountPaid) }],
      attachmentUrl: '',
      referenceNo: asText(legacy.primaryPaymentId),
      createdByUserId: asText(legacy.createdBy),
      notes: asText(legacy.details),
      statusHistory: makeStatusHistory('posted'),
    },
  };
}

module.exports = {
  asText,
  asNumber,
  asDate,
  mapLegacySalesOrder,
  mapLegacyInventoryMovement,
  mapLegacyWarehouseTransaction,
  mapLegacyReceipt,
  mapLegacyPrimaryPayment,
  mapLegacySecondaryPayment,
};
