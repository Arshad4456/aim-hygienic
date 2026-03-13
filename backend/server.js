const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const { connectDB } = require("./src/db");
const authRoutes = require("./src/routes/auth");
const adminUsersRoutes = require("./src/routes/adminUsers");
const companiesRouter = require("./src/routes/companies");
const usersRoutes = require("./src/routes/users");
const productsRoutes = require("./src/routes/products");
const inventoryRoutes = require("./src/routes/inventory");
const warehousesRoutes = require("./src/routes/warehouses");
const regionsRoutes = require("./src/routes/regions");
const zonesRoutes = require("./src/routes/zones");
const fieldsRoutes = require("./src/routes/fields");
const areasRoutes = require("./src/routes/areas");
const vehiclesRoutes = require("./src/routes/vehicles");
const messagesRoutes = require("./src/routes/messages");
const expensesRoutes = require("./src/routes/expenses");
const accountsRoutes = require("./src/routes/accounts");
const reportsRoutes = require("./src/routes/reports");
const liveTrackingRoutes = require("./src/routes/liveTracking");
const dashboardRoutes = require("./src/routes/dashboard");
const salesKpiRoutes = require("./src/routes/salesKpi");
const ordersRoutes = require("./src/routes/orders");
const returnsRoutes = require("./src/routes/returns");
const paymentsRoutes = require("./src/routes/payments");
const uploadsRoutes = require("./src/routes/uploads");
const loansRoutes = require("./src/routes/loans");
const receiptsRoutes = require("./src/routes/receipts");
const vehicleManagementRoutes = require("./src/routes/vehicleManagement");
const platformAdminRoutes = require("./src/routes/platformAdmin");
const runtimeDashboardRoutes = require("./src/routes/runtimeDashboard");
const runtimeDocumentsRoutes = require("./src/routes/runtimeDocuments");
const { requireAuth } = require("./src/utils/auth");
const requireActiveCompany = require("./src/middleware/requireActiveCompany");

const app = express();

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "80mb" }));

// CORS for your live domain
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
  : ["https://aimhygienics.com", "https://www.aimhygienics.com", "http://localhost:3000"];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

//api
app.use("/api/companies", companiesRouter);
app.use("/api/users", usersRoutes);
app.use("/api/warehouses", warehousesRoutes);
app.use("/api/regions", regionsRoutes);
app.use("/api/zones", zonesRoutes);
app.use("/api/fields", fieldsRoutes);
app.use("/api/areas", areasRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/expenses", requireAuth, requireActiveCompany, expensesRoutes);
app.use("/api/accounts", requireAuth, requireActiveCompany, accountsRoutes);
app.use("/api/reports", requireAuth, requireActiveCompany, reportsRoutes);
app.use("/api/live-tracking", liveTrackingRoutes);
app.use("/api/dashboard", requireAuth, requireActiveCompany, dashboardRoutes);
app.use("/api/sales-kpi", requireAuth, requireActiveCompany, salesKpiRoutes);
app.use("/api/orders", requireAuth, requireActiveCompany, ordersRoutes);
app.use("/api/returns", requireAuth, requireActiveCompany, returnsRoutes);
app.use("/api/payments", requireAuth, requireActiveCompany, paymentsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/loans", requireAuth, requireActiveCompany, loansRoutes);
app.use("/api/receipts", requireAuth, requireActiveCompany, receiptsRoutes);
app.use("/api/vehicle-management", requireAuth, requireActiveCompany, vehicleManagementRoutes);
app.use("/api/platform-admin", platformAdminRoutes);
app.use("/api/runtime", requireAuth, requireActiveCompany, runtimeDashboardRoutes);
app.use("/api/runtime", requireAuth, requireActiveCompany, runtimeDocumentsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "aim-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});

connectDB(process.env.MONGODB_URI);