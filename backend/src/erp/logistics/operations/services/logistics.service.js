const Vehicle = require("../../fleet/models/Vehicle");
const VehicleAssignment = require("../../fleet/models/VehicleAssignment");
const VehicleTrip = require("../../fleet/models/VehicleTrip");
const VehicleMaintenance = require("../../fleet/models/VehicleMaintenance");
const CompanyDispatchNote = require("../../../distribution/sales/models/CompanyDispatchNote");
const SecondaryOrder = require("../../../distribution/sales/models/SecondaryOrder");
const User = require("../../../platform/users/models/User");
const { asText, getScopedModels, scopedCompanyId } = require("../../../platform/tenancy/services/scopedModels");

function companyIdFrom(req) { return scopedCompanyId(req); }

async function scoped(req) {
  return getScopedModels(req, {
    VehicleModel: Vehicle,
    VehicleAssignmentModel: VehicleAssignment,
    VehicleTripModel: VehicleTrip,
    VehicleMaintenanceModel: VehicleMaintenance,
    CompanyDispatchNoteModel: CompanyDispatchNote,
    SecondaryOrderModel: SecondaryOrder,
    UserModel: User,
  });
}

function normalizeRoleText(user = {}) {
  return `${user.role || ""} ${user.portalType || ""} ${user.roleKey || ""}`.toLowerCase();
}

function roleFilter(req) {
  const companyId = companyIdFrom(req);
  const roleText = normalizeRoleText(req.user || {});
  const distributorId = asText(req.user?.distributorId || req.user?.uid || req.user?._id || req.user?.userId);
  if (roleText.includes("distributor") && distributorId) return { companyId, distributorId };
  if ((roleText.includes("salesman") || roleText.includes("order") || roleText.includes("delivery")) && distributorId) {
    return { companyId, $or: [{ salesmanUserId: distributorId }, { orderBookerUserId: distributorId }, { driverUserId: distributorId }] };
  }
  return { companyId };
}

async function overview(req) {
  const { VehicleModel, VehicleAssignmentModel, VehicleTripModel, VehicleMaintenanceModel, CompanyDispatchNoteModel, SecondaryOrderModel, UserModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const deliveryRoles = [/delivery/i, /driver/i, /salesman/i, /order/i];

  const [vehicles, assignments, trips, maintenance, primaryDispatches, secondaryDeliveries, deliveryUsers] = await Promise.all([
    VehicleModel.find({ companyId }).sort({ createdAt: -1 }).limit(100).lean().catch(() => []),
    VehicleAssignmentModel.find({}).sort({ createdAt: -1 }).limit(100).lean().catch(() => []),
    VehicleTripModel.find({}).sort({ tripDate: -1, createdAt: -1 }).limit(100).lean().catch(() => []),
    VehicleMaintenanceModel.find({}).sort({ date: -1, createdAt: -1 }).limit(100).lean().catch(() => []),
    CompanyDispatchNoteModel.find({ companyId }).sort({ createdAt: -1 }).limit(100).lean().catch(() => []),
    SecondaryOrderModel.find(roleFilter(req)).sort({ createdAt: -1 }).limit(100).lean().catch(() => []),
    UserModel.find({ companyId, $or: deliveryRoles.map((role) => ({ role })) }).select("_id userId fullName username role portalType mobileNumber phoneNumber status").limit(100).lean().catch(() => []),
  ]);

  const postedDispatches = primaryDispatches.filter((row) => row.status === "posted");
  const draftDispatches = primaryDispatches.filter((row) => row.status === "draft");
  const pendingDeliveries = secondaryDeliveries.filter((row) => row.dispatchStatus !== "delivered");
  const delivered = secondaryDeliveries.filter((row) => row.dispatchStatus === "delivered" || row.status === "delivered");

  return {
    vehicles,
    assignments: Array.isArray(assignments) ? assignments : [],
    trips,
    maintenance,
    primaryDispatches,
    secondaryDeliveries,
    deliveryUsers,
    kpis: {
      vehicles: vehicles.length,
      activeVehicles: vehicles.filter((v) => String(v.status || "").toLowerCase() !== "inactive").length,
      draftDispatches: draftDispatches.length,
      postedDispatches: postedDispatches.length,
      pendingDeliveries: pendingDeliveries.length,
      delivered: delivered.length,
      deliveryUsers: deliveryUsers.length,
      maintenanceCost: maintenance.reduce((sum, row) => sum + Number(row.cost || 0), 0),
    },
  };
}

module.exports = { overview };
