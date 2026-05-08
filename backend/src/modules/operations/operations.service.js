const CompanyDispatchNote = require('../../models/CompanyDispatchNote');
const CompanyInvoiceToDistributor = require('../../models/CompanyInvoiceToDistributor');
const CompanyReceiptFromDistributor = require('../../models/CompanyReceiptFromDistributor');
const DistributorStockReceipt = require('../../models/DistributorStockReceipt');
const SecondaryOrder = require('../../models/SecondaryOrder');
const CustomerInvoice = require('../../models/CustomerInvoice');
const CustomerReceipt = require('../../models/CustomerReceipt');
const Vehicle = require('../../models/Vehicle');
const VehicleTrip = require('../../models/VehicleTrip');
const VehicleAssignment = require('../../models/VehicleAssignment');
const VehicleMaintenance = require('../../models/VehicleMaintenance');
const User = require('../../models/User');
const { asText, getScopedModels, scopedCompanyId } = require('../../services/scopedModels');
function companyIdFrom(req) { return scopedCompanyId(req); }
function userIdFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function roleText(req) { return `${req.user?.role || ''} ${req.user?.roleKey || ''} ${req.user?.portalType || ''}`.toLowerCase(); }
function isDistributor(req) { return roleText(req).includes('distributor'); }
function isCustomer(req) { return roleText(req).includes('customer'); }
function distributorIdFrom(req) { return asText(req.query.distributorId || req.user?.distributorId || req.user?.uid || req.user?._id || req.user?.userId); }
function customerIdFrom(req) { return asText(req.query.customerId || req.user?.customerId || req.user?.uid || req.user?._id || req.user?.userId); }
function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0); }
async function scoped(req) { return getScopedModels(req, { CompanyDispatchNoteModel: CompanyDispatchNote, CompanyInvoiceModel: CompanyInvoiceToDistributor, CompanyReceiptModel: CompanyReceiptFromDistributor, DistributorStockReceiptModel: DistributorStockReceipt, SecondaryOrderModel: SecondaryOrder, CustomerInvoiceModel: CustomerInvoice, CustomerReceiptModel: CustomerReceipt, VehicleModel: Vehicle, VehicleTripModel: VehicleTrip, VehicleAssignmentModel: VehicleAssignment, VehicleMaintenanceModel: VehicleMaintenance, UserModel: User }); }
function scopedCustomerFilter(req, base = {}) { const filter = { ...base, companyId: companyIdFrom(req) }; if (isCustomer(req)) { const customerId = customerIdFrom(req); filter.$or = [{ 'customer.partyId': customerId }, { customerId }, { ownerId: customerId }, { createdByUserId: customerId }]; } else if (isDistributor(req) || req.query.distributorId) { filter.distributorId = distributorIdFrom(req); } return filter; }
async function overview(req) {
  const { CompanyDispatchNoteModel, CompanyInvoiceModel, CompanyReceiptModel, DistributorStockReceiptModel, SecondaryOrderModel, CustomerInvoiceModel, CustomerReceiptModel, VehicleModel, VehicleTripModel, VehicleAssignmentModel, VehicleMaintenanceModel, UserModel } = await scoped(req);
  const companyId = companyIdFrom(req); const distributorId = isDistributor(req) ? distributorIdFrom(req) : asText(req.query.distributorId); const primaryFilter = distributorId ? { companyId, distributorId } : { companyId }; const secondaryFilter = scopedCustomerFilter(req, distributorId ? { distributorId } : {});
  const [primaryDispatches, distributorInvoices, distributorReceipts, distributorStockReceipts, secondaryOrders, customerInvoices, customerReceipts, vehicles, trips, assignments, maintenance, fieldUsers] = await Promise.all([
    CompanyDispatchNoteModel.find(primaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    CompanyInvoiceModel.find(primaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    CompanyReceiptModel.find(primaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    DistributorStockReceiptModel.find(primaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    SecondaryOrderModel.find(secondaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    CustomerInvoiceModel.find(secondaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    CustomerReceiptModel.find(secondaryFilter).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    VehicleModel.find({ companyId }).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    VehicleTripModel.find({ companyId }).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    VehicleAssignmentModel.find({ companyId }).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    VehicleMaintenanceModel.find({ companyId }).sort({ date: -1, createdAt: -1 }).limit(50).lean().catch(() => []),
    UserModel.find({ companyId, $or: [{ role: /salesman/i }, { role: /delivery/i }, { portalType: /salesman/i }, { portalType: /delivery/i }, { roleKey: /delivery/i }] }).select('_id userId fullName username role roleKey portalType status mobileNumber phoneNumber').limit(100).lean().catch(() => []),
  ]);
  const openDistributorInvoices = distributorInvoices.filter((row) => Number(row.balanceAmount || 0) > 0); const openCustomerInvoices = customerInvoices.filter((row) => Number(row.balanceAmount || 0) > 0);
  return { scope: { companyId, distributorId: distributorId || null, userId: userIdFrom(req), role: req.user?.role || req.user?.portalType || 'user' }, flows: { primarySales: { title: 'Primary Sales: Company → Distributor', steps: ['Create primary sales order', 'Approve order', 'Create/post company dispatch', 'Generate distributor invoice', 'Post distributor stock receipt', 'Receive distributor payment'], dispatches: primaryDispatches, invoices: distributorInvoices, receipts: distributorReceipts, stockReceipts: distributorStockReceipts }, secondarySales: { title: 'Secondary Sales: Distributor → Customer', steps: ['Create customer order', 'Approve order', 'Deliver + invoice', 'Reduce distributor stock', 'Show invoice to customer', 'Receive customer payment'], orders: secondaryOrders, invoices: customerInvoices, receipts: customerReceipts }, fleetAndTracking: { title: 'Fleet, Delivery & Live Tracking', steps: ['Assign vehicle/driver', 'Start duty/location sharing on mobile', 'Dispatch/delivery appears in portal', 'Track live location', 'Review route playback/history'], vehicles, trips, assignments, maintenance, fieldUsers } }, kpis: { primaryDispatches: primaryDispatches.length, postedPrimaryDispatches: primaryDispatches.filter((row) => row.status === 'posted').length, distributorStockReceiptsPending: distributorStockReceipts.filter((row) => row.status !== 'posted').length, primaryReceivable: sum(openDistributorInvoices, 'balanceAmount'), primaryReceiptTotal: sum(distributorReceipts.filter((row) => row.status === 'posted'), 'amount'), secondaryOrders: secondaryOrders.length, secondaryDeliveriesPending: secondaryOrders.filter((row) => row.dispatchStatus !== 'delivered').length, customerReceivable: sum(openCustomerInvoices, 'balanceAmount'), customerReceiptTotal: sum(customerReceipts.filter((row) => row.status === 'posted'), 'amount'), vehicles: vehicles.length, fieldUsers: fieldUsers.length, maintenanceCost: sum(maintenance, 'cost') } };
}
async function customerPortal(req) { const { CustomerInvoiceModel, CustomerReceiptModel, SecondaryOrderModel } = await scoped(req); const filter = scopedCustomerFilter(req); const [invoices, receipts, orders] = await Promise.all([CustomerInvoiceModel.find(filter).sort({ createdAt: -1 }).limit(100).lean().catch(() => []), CustomerReceiptModel.find(filter).sort({ createdAt: -1 }).limit(100).lean().catch(() => []), SecondaryOrderModel.find(filter).sort({ createdAt: -1 }).limit(50).lean().catch(() => [])]); return { invoices, receipts, orders, kpis: { invoiceTotal: sum(invoices, 'invoiceTotal'), balanceAmount: sum(invoices, 'balanceAmount'), paidAmount: sum(receipts.filter((row) => row.status === 'posted'), 'amount'), openInvoices: invoices.filter((row) => Number(row.balanceAmount || 0) > 0).length } }; }
module.exports = { overview, customerPortal };
