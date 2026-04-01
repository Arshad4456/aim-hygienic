export function formatNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : "—";
}

export function formatCurrency(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `₨ ${num.toLocaleString()}` : "—";
}

export function formatValue(value, format) {
  if (format === "currency") return formatCurrency(value);
  return formatNumber(value);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

export function shortDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
}

export function toneClasses(tone = "zinc") {
  switch (tone) {
    case "emerald":
      return { chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
    case "sky":
      return { chip: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-500" };
    case "amber":
      return { chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" };
    case "rose":
      return { chip: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" };
    case "violet":
      return { chip: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" };
    default:
      return { chip: "border-zinc-200 bg-zinc-50 text-zinc-700", dot: "bg-zinc-400" };
  }
}

export const SECTION_META = {
  sales: {
    title: "Sales & Order Intelligence",
    subtitle: "Order movement, region performance, sale types, and recent commercial activity.",
    endpoint: "/reports/sales",
    metrics: (report) => {
      const totalOrders = (report.regions || []).reduce((sum, row) => sum + Number(row.orders || 0), 0);
      const totalValue = (report.regions || []).reduce((sum, row) => sum + Number(row.value || 0), 0);
      return [
        { label: "Orders", value: totalOrders },
        { label: "Sales value", value: totalValue, format: "currency" },
        { label: "Coverage buckets", value: report.regions?.length || 0 },
        { label: "Recent orders", value: report.recentOrders?.length || 0 },
      ];
    },
    panels: [
      {
        key: "regions",
        title: "Coverage performance",
        columns: ["Region / Territory", "Orders", "Items", "Value", "Last movement"],
        rows: (report) => (report.regions || []).map((row) => [row.region, formatNumber(row.orders), formatNumber(row.quantity), formatCurrency(row.value), shortDate(row.lastMovementAt)]),
      },
      {
        key: "statuses",
        title: "Order status mix",
        columns: ["Status", "Count", "Value"],
        rows: (report) => (report.statuses || []).map((row) => [row.status, formatNumber(row.count), formatCurrency(row.value)]),
      },
      {
        key: "recentOrders",
        title: "Recent orders",
        columns: ["Order No", "Customer", "Sale Type", "Status", "Amount", "Created"],
        rows: (report) => (report.recentOrders || []).map((row) => [row.orderNo, row.customerName, row.saleType, row.status, formatCurrency(row.totalAmount), formatDateTime(row.createdAt)]),
      },
    ],
  },
  inventory: {
    title: "Inventory & Warehouse Health",
    subtitle: "Movement intensity, warehouse balance, and stock control posture.",
    endpoint: "/reports/inventory",
    metrics: (report) => {
      const onHand = (report.warehouses || []).reduce((sum, row) => sum + Number(row.onHand || 0), 0);
      const moves = (report.warehouses || []).reduce((sum, row) => sum + Number(row.movementCount || 0), 0);
      return [
        { label: "Products", value: report.totalProducts || 0 },
        { label: "Warehouses", value: report.warehouses?.length || 0 },
        { label: "On hand units", value: onHand },
        { label: "Movements", value: moves },
      ];
    },
    panels: [
      {
        key: "warehouses",
        title: "Warehouse balance",
        columns: ["Warehouse", "On hand", "Inbound", "Outbound", "Movements", "Last movement"],
        rows: (report) => (report.warehouses || []).map((row) => [row.warehouse, formatNumber(row.onHand), formatNumber(row.inQty), formatNumber(row.outQty), formatNumber(row.movementCount), shortDate(row.lastMovementAt)]),
      },
      {
        key: "movementTypes",
        title: "Movement type mix",
        columns: ["Movement type", "Count", "Quantity"],
        rows: (report) => (report.movementTypes || []).map((row) => [row.type, formatNumber(row.count), formatNumber(row.quantity)]),
      },
    ],
  },
  finance: {
    title: "Finance, Collections & Liquidity",
    subtitle: "Expense discipline, collections quality, account positions, and payment exposure.",
    endpoint: "/reports/finance",
    metrics: (report) => [
      { label: "Total expenses", value: report.totals?.totalExpenses || 0, format: "currency" },
      { label: "Approved expenses", value: report.totals?.approvedExpenses || 0, format: "currency" },
      { label: "Outstanding primary", value: report.totals?.outstandingPrimaryPayments || 0, format: "currency" },
      { label: "Paid back", value: report.totals?.paidBackAmount || 0, format: "currency" },
    ],
    panels: [
      {
        key: "expensesByCategory",
        title: "Expense categories",
        columns: ["Category", "Count", "Amount"],
        rows: (report) => (report.expensesByCategory || []).map((row) => [row.category, formatNumber(row.count), formatCurrency(row.total)]),
      },
      {
        key: "receiptStatuses",
        title: "Receipt workflow",
        columns: ["Status", "Count", "Amount"],
        rows: (report) => (report.receiptStatuses || []).map((row) => [row.status, formatNumber(row.count), formatCurrency(row.amount)]),
      },
      {
        key: "accounts",
        title: "Account balances",
        columns: ["Account", "Type", "Currency", "Balance"],
        rows: (report) => (report.accounts || []).map((row) => [row.accountName, row.accountType, row.currency || "PKR", formatNumber(row.currentBalance)]),
      },
    ],
  },
  hr: {
    title: "People, Roles & Productivity",
    subtitle: "Headcount spread, active workforce, and field team coverage.",
    endpoint: "/reports/hr",
    metrics: (report) => {
      const active = (report.statusCounts || []).find((row) => String(row.status).toLowerCase() === "active")?.count || 0;
      return [
        { label: "Total users", value: report.totalUsers || 0 },
        { label: "Active users", value: active },
        { label: "Role groups", value: report.roleCounts?.length || 0 },
        { label: "Coverage areas", value: report.areaCounts?.length || 0 },
      ];
    },
    panels: [
      {
        key: "roleCounts",
        title: "Role distribution",
        columns: ["Role", "Headcount"],
        rows: (report) => (report.roleCounts || []).map((row) => [row.role, formatNumber(row.count)]),
      },
      {
        key: "statusCounts",
        title: "User status",
        columns: ["Status", "Count"],
        rows: (report) => (report.statusCounts || []).map((row) => [row.status, formatNumber(row.count)]),
      },
      {
        key: "areaCounts",
        title: "Coverage distribution",
        columns: ["Region / Territory", "Count"],
        rows: (report) => (report.areaCounts || []).map((row) => [row.area, formatNumber(row.count)]),
      },
    ],
  },
  logistics: {
    title: "Logistics & Delivery Control",
    subtitle: "Transfer pipeline, operational velocity, and fleet support picture.",
    endpoint: "/reports/logistics",
    metrics: (report) => [
      { label: "Vehicles", value: report.vehicleCount || 0 },
      { label: "Status buckets", value: report.transferCounts?.length || 0 },
      { label: "Open pipeline", value: (report.transferCounts || []).filter((row) => !String(row.status || "").toLowerCase().includes("completed") && !String(row.status || "").toLowerCase().includes("delivered")).reduce((sum, row) => sum + Number(row.count || 0), 0) },
      { label: "Closed pipeline", value: (report.transferCounts || []).filter((row) => ["completed", "delivered"].includes(String(row.status || "").toLowerCase())).reduce((sum, row) => sum + Number(row.count || 0), 0) },
    ],
    panels: [
      {
        key: "transferCounts",
        title: "Operational status flow",
        columns: ["Status", "Count"],
        rows: (report) => (report.transferCounts || []).map((row) => [row.status, formatNumber(row.count)]),
      },
    ],
  },
  compliance: {
    title: "Compliance, Returns & Audit Signals",
    subtitle: "Control exceptions, returns pressure, and signals that need review.",
    endpoint: "/reports/compliance",
    metrics: (report) => [
      { label: "Adjustments", value: report.adjustmentCount || 0 },
      { label: "Returns", value: report.returnCount || 0 },
      { label: "Messages", value: report.messageCount || 0 },
      { label: "Rejected orders", value: report.rejectedOrders || 0 },
    ],
    panels: [
      {
        key: "signals",
        title: "Control signals",
        columns: ["Signal", "Count"],
        rows: (report) => [
          ["Inventory adjustments", formatNumber(report.adjustmentCount)],
          ["Return claims", formatNumber(report.returnCount)],
          ["Messages", formatNumber(report.messageCount)],
          ["Rejected orders", formatNumber(report.rejectedOrders)],
        ],
      },
    ],
  },
  procurement: {
    title: "Procurement & Supplier Intelligence",
    subtitle: "Supplier network strength, inbound momentum, and receipt throughput.",
    endpoint: "/reports/procurement",
    metrics: (report) => [
      { label: "Suppliers", value: report.kpis?.totalSuppliers || 0 },
      { label: "Active suppliers", value: report.kpis?.activeSuppliers || 0 },
      { label: "Receipts", value: report.kpis?.totalReceipts || 0 },
      { label: "Inbound quantity", value: report.kpis?.totalQuantity || 0 },
    ],
    panels: [
      {
        key: "inboundTrend",
        title: "7-day inbound trend",
        columns: ["Day", "Receipts", "Quantity"],
        rows: (report) => (report.inboundTrend || []).map((row) => [row.label, formatNumber(row.count), formatNumber(row.quantity)]),
      },
      {
        key: "recentPurchases",
        title: "Recent inbound records",
        columns: ["Product", "Warehouse", "Quantity", "Created"],
        rows: (report) => (report.recentPurchases || []).map((row) => [row.productName, row.warehouseName, formatNumber(row.quantity), formatDateTime(row.createdAt)]),
      },
    ],
  },
};