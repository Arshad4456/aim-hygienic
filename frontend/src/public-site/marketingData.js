import { BRAND_CONFIG } from "@/src/config/brand";

export const publicNav = [
  { label: "Features", href: "/features" },
  { label: "Modules", href: "/modules" },
  { label: "Industries", href: "/industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export const coreModules = [
  { title: "SaaS Control Center", description: "Create companies, assign ERP templates, activate subscriptions, enable modules, and control limits from one owner portal.", points: ["Tenant/company setup", "Plans and user limits", "Module access control"] },
  { title: "Finance & Accounting", description: "Receipts, payments, expenses, ledgers, invoices, balances, aging, and reports designed for real operations.", points: ["Invoices and receipts", "Cash/bank tracking", "Ledger and reports"] },
  { title: "Inventory & Warehouse", description: "Stock movement, warehouse transfer, dispatch, goods receiving, low stock checks, valuation, and audit trail.", points: ["Stock ledger", "Warehouse transfers", "Proof attachments"] },
  { title: "Sales & Procurement", description: "Purchase orders, supplier payments, primary sales, secondary sales, returns, customers, and payment collection.", points: ["Orders to invoice", "Supplier flow", "Customer flow"] },
  { title: "Documents & Proofs", description: "Cloudflare R2 ready upload structure for POD images, payment proofs, user documents, invoices, and receipt attachments.", points: ["Image/PDF support", "Public file URLs", "Tenant-scoped storage"] },
  { title: "Reports & Analytics", description: "Role-aware dashboards with sales, inventory, procurement, finance, logistics, and user activity insights.", points: ["KPIs", "Export-ready reports", "Audit visibility"] },
];

export const industrySolutions = [
  { slug: "custom-erp", name: "Custom ERP", summary: "Configurable ERP for unique forms, workflows, approvals, custom fields, reports, and modules.", modules: ["Custom fields", "Workflow builder", "Approval rules", "Dynamic reports", "Document templates"], workflow: "Business requirement → module selection → custom forms → approvals → reports" },
  { slug: "distribution-erp", name: "Distribution ERP", summary: "Supplier to company to distributor to customer flow with primary sales, secondary sales, territories, fleet, and collections.", modules: ["Primary sales", "Secondary sales", "Territory", "Fleet", "Distributor ledger"], workflow: "Supplier → Company warehouse → Distributor → Customer → Collection" },
  { slug: "manufacturing-erp", name: "Manufacturing ERP", summary: "Raw material, BOM, production planning, work orders, quality, finished goods, costing, and sales-ready inventory.", modules: ["BOM", "Production plan", "Work orders", "Quality check", "Scrap/wastage"], workflow: "Forecast/order → BOM → raw material issue → production → quality → finished goods" },
  { slug: "retail-pos-erp", name: "Retail POS ERP", summary: "Fast billing, barcode sales, cashier shifts, branch stock, promotions, loyalty, returns, receipts, and offline-ready POS planning.", modules: ["POS billing", "Barcode", "Cashier shift", "Receipt print", "Returns"], workflow: "Store stock → POS sale → receipt print → closing → accounting" },
  { slug: "service-erp", name: "Service ERP", summary: "Tickets, service orders, technician assignment, SLA, AMC contracts, spare parts, warranties, and service invoicing.", modules: ["Tickets", "SLA", "AMC", "Technician scheduling", "Service invoice"], workflow: "Customer request → ticket → assignment → service proof → invoice → feedback" },
  { slug: "trading-erp", name: "Trading ERP", summary: "Buy-and-sell ERP with import/export, LC, shipment, landed cost, multi-currency, inventory, and margin reports.", modules: ["Import/export", "LC", "Shipment", "Landed cost", "Multi-currency"], workflow: "Purchase/import → landed cost → stock → sale/export → margin report" },
];

export const platformHighlights = ["Multi-company SaaS architecture", "MongoDB Atlas compatible backend", "Cloudflare/R2 file storage ready", "Web portal plus mobile application", "Role and permission driven menus", "Invoice and receipt print-ready flows", "Audit trail for sensitive transactions", "Modular industry templates"];

export const pricingPlans = [
  { name: "Starter", price: "Custom", description: "For small businesses that need accounting, inventory, sales, and purchases.", features: ["1 company", "Core ERP modules", "Basic reports", "Email support"] },
  { name: "Business", price: "Custom", description: "For growing teams that need branches, warehouses, mobile users, and approvals.", features: ["Multi-branch", "Mobile users", "Advanced reports", "Document uploads"], featured: true },
  { name: "Enterprise", price: "Custom", description: "For industry-specific ERP, integrations, advanced permissions, and deployment support.", features: ["Industry templates", "Custom workflows", "API integrations", "Priority support"] },
];

export const contactMethods = [
  { label: "Sales Email", value: BRAND_CONFIG.salesEmail },
  { label: "Support Email", value: BRAND_CONFIG.supportEmail },
  { label: "WhatsApp", value: BRAND_CONFIG.whatsappNumber },
  { label: "Domain", value: BRAND_CONFIG.domain },
];
