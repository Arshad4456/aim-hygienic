const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const { connectDB } = require("./src/db");
const authRoutes = require("./src/routes/auth");
const adminUsersRoutes = require("./src/routes/adminUsers");
const companiesRouter = require("./src/routes/companies");

const app = express();

app.use(helmet());
app.use(express.json());

//api
app.use("/api/companies", require("./src/routes/companies"));


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
