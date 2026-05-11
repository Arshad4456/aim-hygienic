const mongoose = require("mongoose");

const JournalEntryLineSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "ChartAccount" },
    accountCode: { type: String, trim: true, required: true },
    accountName: { type: String, trim: true, required: true },
    accountType: { type: String, trim: true, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: { type: String, trim: true },
  },
  { _id: false }
);

const JournalEntrySchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    entryDate: { type: Date, default: Date.now, index: true },
    sourceType: { type: String, trim: true, default: "manual" },
    sourceId: { type: String, trim: true },
    memo: { type: String, trim: true },
    status: { type: String, enum: ["draft", "posted", "reversed"], default: "draft", index: true },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    lines: { type: [JournalEntryLineSchema], default: [] },
    attachmentUrl: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    postedBy: { type: String, trim: true },
    postedAt: Date,
    reversedBy: { type: String, trim: true },
    reversedAt: Date,
  },
  { timestamps: true }
);

JournalEntrySchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
JournalEntrySchema.index({ companyId: 1, status: 1, entryDate: -1 });

module.exports = mongoose.models.JournalEntry || mongoose.model("JournalEntry", JournalEntrySchema);
