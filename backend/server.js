const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
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

const app = express();

app.use(helmet());
app.use(express.json());

//api
app.use("/api/companies", companiesRouter);
app.use("/api/users", usersRoutes);
app.use("/api/warehouses", warehousesRoutes);
app.use("/api/regions", regionsRoutes);
app.use("/api/zones", zonesRoutes);
app.use("/api/areas", areasRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/live-tracking", liveTrackingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sales-kpi", salesKpiRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/returns", returnsRoutes);

// CORS for your live domain
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["https://aimhygienics.com"],
    credentials: true,
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "aim-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log("Backend running on port", PORT));
})();
