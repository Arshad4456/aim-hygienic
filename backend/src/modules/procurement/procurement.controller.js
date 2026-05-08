const service = require("./procurement.service");

function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }

async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load procurement overview", 500); } }
async function suppliers(req, res) { try { return ok(res, { suppliers: await service.listSuppliers(req) }); } catch (e) { return fail(res, e, "Unable to load suppliers", 500); } }
async function products(req, res) { try { return ok(res, { products: await service.listProducts(req) }); } catch (e) { return fail(res, e, "Unable to load products", 500); } }
async function warehouses(req, res) { try { return ok(res, { warehouses: await service.listWarehouses(req) }); } catch (e) { return fail(res, e, "Unable to load warehouses", 500); } }
async function createSupplier(req, res) { try { return res.status(201).json({ ok: true, supplier: await service.createSupplier(req) }); } catch (e) { return fail(res, e, "Unable to create supplier"); } }
async function updateSupplier(req, res) { try { return ok(res, { supplier: await service.updateSupplier(req) }); } catch (e) { return fail(res, e, "Unable to update supplier"); } }
async function deleteSupplier(req, res) { try { await service.deleteSupplier(req); return ok(res); } catch (e) { return fail(res, e, "Unable to delete supplier"); } }
async function purchaseOrders(req, res) { try { return ok(res, { purchaseOrders: await service.listPurchaseOrders(req) }); } catch (e) { return fail(res, e, "Unable to load purchase orders", 500); } }
async function createPurchaseOrder(req, res) { try { return res.status(201).json({ ok: true, purchaseOrder: await service.createPurchaseOrder(req) }); } catch (e) { return fail(res, e, "Unable to create purchase order"); } }
async function approvePurchaseOrder(req, res) { try { return ok(res, { purchaseOrder: await service.approvePurchaseOrder(req) }); } catch (e) { return fail(res, e, "Unable to approve purchase order"); } }
async function receivePurchaseOrder(req, res) { try { return ok(res, await service.receivePurchaseOrder(req)); } catch (e) { return fail(res, e, "Unable to create goods receipt"); } }
async function postGoodsReceipt(req, res) { try { return ok(res, await service.postGoodsReceipt(req)); } catch (e) { return fail(res, e, "Unable to post goods receipt"); } }
async function goodsReceipts(req, res) { try { return ok(res, { goodsReceipts: await service.listGoodsReceipts(req) }); } catch (e) { return fail(res, e, "Unable to load goods receipts", 500); } }
async function supplierInvoices(req, res) { try { return ok(res, { invoices: await service.listSupplierInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load supplier invoices", 500); } }
async function supplierPayments(req, res) { try { return ok(res, { payments: await service.listSupplierPayments(req) }); } catch (e) { return fail(res, e, "Unable to load supplier payments", 500); } }
async function paySupplierInvoice(req, res) { try { return ok(res, await service.paySupplierInvoice(req)); } catch (e) { return fail(res, e, "Unable to pay supplier invoice"); } }

module.exports = { overview, suppliers, products, warehouses, createSupplier, updateSupplier, deleteSupplier, purchaseOrders, createPurchaseOrder, approvePurchaseOrder, receivePurchaseOrder, postGoodsReceipt, goodsReceipts, supplierInvoices, supplierPayments, paySupplierInvoice };
