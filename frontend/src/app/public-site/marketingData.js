import { BRAND_CONFIG } from "@/src/app/config/brand";

const whatsappDigits = BRAND_CONFIG.whatsappNumber.replace(/[^0-9]/g, "");
export const whatsappLink = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "#";
export const mailLink = `mailto:${BRAND_CONFIG.salesEmail}`;

export const publicNav = [
  { label: "Features", href: "/features" },
  { label: "Modules", href: "/modules" },
  { label: "Pricing", href: "/pricing" },
  { label: "Book Demo", href: "/book-demo" },
  { label: "Contact", href: "/contact" },
];

export const heroStats = [
  { label: "Web + Mobile", value: "2 Apps" },
  { label: "Secure Access", value: "Roles" },
  { label: "Documents", value: "Cloud" },
  { label: "Reports", value: "Live" },
];

export const clientBenefits = [
  "Control sales, purchases, inventory, finance, and delivery from one system",
  "Track proof of delivery, payment proof, invoices, receipts, and business documents",
  "Give every user only the modules and actions they are allowed to use",
  "Use web dashboard for office teams and mobile app for field teams",
  "Run multi-branch, multi-warehouse, and multi-company operations",
  "Export and print documents for customers, suppliers, and internal records",
];

export const coreModules = [
  {
    title: "Dashboard & Business Control",
    description: "A central command center for owners, admins, managers, accountants, warehouse teams, sales teams, and delivery staff.",
    points: ["Live KPIs", "Role-based views", "Branch and warehouse visibility"],
  },
  {
    title: "Sales & Customer Management",
    description: "Manage quotations, orders, invoices, customer receipts, credit balances, returns, and sales team activity.",
    points: ["Customer ledger", "Sales invoices", "Payment collection"],
  },
  {
    title: "Purchase & Supplier Management",
    description: "Control suppliers, purchase orders, goods receiving, supplier invoices, payments, purchase returns, and landed costs.",
    points: ["Supplier ledger", "Purchase workflow", "GRN and invoice matching"],
  },
  {
    title: "Inventory & Warehouse",
    description: "Track stock by warehouse, product, batch, movement, transfer, adjustment, damage, expiry, and dispatch status.",
    points: ["Stock ledger", "Warehouse transfers", "Low stock alerts"],
  },
  {
    title: "Finance & Accounting",
    description: "Record cash/bank transactions, expenses, receipts, payments, journals, ledgers, balances, and financial reports.",
    points: ["Cash and bank", "Ledgers", "Profit/loss reports"],
  },
  {
    title: "Documents, Proofs & Printing",
    description: "Upload and store user documents, customer files, payment proofs, proof of delivery, invoice attachments, and receipt files.",
    points: ["Image/PDF uploads", "Invoice print", "Receipt print"],
  },
];

export const featureGroups = [
  {
    title: "Secure SaaS Platform",
    items: ["Company-wise data separation", "User roles and permissions", "Subscription and module limits", "Audit logs for sensitive actions"],
  },
  {
    title: "Daily Operations",
    items: ["Sales orders", "Purchase orders", "Stock transfers", "Warehouse dispatches", "Returns and damages"],
  },
  {
    title: "Field & Delivery Teams",
    items: ["Mobile access", "Live tracking ready", "Proof of delivery upload", "Payment proof upload", "Delivery status updates"],
  },
  {
    title: "Business Documents",
    items: ["Invoices", "Receipts", "Payment vouchers", "Supplier bills", "Delivery challans", "PDF/Image attachments"],
  },
];

export const moduleSections = [
  {
    title: "Master Data",
    description: "The foundation records that keep business transactions clean and consistent.",
    modules: ["Companies", "Branches", "Warehouses", "Customers", "Suppliers", "Products", "Categories", "Units", "Taxes", "Price lists"],
  },
  {
    title: "Sales Cycle",
    description: "From customer demand to delivery, billing, receipt, and reporting.",
    modules: ["Quotations", "Sales orders", "Delivery challans", "Sales invoices", "Customer receipts", "Sales returns", "Credit limits", "Customer ledger"],
  },
  {
    title: "Purchase Cycle",
    description: "From supplier order to goods receipt, supplier invoice, and payment.",
    modules: ["Purchase requests", "Purchase orders", "Goods receipt note", "Supplier invoices", "Supplier payments", "Purchase returns", "Landed cost"],
  },
  {
    title: "Inventory & Warehouse",
    description: "Accurate stock movement with warehouse and product-level visibility.",
    modules: ["Stock ledger", "Stock summary", "Stock transfer", "Stock adjustment", "Batch/serial tracking", "Low stock alerts", "Damage/expiry"],
  },
  {
    title: "Finance",
    description: "Accounting and cash/bank control for real business decisions.",
    modules: ["Chart of accounts", "Journal entries", "Cash/bank", "Receipts", "Payments", "Expenses", "Trial balance", "Profit & loss", "Balance sheet"],
  },
  {
    title: "Admin & Reports",
    description: "Control users, permissions, subscriptions, module access, and business insights.",
    modules: ["Users", "Roles", "Permissions", "ERP templates", "Reports", "Audit logs", "Settings", "Notifications"],
  },
];

export const documentFeatures = [
  ["Proof of Delivery", "Upload delivery images or PDFs after dispatch completion."],
  ["Payment Proof", "Attach bank slips, screenshots, cheque images, or cash collection proof."],
  ["User Documents", "Store employee, customer, supplier, company, and contract documents."],
  ["Invoice & Receipt Print", "Print clean invoices, receipts, payment vouchers, and delivery documents."],
];

export const platformHighlights = [
  "Web portal and mobile application",
  "MongoDB Atlas compatible backend",
  "Cloudflare R2 document/image storage ready",
  "Invoice and receipt printing",
  "Role and permission based access",
  "Multi-company, branch, and warehouse support",
  "Sales, purchase, inventory, finance, and reports",
  "Document uploads for POD, payments, users, invoices, and receipts",
];

export const pricingPlans = [
  {
    name: "Starter ERP",
    price: "Contact for Quote",
    description: "For small teams that need sales, purchases, inventory, finance, reports, and basic document handling.",
    features: ["Core ERP modules", "Users and roles", "Customer/supplier ledgers", "Invoice and receipt print", "Email/WhatsApp support"],
  },
  {
    name: "Business ERP",
    price: "Contact for Quote",
    description: "For growing businesses with branches, warehouses, sales teams, delivery staff, approvals, and cloud document storage.",
    features: ["Multi-branch and multi-warehouse", "Mobile user access", "Proof of delivery uploads", "Payment proof uploads", "Advanced reports"],
    featured: true,
  },
  {
    name: "Enterprise ERP",
    price: "Custom Implementation",
    description: "For companies that need custom workflows, integrations, industry modules, advanced permissions, and deployment support.",
    features: ["Custom modules", "Workflow and approval setup", "API integrations", "Dedicated deployment support", "Priority maintenance"],
  },
];

export const demoFormFields = [
  "Company name",
  "Contact person",
  "Mobile/WhatsApp number",
  "Email address",
  "Business type",
  "Required modules",
  "Number of users",
  "Branches and warehouses",
  "Current software problems",
];

export const contactMethods = [
  { label: "Email", value: BRAND_CONFIG.salesEmail, href: mailLink },
  { label: "WhatsApp", value: BRAND_CONFIG.whatsappNumber, href: whatsappLink },
  { label: "Mobile", value: BRAND_CONFIG.phoneNumber || BRAND_CONFIG.whatsappNumber, href: `tel:${BRAND_CONFIG.phoneNumber || BRAND_CONFIG.whatsappNumber}` },
  { label: "Product", value: BRAND_CONFIG.name, href: "/" },
];

export const industrySolutions = [
  { slug: "custom-erp", name: "Custom ERP", summary: "Configurable ERP for unique forms, workflows, approvals, custom fields, reports, and modules.", modules: ["Custom fields", "Workflow builder", "Approval rules", "Dynamic reports", "Document templates"], workflow: "Business requirement → module setup → approvals → reports" },
  { slug: "distribution-erp", name: "Distribution ERP", summary: "Supplier to company to distributor to customer flow with sales, warehouse, delivery, and collections.", modules: ["Primary sales", "Secondary sales", "Territory", "Fleet", "Distributor ledger"], workflow: "Supplier → Warehouse → Distributor → Customer → Collection" },
  { slug: "manufacturing-erp", name: "Manufacturing ERP", summary: "Raw material, production planning, work orders, quality, finished goods, costing, and sales-ready inventory.", modules: ["BOM", "Production plan", "Work orders", "Quality check", "Scrap/wastage"], workflow: "Order → BOM → material issue → production → quality → finished goods" },
  { slug: "retail-pos-erp", name: "Retail POS ERP", summary: "Fast billing, barcode sales, cashier shifts, branch stock, promotions, loyalty, returns, and receipts.", modules: ["POS billing", "Barcode", "Cashier shift", "Receipt print", "Returns"], workflow: "Store stock → POS sale → receipt print → closing → accounts" },
  { slug: "service-erp", name: "Service ERP", summary: "Tickets, service orders, technician assignment, SLA, AMC contracts, spare parts, warranties, and invoicing.", modules: ["Tickets", "SLA", "AMC", "Technician scheduling", "Service invoice"], workflow: "Request → ticket → assignment → service proof → invoice" },
  { slug: "trading-erp", name: "Trading ERP", summary: "Buy-and-sell ERP with import/export, LC, shipment, landed cost, multi-currency, inventory, and margin reports.", modules: ["Import/export", "LC", "Shipment", "Landed cost", "Multi-currency"], workflow: "Purchase/import → landed cost → stock → sale/export → margin" },
];
