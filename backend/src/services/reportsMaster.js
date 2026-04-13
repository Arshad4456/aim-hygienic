const { getScopedModels, asText, normalizeRole } = require('./scopedModels');
const InventoryLedger = require('../models/InventoryLedger');
const CompanySalesOrder = require('../models/CompanySalesOrder');
const SecondaryOrder = require('../models/SecondaryOrder');
const CompanyDispatchNote = require('../models/CompanyDispatchNote');
const DistributorStockReceipt = require('../models/DistributorStockReceipt');
const CustomerInvoice = require('../models/CustomerInvoice');
const CustomerReceipt = require('../models/CustomerReceipt');
const SupplierInvoice = require('../models/SupplierInvoice');
const SupplierPayment = require('../models/SupplierPayment');
const CompanyInvoiceToDistributor = require('../models/CompanyInvoiceToDistributor');
const CompanyReceiptFromDistributor = require('../models/CompanyReceiptFromDistributor');
const GoodsReceipt = require('../models/GoodsReceipt');
const ReturnDocument = require('../models/ReturnDocument');
const Expense = require('../models/Expense');
const Account = require('../models/Account');
const User = require('../models/User');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Vehicle = require('../models/Vehicle');
const Message = require('../models/Message');

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sumLineQty(lines = []) {
  return (Array.isArray(lines) ? lines : []).reduce(
    (sum, line) => sum + safeNumber(line?.qty || line?.dispatchedQty || line?.receivedQty || line?.deliveredQty),
    0,
  );
}

function sumField(rows = [], selector) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => sum + safeNumber(selector(row)), 0);
}


function uniq(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}
function titleCase(value) {
  return asText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '—';
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString('en-PK');
}

function formatCurrency(value, currency = 'PKR') {
  return `${currency} ${formatNumber(value)}`;
}

function formatPercent(value) {
  return `${safeNumber(value).toFixed(1)}%`;
}

function getRangeLabel(period) {
  switch (period) {
    case 'day': return 'Today';
    case 'week': return 'This week';
    case 'quarter': return 'This quarter';
    case 'year': return 'This year';
    case 'all': return 'All time';
    case 'month':
    default:
      return 'This month';
  }
}

function getPreviousRangeLabel(period) {
  switch (period) {
    case 'day': return 'Yesterday';
    case 'week': return 'Last week';
    case 'quarter': return 'Previous quarter';
    case 'year': return 'Last year';
    case 'all': return 'Previous 30 days';
    case 'month':
    default:
      return 'Last month';
  }
}

function getPeriodRange(period = 'month') {
  const now = new Date();
  const end = new Date(now);
  const currentStart = new Date(now);
  const previousStart = new Date(now);
  const previousEnd = new Date(now);

  if (period === 'all') {
    previousStart.setDate(previousStart.getDate() - 30);
    return {
      period,
      current: { start: null, end },
      previous: { start: previousStart, end },
      currentLabel: getRangeLabel(period),
      previousLabel: getPreviousRangeLabel(period),
    };
  }

  if (period === 'day') {
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setDate(previousStart.getDate() - 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    const day = currentStart.getDay();
    const diffToMonday = (day + 6) % 7;
    currentStart.setDate(currentStart.getDate() - diffToMonday);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setTime(currentStart.getTime());
    previousStart.setDate(previousStart.getDate() - 7);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else if (period === 'quarter') {
    const month = currentStart.getMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    currentStart.setMonth(quarterStartMonth, 1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setMonth(quarterStartMonth - 3, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else if (period === 'year') {
    currentStart.setMonth(0, 1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setFullYear(currentStart.getFullYear() - 1, 0, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else {
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setMonth(previousStart.getMonth() - 1, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  }

  return {
    period,
    current: { start: currentStart, end },
    previous: { start: previousStart, end: previousEnd },
    currentLabel: getRangeLabel(period),
    previousLabel: getPreviousRangeLabel(period),
  };
}

function inRange(dateValue, range) {
  if (!range?.start) return true;
  const value = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(value.getTime())) return false;
  return value >= range.start && value <= (range.end || new Date());
}

function compareBlock(currentValue, previousValue, currentLabel, previousLabel) {
  const current = safeNumber(currentValue);
  const previous = safeNumber(previousValue);
  const deltaPercent = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  const tone = deltaPercent > 5 ? 'positive' : deltaPercent < -5 ? 'negative' : 'neutral';
  return {
    currentValue: current,
    previousValue: previous,
    currentLabel,
    previousLabel,
    deltaPercent,
    deltaText: `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`,
    tone,
  };
}

function table(title, columns, rows, count = null, description = '') {
  return {
    title,
    description,
    columns,
    rows: Array.isArray(rows) ? rows : [],
    count: safeNumber(count ?? rows?.length ?? 0),
  };
}

function normalizeSegment(segment = {}, moduleTitle = 'Module') {
  return {
    key: asText(segment.key) || `${moduleTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    title: segment.title || moduleTitle,
    description: segment.description || '',
    badge: segment.badge || 'Detailed analysis',
    kpis: Array.isArray(segment.kpis) ? segment.kpis : [],
    alerts: Array.isArray(segment.alerts) && segment.alerts.length ? segment.alerts : [`No critical alerts in ${segment.title || moduleTitle}.`],
    insights: Array.isArray(segment.insights) && segment.insights.length ? segment.insights : [`${segment.title || moduleTitle} is stable for the selected period.`],
    tables: Array.isArray(segment.tables) ? segment.tables : [],
  };
}

function moduleCard(key, title, description, data = {}) {
  return {
    key,
    title,
    description,
    routeSegment: data.routeSegment || key,
    kpis: Array.isArray(data.kpis) ? data.kpis : [],
    comparison: data.comparison || compareBlock(0, 0, 'Current', 'Previous'),
    alerts: Array.isArray(data.alerts) && data.alerts.length ? data.alerts : [`No critical alerts in ${title}.`],
    insights: Array.isArray(data.insights) && data.insights.length ? data.insights : [`${title} performance is stable.`],
    tables: Array.isArray(data.tables) ? data.tables : [],
    segments: Array.isArray(data.segments) ? data.segments.map((segment) => normalizeSegment(segment, title)) : [],
    heroTone: data.heroTone || 'indigo',
    badge: data.badge || 'Operational intelligence',
  };
}

function summarizeCard(card) {
  return {
    key: card.key,
    title: card.title,
    description: card.description,
    routeSegment: card.routeSegment,
    badge: card.badge,
    primaryMetric: card.kpis?.[0] || null,
    comparison: card.comparison,
    alertCount: card.alerts?.length || 0,
  };
}

function buildScope(req) {
  const role = normalizeRole(req.user?.role);
  const distributorId = asText(req.user?.distributorId || (role === 'distributor' ? req.user?.uid : ''));
  return {
    role,
    companyId: asText(req.user?.companyId),
    companyName: asText(req.user?.companyName),
    distributorId,
    isDistributor: role === 'distributor',
    isCompanyAdmin: role === 'company admin',
    isSystemAdmin: role === 'admin' || role === 'system admin',
  };
}

async function getReportModels(req, { companyId = '', companyName = '' } = {}) {
  return getScopedModels(
    req,
    {
      InventoryLedgerModel: InventoryLedger,
      CompanySalesOrderModel: CompanySalesOrder,
      SecondaryOrderModel: SecondaryOrder,
      CompanyDispatchNoteModel: CompanyDispatchNote,
      DistributorStockReceiptModel: DistributorStockReceipt,
      CustomerInvoiceModel: CustomerInvoice,
      CustomerReceiptModel: CustomerReceipt,
      SupplierInvoiceModel: SupplierInvoice,
      SupplierPaymentModel: SupplierPayment,
      CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
      CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
      GoodsReceiptModel: GoodsReceipt,
      ReturnDocumentModel: ReturnDocument,
      ExpenseModel: Expense,
      AccountModel: Account,
      UserModel: User,
      ProductModel: Product,
      WarehouseModel: Warehouse,
      VehicleModel: Vehicle,
      MessageModel: Message,
    },
    { companyId, companyName },
  );
}

function applyDistributorFilter(scope, query = {}, field = 'distributorId') {
  if (scope.isDistributor && scope.distributorId) {
    return { ...query, [field]: scope.distributorId };
  }
  return { ...query };
}

function inventoryMatchForScope(scope, extra = {}) {
  if (scope.isDistributor && scope.distributorId) {
    return {
      ...extra,
      $or: [
        { ownerType: 'distributor', ownerId: scope.distributorId },
        { distributorId: scope.distributorId },
      ],
    };
  }
  return { ...extra };
}

async function loadReportData(req, options = {}) {
  const scope = buildScope(req);
  const periodInfo = getPeriodRange(options.period || 'month');
  const models = await getReportModels(req, options);

  const [
    companySalesOrders,
    secondaryOrders,
    companyDispatchNotes,
    distributorStockReceipts,
    goodsReceipts,
    customerInvoices,
    customerReceipts,
    supplierInvoices,
    supplierPayments,
    companyInvoicesToDistributors,
    companyReceiptsFromDistributors,
    returnDocuments,
    inventoryLedgerRows,
    expenses,
    accounts,
    users,
    products,
    warehouses,
    vehicles,
    messages,
  ] = await Promise.all([
    models.CompanySalesOrderModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.SecondaryOrderModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.CompanyDispatchNoteModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.DistributorStockReceiptModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.GoodsReceiptModel.find({}).sort({ createdAt: -1 }).lean(),
    models.CustomerInvoiceModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.CustomerReceiptModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.SupplierInvoiceModel.find({}).sort({ createdAt: -1 }).lean(),
    models.SupplierPaymentModel.find({}).sort({ createdAt: -1 }).lean(),
    models.CompanyInvoiceToDistributorModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.CompanyReceiptFromDistributorModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.ReturnDocumentModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.InventoryLedgerModel.find(inventoryMatchForScope(scope, {})).sort({ postedAt: -1 }).lean(),
    models.ExpenseModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.AccountModel.find({}).sort({ createdAt: -1 }).lean(),
    models.UserModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.ProductModel.find({}).sort({ createdAt: -1 }).lean(),
    models.WarehouseModel.find({}).sort({ createdAt: -1 }).lean(),
    models.VehicleModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
    models.MessageModel.find(applyDistributorFilter(scope, {})).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    scope,
    periodInfo,
    models,
    companySalesOrders,
    secondaryOrders,
    companyDispatchNotes,
    distributorStockReceipts,
    goodsReceipts,
    customerInvoices,
    customerReceipts,
    supplierInvoices,
    supplierPayments,
    companyInvoicesToDistributors,
    companyReceiptsFromDistributors,
    returnDocuments,
    inventoryLedgerRows,
    expenses,
    accounts,
    users,
    products,
    warehouses,
    vehicles,
    messages,
  };
}

function currentAndPrevious(rows = [], periodInfo, dateSelector) {
  const current = rows.filter((row) => inRange(dateSelector(row), periodInfo.current));
  const previous = rows.filter((row) => inRange(dateSelector(row), periodInfo.previous));
  return { current, previous };
}

function buildSalesModule(data) {
  const orderDocs = [...data.companySalesOrders, ...data.secondaryOrders];
  const invoiceDocs = [...data.companyInvoicesToDistributors, ...data.customerInvoices];
  const receiptDocs = [...data.companyReceiptsFromDistributors, ...data.customerReceipts];
  const { current, previous } = currentAndPrevious(orderDocs, data.periodInfo, (row) => row.createdAt);
  const invoiceBuckets = currentAndPrevious(invoiceDocs, data.periodInfo, (row) => row.invoiceDate || row.createdAt);

  const currentOrders = current.length;
  const previousOrders = previous.length;
  const currentRevenue = sumField(invoiceBuckets.current, (row) => row.invoiceTotal || row.totals?.grandTotal);
  const previousRevenue = sumField(invoiceBuckets.previous, (row) => row.invoiceTotal || row.totals?.grandTotal);
  const currentReceipts = sumField(receiptDocs.filter((row) => inRange(row.paymentDate || row.createdAt, data.periodInfo.current)), (row) => row.amount);
  const openInvoices = invoiceDocs.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))).length;
  const paidInvoices = invoiceDocs.filter((row) => asText(row.paymentStatus) === 'paid').length;

  const regionMap = new Map();
  data.secondaryOrders.forEach((row) => {
    const key = asText(row.territoryId || row.customer?.partyName || 'Unassigned');
    const entry = regionMap.get(key) || { region: key, orders: 0, quantity: 0, lastMovementAt: null };
    entry.orders += 1;
    entry.quantity += sumLineQty(row.lines);
    entry.lastMovementAt = !entry.lastMovementAt || new Date(row.updatedAt) > new Date(entry.lastMovementAt) ? row.updatedAt : entry.lastMovementAt;
    regionMap.set(key, entry);
  });
  const topRegions = [...regionMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8);

  const productMap = new Map();
  data.inventoryLedgerRows
    .filter((row) => row.movementType === 'secondary_dispatch' || row.movementType === 'company_dispatch')
    .forEach((row) => {
      const key = asText(row.productName || row.productCode || row.productId || 'Unknown');
      const entry = productMap.get(key) || { product: key, quantity: 0, lastMovementAt: null };
      entry.quantity += safeNumber(row.qty);
      entry.lastMovementAt = !entry.lastMovementAt || new Date(row.postedAt) > new Date(entry.lastMovementAt) ? row.postedAt : entry.lastMovementAt;
      productMap.set(key, entry);
    });
  const topProducts = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return moduleCard('sales', 'Sales & Order Performance', 'V2 sales view across company supply and secondary customer orders.', {
    heroTone: 'emerald',
    badge: 'V2 revenue & collections',
    kpis: [
      { label: 'Orders', value: formatNumber(currentOrders), note: `${formatNumber(previousOrders)} in ${data.periodInfo.previousLabel}` },
      { label: 'Revenue', value: formatCurrency(currentRevenue), note: `${formatCurrency(currentReceipts)} collected` },
      { label: 'Paid Invoices', value: formatNumber(paidInvoices), note: `${formatNumber(openInvoices)} still open` },
      { label: 'Units', value: formatNumber(sumField(current, (row) => sumLineQty(row.lines))), note: 'Across company and distributor sales' },
    ],
    comparison: compareBlock(currentRevenue, previousRevenue, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
    alerts: [
      `${formatNumber(openInvoices)} invoices are still unpaid or partially paid.`,
      currentOrders === 0 ? 'No sales orders were captured in the selected period.' : `${formatNumber(currentOrders)} orders captured in the selected period.`,
    ],
    insights: [
      topRegions[0] ? `${topRegions[0].region} is currently the strongest sales cluster with ${formatNumber(topRegions[0].quantity)} units.` : 'Regional sales mix will populate as secondary orders grow.',
      topProducts[0] ? `${topProducts[0].product} is the top-moving product in V2 dispatch activity.` : 'Top product movement will appear once dispatch activity increases.',
    ],
    tables: [
      table('Regional contribution', ['Region', 'Orders', 'Units', 'Last activity'], topRegions.map((row) => [row.region, formatNumber(row.orders), formatNumber(row.quantity), row.lastMovementAt ? new Date(row.lastMovementAt).toLocaleDateString() : '—'])),
      table('Top products', ['Product', 'Units', 'Last dispatch'], topProducts.map((row) => [row.product, formatNumber(row.quantity), row.lastMovementAt ? new Date(row.lastMovementAt).toLocaleDateString() : '—'])),
    ],
  });
}

function buildInventoryModule(data) {
  const currentLedger = data.inventoryLedgerRows.filter((row) => inRange(row.postedAt || row.createdAt, data.periodInfo.current));
  const previousLedger = data.inventoryLedgerRows.filter((row) => inRange(row.postedAt || row.createdAt, data.periodInfo.previous));
  const totalIn = sumField(data.inventoryLedgerRows.filter((row) => row.direction === 'in'), (row) => row.qty);
  const totalOut = sumField(data.inventoryLedgerRows.filter((row) => row.direction === 'out'), (row) => row.qty);
  const onHand = totalIn - totalOut;
  const currentMovement = sumField(currentLedger, (row) => row.qty);
  const previousMovement = sumField(previousLedger, (row) => row.qty);

  const byProduct = new Map();
  data.inventoryLedgerRows.forEach((row) => {
    const key = asText(row.productName || row.productCode || row.productId || 'Unknown');
    const entry = byProduct.get(key) || { product: key, inQty: 0, outQty: 0, balance: 0 };
    if (row.direction === 'in') entry.inQty += safeNumber(row.qty);
    else entry.outQty += safeNumber(row.qty);
    entry.balance = entry.inQty - entry.outQty;
    byProduct.set(key, entry);
  });
  const productBalances = [...byProduct.values()].sort((a, b) => b.balance - a.balance).slice(0, 10);

  const byWarehouse = new Map();
  data.inventoryLedgerRows.forEach((row) => {
    const key = asText(row.warehouseName || row.warehouseId || 'Unassigned');
    const entry = byWarehouse.get(key) || { warehouse: key, activity: 0, inQty: 0, outQty: 0 };
    entry.activity += 1;
    if (row.direction === 'in') entry.inQty += safeNumber(row.qty);
    else entry.outQty += safeNumber(row.qty);
    byWarehouse.set(key, entry);
  });
  const warehouseActivity = [...byWarehouse.values()].sort((a, b) => b.activity - a.activity).slice(0, 8);

  return moduleCard('inventory', 'Inventory & Warehousing', 'V2 inventory picture powered by the posted inventory ledger.', {
    heroTone: 'blue',
    badge: 'Ledger-backed stock view',
    kpis: [
      { label: 'On Hand', value: formatNumber(onHand), note: `${formatNumber(totalIn)} inbound / ${formatNumber(totalOut)} outbound` },
      { label: 'Current Movement', value: formatNumber(currentMovement), note: `${formatNumber(previousMovement)} in ${data.periodInfo.previousLabel}` },
      { label: 'Warehouses', value: formatNumber(data.warehouses.length), note: `${formatNumber(warehouseActivity.length)} with activity` },
      { label: 'Products', value: formatNumber(data.products.length), note: `${formatNumber(productBalances.length)} with stock activity` },
    ],
    comparison: compareBlock(currentMovement, previousMovement, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
    alerts: [
      onHand < 0 ? 'Inventory ledger is negative overall. Review dispatch and receipt sequencing.' : 'Inventory ledger is balanced overall.',
      productBalances.some((row) => row.balance < 0) ? 'Some products show negative balance. Review receipt and dispatch posting order.' : 'No negative product balances detected in the sampled product set.',
    ],
    insights: [
      warehouseActivity[0] ? `${warehouseActivity[0].warehouse} is the busiest warehouse by posted ledger activity.` : 'Warehouse activity will appear as receipts and dispatches are posted.',
      productBalances[0] ? `${productBalances[0].product} carries the highest net stock balance.` : 'Product balance ranking will appear once ledger activity increases.',
    ],
    tables: [
      table('Product balances', ['Product', 'Inbound', 'Outbound', 'Balance'], productBalances.map((row) => [row.product, formatNumber(row.inQty), formatNumber(row.outQty), formatNumber(row.balance)])),
      table('Warehouse activity', ['Warehouse', 'Posts', 'Inbound', 'Outbound'], warehouseActivity.map((row) => [row.warehouse, formatNumber(row.activity), formatNumber(row.inQty), formatNumber(row.outQty)])),
    ],
  });
}

function buildFinanceModule(data) {
  const currentExpenses = data.expenses.filter((row) => inRange(row.expenseDate || row.createdAt, data.periodInfo.current));
  const previousExpenses = data.expenses.filter((row) => inRange(row.expenseDate || row.createdAt, data.periodInfo.previous));
  const customerOpen = data.customerInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus)));
  const companyOpen = data.companyInvoicesToDistributors.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus)));
  const supplierOpen = data.supplierInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus)));
  const expenseTotal = sumField(currentExpenses, (row) => row.amount);
  const previousExpenseTotal = sumField(previousExpenses, (row) => row.amount);
  const totalBalances = sumField(data.accounts, (row) => row.currentBalance);
  const currentReceipts = sumField(data.customerReceipts.filter((row) => inRange(row.paymentDate || row.createdAt, data.periodInfo.current)), (row) => row.amount)
    + sumField(data.companyReceiptsFromDistributors.filter((row) => inRange(row.paymentDate || row.createdAt, data.periodInfo.current)), (row) => row.amount);
  const customerOutstanding = sumField(customerOpen, (row) => row.balanceAmount || row.invoiceTotal);
  const distributorOutstanding = sumField(companyOpen, (row) => row.balanceAmount || row.invoiceTotal);
  const supplierPayable = sumField(supplierOpen, (row) => row.balanceAmount || row.invoiceTotal);

  return moduleCard('finance', 'Finance & Accounts', 'V2 finance snapshot based on invoices, receipts, supplier bills, and account balances.', {
    heroTone: 'violet',
    badge: 'Receipts, invoices, balances',
    kpis: [
      { label: 'Account Balances', value: formatCurrency(totalBalances), note: `${formatNumber(data.accounts.length)} tracked accounts` },
      { label: 'Current Receipts', value: formatCurrency(currentReceipts), note: `${formatCurrency(customerOutstanding)} customer outstanding` },
      { label: 'Distributor Outstanding', value: formatCurrency(distributorOutstanding), note: `${formatCurrency(supplierPayable)} supplier payable` },
      { label: 'Expenses', value: formatCurrency(expenseTotal), note: `${formatCurrency(previousExpenseTotal)} in ${data.periodInfo.previousLabel}` },
    ],
    comparison: compareBlock(expenseTotal, previousExpenseTotal, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
    alerts: [
      customerOpen.length ? `${formatNumber(customerOpen.length)} customer invoices remain open.` : 'No open customer invoices.',
      companyOpen.length ? `${formatNumber(companyOpen.length)} distributor invoices remain open.` : 'No open distributor invoices.',
      supplierOpen.length ? `${formatNumber(supplierOpen.length)} supplier invoices remain unpaid or partially paid.` : 'No open supplier invoices.',
    ],
    insights: [
      currentReceipts >= expenseTotal ? 'Current period receipts are covering operating expenses.' : 'Current period receipts are below operating expenses. Watch cash flow closely.',
      data.accounts[0] ? `${data.accounts[0].accountName || data.accounts[0].accountId} is available for settlement tracking.` : 'Create and reconcile accounts for cleaner finance reporting.',
    ],
    tables: [
      table('Account balances', ['Account', 'Type', 'Balance'], data.accounts.map((row) => [row.accountName || row.accountId, titleCase(row.accountType), formatCurrency(row.currentBalance)])),
      table('Open invoice balances', ['Bucket', 'Count', 'Outstanding'], [
        ['Customer invoices', formatNumber(customerOpen.length), formatCurrency(customerOutstanding)],
        ['Distributor invoices', formatNumber(companyOpen.length), formatCurrency(distributorOutstanding)],
        ['Supplier invoices', formatNumber(supplierOpen.length), formatCurrency(supplierPayable)],
      ]),
    ],
  });
}

function buildHrModule(data) {
  const activeUsers = data.users.filter((row) => asText(row.status).toLowerCase() === 'active');
  const roles = new Map();
  data.users.forEach((row) => {
    const key = titleCase(row.role || 'Unknown');
    roles.set(key, (roles.get(key) || 0) + 1);
  });
  const roleRows = [...roles.entries()].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);

  return moduleCard('hr', 'HR & Workforce', 'People and role coverage across the tenant workspace.', {
    heroTone: 'pink',
    badge: 'Workforce coverage',
    kpis: [
      { label: 'Active Users', value: formatNumber(activeUsers.length), note: `${formatNumber(data.users.length)} total users` },
      { label: 'Suppliers', value: formatNumber(data.users.filter((row) => normalizeRole(row.role) === 'supplier').length), note: 'Supplier contacts in tenant' },
      { label: 'Sales Team', value: formatNumber(data.users.filter((row) => ['salesman', 'order booker', 'orderbooker'].includes(normalizeRole(row.role))).length), note: 'Field team coverage' },
      { label: 'Drivers', value: formatNumber(data.users.filter((row) => ['driver', 'delivery / driver', 'delivery', 'delivery boy'].includes(normalizeRole(row.role))).length), note: 'Delivery resources' },
    ],
    comparison: compareBlock(activeUsers.length, data.users.length - activeUsers.length, 'Active', 'Inactive'),
    alerts: [
      activeUsers.length === 0 ? 'No active users found in tenant scope.' : `${formatNumber(activeUsers.length)} users are active.`,
      roleRows.length < 3 ? 'Role mix is still narrow. Add more operational roles for richer segregation.' : 'Role mix is healthy for operational segregation.',
    ],
    insights: [
      roleRows[0] ? `${roleRows[0].role} is the largest role group in the current tenant.` : 'Role breakdown will populate once more users are added.',
    ],
    tables: [table('Users by role', ['Role', 'Count'], roleRows.map((row) => [row.role, formatNumber(row.count)]))],
  });
}

function buildLogisticsModule(data) {
  const dispatchCountsMap = new Map();
  data.companyDispatchNotes.forEach((row) => {
    const key = `dispatch_${asText(row.status || 'draft')}`;
    dispatchCountsMap.set(key, (dispatchCountsMap.get(key) || 0) + 1);
  });
  data.distributorStockReceipts.forEach((row) => {
    const key = `receipt_${asText(row.status || 'draft')}`;
    dispatchCountsMap.set(key, (dispatchCountsMap.get(key) || 0) + 1);
  });
  const transferCounts = [...dispatchCountsMap.entries()].map(([status, count]) => ({ status, count }));
  const trackedVehicles = data.vehicles.filter((row) => asText(row.gpsLatitude) && asText(row.gpsLongitude)).length;

  return moduleCard('logistics', 'Distribution & Logistics', 'Dispatch, receipt, and fleet signals from V2 dispatch and receipt documents.', {
    heroTone: 'amber',
    badge: 'Dispatch & fleet control',
    kpis: [
      { label: 'Vehicles', value: formatNumber(data.vehicles.length), note: `${formatNumber(trackedVehicles)} tracked live` },
      { label: 'Dispatch Notes', value: formatNumber(data.companyDispatchNotes.length), note: `${formatNumber(data.distributorStockReceipts.length)} stock receipts` },
      { label: 'Delivered/POD', value: formatNumber(data.companyDispatchNotes.filter((row) => asText(row.status) === 'delivered' || asText(row.podUrl)).length), note: 'Company dispatch confirmations' },
      { label: 'Inbound Receipts', value: formatNumber(data.distributorStockReceipts.filter((row) => asText(row.status) === 'posted').length), note: 'Distributor stock receipts posted' },
    ],
    comparison: compareBlock(data.companyDispatchNotes.length, data.distributorStockReceipts.length, 'Dispatches', 'Receipts'),
    alerts: [
      data.companyDispatchNotes.filter((row) => !asText(row.podUrl)).length ? `${formatNumber(data.companyDispatchNotes.filter((row) => !asText(row.podUrl)).length)} dispatch notes do not have POD yet.` : 'All current dispatch notes carry POD or are still drafts.',
      transferCounts.length === 0 ? 'No logistics postings yet.' : `${formatNumber(transferCounts.length)} logistics status buckets are active.`,
    ],
    insights: [
      data.vehicles.length ? 'Fleet and document signals are now coming from V2 dispatch and receipt documents.' : 'Add fleet records to enrich logistics visibility.',
    ],
    tables: [table('Dispatch and receipt status mix', ['Status', 'Count'], transferCounts.map((row) => [row.status, formatNumber(row.count)]))],
  });
}

function buildComplianceModule(data) {
  const missingPodDispatches = data.companyDispatchNotes.filter((row) => !asText(row.podUrl));
  const missingPodSecondary = data.secondaryOrders.filter((row) => ['dispatched', 'delivered'].includes(asText(row.status)) && !asText(row.podUrl));
  const reversedReturns = data.returnDocuments.filter((row) => asText(row.status) === 'reversed');
  const openReturns = data.returnDocuments.filter((row) => ['draft', 'approved'].includes(asText(row.status)));
  return moduleCard('compliance', 'Compliance & Exceptions', 'Returns, POD gaps, and document exceptions from V2 records.', {
    heroTone: 'rose',
    badge: 'Exception management',
    kpis: [
      { label: 'Returns', value: formatNumber(data.returnDocuments.length), note: `${formatNumber(openReturns.length)} still open` },
      { label: 'Missing POD', value: formatNumber(missingPodDispatches.length + missingPodSecondary.length), note: 'Dispatch documents without evidence' },
      { label: 'Reversed Docs', value: formatNumber(reversedReturns.length), note: 'Reversed return documents' },
      { label: 'Messages', value: formatNumber(data.messages.length), note: 'Operational communication trail' },
    ],
    comparison: compareBlock(openReturns.length, reversedReturns.length, 'Open', 'Reversed'),
    alerts: [
      missingPodDispatches.length || missingPodSecondary.length ? `${formatNumber(missingPodDispatches.length + missingPodSecondary.length)} dispatch records need POD follow-up.` : 'No POD gaps detected in the current V2 dispatch data.',
      openReturns.length ? `${formatNumber(openReturns.length)} return documents are still open.` : 'No pending returns.',
    ],
    insights: [
      data.returnDocuments.length ? 'Return activity is now visible through the shared V2 return document collection.' : 'Return reporting will deepen once more return documents are posted.',
    ],
    tables: [
      table('Return status overview', ['Type', 'Status', 'Count'], (() => {
        const map = new Map();
        data.returnDocuments.forEach((row) => {
          const key = `${titleCase(row.returnType)}|${titleCase(row.status)}`;
          map.set(key, (map.get(key) || 0) + 1);
        });
        return [...map.entries()].map(([key, count]) => {
          const [type, status] = key.split('|');
          return [type, status, formatNumber(count)];
        });
      })()),
    ],
  });
}

function buildProcurementModule(data) {
  const currentReceipts = data.goodsReceipts.filter((row) => inRange(row.receivedAt || row.createdAt, data.periodInfo.current));
  const previousReceipts = data.goodsReceipts.filter((row) => inRange(row.receivedAt || row.createdAt, data.periodInfo.previous));
  const receiptQty = sumField(currentReceipts, (row) => sumLineQty(row.lines));
  const previousReceiptQty = sumField(previousReceipts, (row) => sumLineQty(row.lines));
  const supplierInvoiceTotal = sumField(data.supplierInvoices.filter((row) => inRange(row.invoiceDate || row.createdAt, data.periodInfo.current)), (row) => row.invoiceTotal || row.totals?.grandTotal);
  const supplierPaymentTotal = sumField(data.supplierPayments.filter((row) => inRange(row.paymentDate || row.createdAt, data.periodInfo.current)), (row) => row.amount);

  const recentPurchases = [];
  data.goodsReceipts.slice(0, 10).forEach((receipt) => {
    (receipt.lines || []).forEach((line) => {
      recentPurchases.push({
        _id: `${receipt._id}-${line.lineNo || line.productId || line.productCode}`,
        productName: line.productName || line.productCode || line.productId,
        warehouseName: receipt.receivedAtWarehouse?.partyName || receipt.receivedAtWarehouse?.partyId || '—',
        quantity: safeNumber(line.receivedQty || line.qty),
        createdAt: receipt.receivedAt || receipt.createdAt,
      });
    });
  });

  const inboundTrendMap = new Map();
  const last7Dates = Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - index));
    return d;
  });
  currentReceipts.forEach((receipt) => {
    const d = new Date(receipt.receivedAt || receipt.createdAt);
    const key = d.toISOString().slice(0, 10);
    inboundTrendMap.set(key, (inboundTrendMap.get(key) || 0) + sumLineQty(receipt.lines));
  });
  const inboundTrend = last7Dates.map((date) => ({
    label: date.toLocaleDateString('en-PK', { weekday: 'short' }),
    quantity: safeNumber(inboundTrendMap.get(date.toISOString().slice(0, 10))),
  }));

  return moduleCard('procurement', 'Procurement & Supplier Management', 'V2 supplier bills, payments, and goods receipts.', {
    heroTone: 'teal',
    badge: 'Supplier receipts & settlements',
    kpis: [
      { label: 'Total Suppliers', value: formatNumber(data.users.filter((row) => normalizeRole(row.role) === 'supplier').length), note: 'Supplier users in tenant' },
      { label: 'Purchase Receipts', value: formatNumber(currentReceipts.length), note: `${formatNumber(receiptQty)} units received` },
      { label: 'Supplier Bills', value: formatCurrency(supplierInvoiceTotal), note: `${formatCurrency(supplierPaymentTotal)} paid` },
      { label: 'Open Supplier Bills', value: formatNumber(data.supplierInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))).length), note: 'Requires settlement follow-up' },
    ],
    comparison: compareBlock(receiptQty, previousReceiptQty, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
    alerts: [
      data.supplierInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))).length ? `${formatNumber(data.supplierInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))).length)} supplier invoices remain open.` : 'All current supplier invoices are settled or not yet posted.',
      currentReceipts.length ? `${formatNumber(currentReceipts.length)} goods receipts were captured in the selected period.` : 'No goods receipts were posted in the selected period.',
    ],
    insights: [
      supplierPaymentTotal >= supplierInvoiceTotal ? 'Supplier payments are keeping pace with current-period supplier billing.' : 'Supplier invoices are ahead of payments in the selected period.',
    ],
    tables: [
      table('Recent goods receipts', ['Product', 'Warehouse', 'Quantity', 'Received'], recentPurchases.slice(0, 10).map((row) => [row.productName, row.warehouseName, formatNumber(row.quantity), row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'])),
    ],
    segments: [
      normalizeSegment({
        key: 'procurement-inbound',
        title: 'Inbound trend',
        description: 'Last 7 days of goods receipt quantity.',
        tables: [table('Inbound trend', ['Day', 'Quantity'], inboundTrend.map((row) => [row.label, formatNumber(row.quantity)]))],
      }, 'Procurement & Supplier Management'),
    ],
    extra: { recentPurchases, inboundTrend },
  });
}

function buildMeta(data) {
  const scopeLabel = data.scope.isDistributor && data.scope.distributorId
    ? `Distributor scope (${data.scope.distributorId})`
    : data.scope.companyName || data.scope.companyId || 'Current tenant';
  return {
    period: data.periodInfo.period,
    currentLabel: data.periodInfo.currentLabel,
    previousLabel: data.periodInfo.previousLabel,
    generatedAt: new Date().toISOString(),
    scopeLabel,
  };
}

async function buildMasterReport(req, { period = 'month', companyId = '', companyName = '' } = {}) {
  const data = await loadReportData(req, { period, companyId, companyName });
  const modules = [
    buildSalesModule(data),
    buildInventoryModule(data),
    buildFinanceModule(data),
    buildHrModule(data),
    buildLogisticsModule(data),
    buildComplianceModule(data),
    buildProcurementModule(data),
  ];
  const sales = modules.find((item) => item.key === 'sales');
  const finance = modules.find((item) => item.key === 'finance');

  return {
    meta: buildMeta(data),
    summary: {
      headlineKpis: [
        sales?.kpis?.[0],
        sales?.kpis?.[1],
        modules.find((item) => item.key === 'inventory')?.kpis?.[0],
        finance?.kpis?.[0],
      ].filter(Boolean),
      alerts: uniq(modules.flatMap((module) => module.alerts)).slice(0, 5),
      insights: uniq(modules.flatMap((module) => module.insights)).slice(0, 5),
      cards: modules.map(summarizeCard),
      orderComparison: sales?.comparison || compareBlock(0, 0, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
      expenseComparison: finance?.comparison || compareBlock(0, 0, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
      givenLoanComparison: compareBlock(0, 0, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
      receivedLoanComparison: compareBlock(0, 0, data.periodInfo.currentLabel, data.periodInfo.previousLabel),
    },
    modules,
  };
}

async function buildFocusedReport(req, moduleKey, options = {}) {
  const report = await buildMasterReport(req, options);
  const targetKey = asText(moduleKey).toLowerCase();
  const module = report.modules.find((item) => item.key === targetKey || item.routeSegment === targetKey);
  return {
    meta: report.meta,
    module: module || moduleCard(targetKey || 'module', titleCase(targetKey || 'Module'), 'No focused report is configured for this module yet.'),
  };
}

async function buildFinanceReport(req, options = {}) {
  const data = await loadReportData(req, options);
  const finance = buildFinanceModule(data);
  return {
    meta: buildMeta(data),
    module: finance,
    totals: {
      totalExpenses: sumField(data.expenses, (row) => row.amount),
      approvedExpenses: sumField(data.expenses.filter((row) => normalizeRole(row.status) === 'approved'), (row) => row.amount),
      currentReceipts:
        sumField(data.customerReceipts, (row) => row.amount) +
        sumField(data.companyReceiptsFromDistributors, (row) => row.amount),
      customerOutstanding: sumField(data.customerInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))), (row) => row.balanceAmount || row.invoiceTotal),
      distributorOutstanding: sumField(data.companyInvoicesToDistributors.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))), (row) => row.balanceAmount || row.invoiceTotal),
      supplierPayable: sumField(data.supplierInvoices.filter((row) => ['unpaid', 'partial'].includes(asText(row.paymentStatus))), (row) => row.balanceAmount || row.invoiceTotal),
    },
    accounts: data.accounts,
  };
}

async function buildLogisticsReport(req, options = {}) {
  const data = await loadReportData(req, options);
  const logistics = buildLogisticsModule(data);
  const transferCounts = logistics.tables?.[0]?.rows?.map((row) => ({ status: row[0], count: safeNumber(String(row[1]).replace(/,/g, '')) })) || [];
  return {
    meta: buildMeta(data),
    module: logistics,
    vehicleCount: data.vehicles.length,
    transferCounts,
  };
}

async function buildProcurementReport(req, options = {}) {
  const data = await loadReportData(req, options);
  const procurement = buildProcurementModule(data);
  const recentTable = procurement.tables?.[0]?.rows || [];
  const inboundTrendSegment = procurement.segments?.[0]?.tables?.[0]?.rows || [];
  return {
    meta: buildMeta(data),
    module: procurement,
    kpis: {
      totalSuppliers: data.users.filter((row) => normalizeRole(row.role) === 'supplier').length,
      activeSuppliers: data.users.filter((row) => normalizeRole(row.role) === 'supplier' && normalizeRole(row.status) === 'active').length,
      totalReceipts: data.goodsReceipts.length,
      totalQuantity: sumField(data.goodsReceipts, (row) => sumLineQty(row.lines)),
    },
    inboundTrend: inboundTrendSegment.map((row) => ({ label: row[0], quantity: safeNumber(String(row[1]).replace(/,/g, '')) })),
    recentPurchases: recentTable.map((row, index) => ({ _id: `recent-${index}`, productName: row[0], warehouseName: row[1], quantity: safeNumber(String(row[2]).replace(/,/g, '')), createdAt: row[3] })),
  };
}

function buildDailySeries(rows = [], dateSelector, valueSelector, days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString('en-PK', { weekday: 'short' }), value: 0, orders: 0, inbound: 0, outbound: 0 };
  });
  const map = new Map(buckets.map((row) => [row.key, row]));
  rows.forEach((row) => {
    const date = new Date(dateSelector(row));
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    if (!map.has(key)) return;
    const target = map.get(key);
    const delta = safeNumber(valueSelector(row));
    target.value += delta;
    target.orders += 1;
  });
  return buckets;
}

async function buildDashboardOverview(req, options = {}) {
  const data = await loadReportData(req, { ...options, period: options.period || 'month' });
  const orderDocs = [...data.companySalesOrders, ...data.secondaryOrders];
  const invoiceDocs = [...data.companyInvoicesToDistributors, ...data.customerInvoices];
  const salesOrders = orderDocs.length;
  const salesQuantity = sumField(orderDocs, (row) => sumLineQty(row.lines));
  const totalRevenue = sumField(invoiceDocs, (row) => row.invoiceTotal || row.totals?.grandTotal);
  const dispatchedOrders = data.companyDispatchNotes.length + data.secondaryOrders.filter((row) => ['dispatched', 'delivered'].includes(asText(row.status))).length;
  const totalIn = sumField(data.inventoryLedgerRows.filter((row) => row.direction === 'in'), (row) => row.qty);
  const totalOut = sumField(data.inventoryLedgerRows.filter((row) => row.direction === 'out'), (row) => row.qty);
  const inventoryOnHand = totalIn - totalOut;
  const activeUsers = data.users.filter((row) => normalizeRole(row.status) === 'active').length;
  const trackedVehicles = data.vehicles.filter((row) => asText(row.gpsLatitude) && asText(row.gpsLongitude)).length;
  const expenseTotal = sumField(data.expenses, (row) => row.amount);
  const pendingExpenses = data.expenses.filter((row) => normalizeRole(row.status) === 'pending').length;

  const salesTrend = buildDailySeries(orderDocs, (row) => row.createdAt, (row) => sumLineQty(row.lines), 7).map((row) => ({ label: row.label, value: row.value }));
  const inventoryFlow = buildDailySeries(data.inventoryLedgerRows, (row) => row.postedAt || row.createdAt, (row) => row.qty, 7).map((row) => ({
    label: row.label,
    inbound: sumField(data.inventoryLedgerRows.filter((ledger) => (ledger.postedAt || ledger.createdAt) && new Date(ledger.postedAt || ledger.createdAt).toISOString().slice(0, 10) === row.key && ledger.direction === 'in'), (ledger) => ledger.qty),
    outbound: sumField(data.inventoryLedgerRows.filter((ledger) => (ledger.postedAt || ledger.createdAt) && new Date(ledger.postedAt || ledger.createdAt).toISOString().slice(0, 10) === row.key && ledger.direction === 'out'), (ledger) => ledger.qty),
  }));
  const dailyOrders = buildDailySeries(orderDocs, (row) => row.createdAt, () => 1, 14).map((row) => ({ label: row.label, value: row.orders }));

  const weeklyRevenue = Array.from({ length: 8 }, (_, index) => index).map((offset) => {
    const end = new Date();
    end.setDate(end.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const value = sumField(invoiceDocs.filter((row) => inRange(row.invoiceDate || row.createdAt, { start, end })), (row) => row.invoiceTotal || row.totals?.grandTotal);
    return { label: `W${8 - offset}`, value };
  }).reverse();
  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => index).map((offset) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - offset), 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const value = sumField(invoiceDocs.filter((row) => {
      const d = new Date(row.invoiceDate || row.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    }), (row) => row.invoiceTotal || row.totals?.grandTotal);
    return { label: date.toLocaleDateString('en-PK', { month: 'short' }), value };
  });
  const currentYear = new Date().getFullYear();
  const yearlyRevenue = [currentYear - 2, currentYear - 1, currentYear].map((year) => ({
    label: String(year),
    value: sumField(invoiceDocs.filter((row) => new Date(row.invoiceDate || row.createdAt).getFullYear() === year), (row) => row.invoiceTotal || row.totals?.grandTotal),
  }));

  return {
    ok: true,
    kpis: {
      salesOrders,
      salesQuantity,
      inventoryOnHand,
      totalRevenue,
      dispatchedOrders,
      activeUsers,
      totalUsers: data.users.length,
      trackedVehicles,
      totalVehicles: data.vehicles.length,
      pendingExpenses,
      expenseTotal,
    },
    charts: {
      salesTrend,
      inventoryFlow,
      dailyOrders,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
    },
    modules: {
      salesOrders,
      dispatchedOrders,
      warehouses: data.warehouses.length,
      products: data.products.length,
      vehicles: data.vehicles.length,
      returns: data.returnDocuments.length,
      messages: data.messages.length,
    },
    recent: {
      movements: data.inventoryLedgerRows.slice(0, 5),
      expenses: data.expenses.slice(0, 5),
      transfers: [...data.companyDispatchNotes.slice(0, 3), ...data.distributorStockReceipts.slice(0, 3)].slice(0, 5),
    },
    meta: buildMeta(data),
  };
}

async function buildOperationsDashboard(req, options = {}) {
  const data = await loadReportData(req, { ...options, period: options.period || 'month' });
  const totalOrders = data.companySalesOrders.length + data.secondaryOrders.length;
  const approvedOrders = data.companySalesOrders.filter((row) => ['approved', 'reserved', 'ready_to_dispatch'].includes(asText(row.status))).length + data.secondaryOrders.filter((row) => ['approved', 'reserved'].includes(asText(row.status))).length;
  const dispatchedOrders = data.companyDispatchNotes.filter((row) => ['posted', 'delivered'].includes(asText(row.status))).length + data.secondaryOrders.filter((row) => ['dispatched', 'delivered'].includes(asText(row.status))).length;
  const completedOrders = data.secondaryOrders.filter((row) => ['delivered', 'closed'].includes(asText(row.status))).length + data.companySalesOrders.filter((row) => ['received', 'closed'].includes(asText(row.status))).length;
  const backlogOrders = data.companySalesOrders.filter((row) => ['draft', 'approved', 'reserved', 'ready_to_dispatch'].includes(asText(row.status))).length + data.secondaryOrders.filter((row) => ['submitted', 'approved', 'reserved'].includes(asText(row.status))).length;
  const orderFillRate = totalOrders ? (dispatchedOrders / totalOrders) * 100 : 0;
  const onTimeDispatchRate = totalOrders ? (completedOrders / totalOrders) * 100 : 0;
  const cycleRows = [...data.companySalesOrders, ...data.secondaryOrders].filter((row) => ['received', 'closed', 'delivered'].includes(asText(row.status)) && row.createdAt && row.updatedAt);
  const cycleTimeHours = cycleRows.length ? sumField(cycleRows, (row) => (new Date(row.updatedAt) - new Date(row.createdAt)) / 36e5) / cycleRows.length : 0;
  const trackedVehicles = data.vehicles.filter((row) => asText(row.gpsLatitude) && asText(row.gpsLongitude)).length;
  const activeWarehouses = new Set(data.inventoryLedgerRows.filter((row) => inRange(row.postedAt || row.createdAt, getPeriodRange('week').current)).map((row) => row.warehouseId || row.warehouseName)).size;
  const transferCompletionRate = data.companyDispatchNotes.length ? (data.distributorStockReceipts.filter((row) => asText(row.status) === 'posted').length / data.companyDispatchNotes.length) * 100 : 0;

  const regionalMap = new Map();
  data.secondaryOrders.forEach((row) => {
    const key = asText(row.territoryId || row.customer?.partyName || 'Unassigned');
    const entry = regionalMap.get(key) || { region: key, orders: 0 };
    entry.orders += 1;
    regionalMap.set(key, entry);
  });
  const totalRegionalOrders = sumField([...regionalMap.values()], (row) => row.orders);
  const regionalCompletion = [...regionalMap.values()].map((row) => ({
    region: row.region,
    value: totalRegionalOrders ? Math.round((row.orders / totalRegionalOrders) * 100) : 0,
    orders: row.orders,
  })).sort((a, b) => b.orders - a.orders).slice(0, 6);

  const alerts = [];
  const missingPod = data.companyDispatchNotes.filter((row) => !asText(row.podUrl)).length + data.secondaryOrders.filter((row) => ['dispatched', 'delivered'].includes(asText(row.status)) && !asText(row.podUrl)).length;
  if (missingPod) alerts.push({ title: 'POD follow-up', detail: `${formatNumber(missingPod)} dispatch records still need POD.`, tone: 'amber' });
  if (backlogOrders) alerts.push({ title: 'Backlog orders', detail: `${formatNumber(backlogOrders)} orders are waiting for dispatch or completion.`, tone: 'blue' });
  if (!alerts.length) alerts.push({ title: 'Stable operations', detail: 'No critical operational alerts detected in V2 data.', tone: 'emerald' });

  const focusItems = [
    { title: 'Company dispatches', value: formatNumber(data.companyDispatchNotes.length), note: `${formatNumber(data.distributorStockReceipts.length)} receipts posted` },
    { title: 'Secondary deliveries', value: formatNumber(data.secondaryOrders.filter((row) => ['dispatched', 'delivered'].includes(asText(row.status))).length), note: `${formatNumber(data.secondaryOrders.filter((row) => asText(row.status) === 'delivered').length)} delivered` },
    { title: 'Goods receipts', value: formatNumber(data.goodsReceipts.length), note: `${formatNumber(sumField(data.goodsReceipts, (row) => sumLineQty(row.lines)))} units received` },
  ];

  return {
    ok: true,
    kpis: {
      orderFillRate,
      onTimeDispatchRate,
      cycleTimeHours,
      backlogOrders,
      totalOrders,
      approvedOrders,
      dispatchedOrders,
      completedOrders,
    },
    serviceHealth: [
      { title: 'Fleet Tracking Coverage', value: Math.round(data.vehicles.length ? (trackedVehicles / data.vehicles.length) * 100 : 0), note: `${trackedVehicles}/${data.vehicles.length} vehicles reporting` },
      { title: 'Warehouse Activity', value: Math.round(data.warehouses.length ? (activeWarehouses / data.warehouses.length) * 100 : 0), note: `${activeWarehouses}/${data.warehouses.length} active in last 7 days` },
      { title: 'Order Approval Rate', value: Math.round(totalOrders ? ((approvedOrders + dispatchedOrders + completedOrders) / totalOrders) * 100 : 0), note: `${approvedOrders + dispatchedOrders + completedOrders} of ${totalOrders} orders` },
      { title: 'Transfer Completion', value: Math.round(transferCompletionRate), note: `${data.distributorStockReceipts.filter((row) => asText(row.status) === 'posted').length}/${data.companyDispatchNotes.length} receipts posted` },
    ],
    alerts,
    focusItems,
    pipeline: [
      { label: 'Orders Captured', value: totalOrders },
      { label: 'Orders Approved', value: approvedOrders },
      { label: 'Picking & Packing', value: approvedOrders + dispatchedOrders },
      { label: 'Dispatched', value: dispatchedOrders + completedOrders },
    ],
    regionalCompletion,
    updatedAt: new Date().toISOString(),
  };
}

async function buildSalesKpiSummary(req, options = {}) {
  const data = await loadReportData(req, { ...options, period: options.period || 'month' });
  const orderDocs = [...data.companySalesOrders, ...data.secondaryOrders];
  const salesDocs = data.inventoryLedgerRows.filter((row) => row.movementType === 'secondary_dispatch' || row.movementType === 'company_dispatch');
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const prevWeekStart = new Date(startOfWeek);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(startOfWeek);
  prevWeekEnd.setMilliseconds(-1);

  const weekOrders = orderDocs.filter((row) => inRange(row.createdAt, { start: startOfWeek, end: today }));
  const prevWeekOrders = orderDocs.filter((row) => inRange(row.createdAt, { start: prevWeekStart, end: prevWeekEnd }));
  const weekQuantity = sumField(salesDocs.filter((row) => inRange(row.postedAt || row.createdAt, { start: startOfWeek, end: today })), (row) => row.qty);
  const prevWeekQuantity = sumField(salesDocs.filter((row) => inRange(row.postedAt || row.createdAt, { start: prevWeekStart, end: prevWeekEnd })), (row) => row.qty);
  const weekOverWeek = prevWeekOrders.length ? Math.round(((weekOrders.length - prevWeekOrders.length) / prevWeekOrders.length) * 100) : weekOrders.length ? 100 : 0;

  const regionMap = new Map();
  data.secondaryOrders.forEach((row) => {
    const region = asText(row.territoryId || row.customer?.partyName || 'Unassigned');
    const entry = regionMap.get(region) || { region, orders: 0, quantity: 0, lastMovementAt: null };
    entry.orders += 1;
    entry.quantity += sumLineQty(row.lines);
    entry.lastMovementAt = !entry.lastMovementAt || new Date(row.updatedAt) > new Date(entry.lastMovementAt) ? row.updatedAt : entry.lastMovementAt;
    regionMap.set(region, entry);
  });
  const regions = [...regionMap.values()].sort((a, b) => b.quantity - a.quantity);

  const productMap = new Map();
  const warehouseMap = new Map();
  salesDocs.forEach((row) => {
    const productKey = asText(row.productName || row.productCode || row.productId || 'Unknown');
    const productEntry = productMap.get(productKey) || { product: productKey, quantity: 0, lastMovementAt: null };
    productEntry.quantity += safeNumber(row.qty);
    productEntry.lastMovementAt = !productEntry.lastMovementAt || new Date(row.postedAt) > new Date(productEntry.lastMovementAt) ? row.postedAt : productEntry.lastMovementAt;
    productMap.set(productKey, productEntry);

    const warehouseKey = asText(row.warehouseName || row.warehouseId || 'Unassigned');
    const warehouseEntry = warehouseMap.get(warehouseKey) || { warehouse: warehouseKey, quantity: 0, lastMovementAt: null };
    warehouseEntry.quantity += safeNumber(row.qty);
    warehouseEntry.lastMovementAt = !warehouseEntry.lastMovementAt || new Date(row.postedAt) > new Date(warehouseEntry.lastMovementAt) ? row.postedAt : warehouseEntry.lastMovementAt;
    warehouseMap.set(warehouseKey, warehouseEntry);
  });

  const trend = buildDailySeries(orderDocs.filter((row) => inRange(row.createdAt, { start: startOfWeek, end: today })), (row) => row.createdAt, (row) => sumLineQty(row.lines), 7).map((row) => ({ day: row.key, orders: row.orders, quantity: row.value }));

  return {
    ok: true,
    summary: {
      orders: orderDocs.length,
      quantity: sumField(salesDocs, (row) => row.qty),
      regions: regions.length,
      weekOrders: weekOrders.length,
      weekQuantity,
      weekOverWeek,
      previousWeekQuantity: prevWeekQuantity,
    },
    regions,
    topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    topWarehouses: [...warehouseMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    trend,
  };
}

module.exports = {
  buildMasterReport,
  buildFocusedReport,
  buildFinanceReport,
  buildLogisticsReport,
  buildProcurementReport,
  buildDashboardOverview,
  buildOperationsDashboard,
  buildSalesKpiSummary,
};
