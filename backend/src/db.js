const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) {
    console.warn("⚠️  MONGODB_URI is not set. Starting API without database connection.");
    return false;
  }

  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    return false;
  }
}

module.exports = { connectDB };
