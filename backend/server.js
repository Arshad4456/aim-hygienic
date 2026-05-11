const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const { connectDB } = require("./src/db");
const { buildCorsOptions } = require("./src/config/cors");
const { registerRoutes } = require("./src/erp.routes");
const { APP_BRAND } = require("./src/config/brand");
const { createSocketServer } = require("./src/socket/index");
const { registerLocationSocket } = require("./src/erp/logistics/live-tracking/services/socket");
const { validateEnvironment } = require("./src/config/validateEnv");

validateEnvironment();

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "80mb" }));
app.use(cors(buildCorsOptions()));

registerRoutes(app);

const PORT = process.env.PORT || 5000;
const io = createSocketServer(server);
if (io) registerLocationSocket(io);

server.listen(PORT, () => {
  console.log(`${APP_BRAND.name} backend running on port`, PORT);
});

connectDB(process.env.MONGODB_URI);
