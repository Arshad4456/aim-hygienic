const mongoose = require("mongoose");
const NotificationSchema = new mongoose.Schema({ companyId: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, title: String, message: String, module: String, readAt: Date }, { timestamps: true });
module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
