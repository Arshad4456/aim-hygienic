/* eslint-disable no-console */
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config();

const { connectDB } = require("../src/db");
const DocumentTemplatePreset = require("../src/models/DocumentTemplatePreset");

const presets = [
  {
    documentType: "invoice",
    templateCode: "invoice_standard",
    templateName: "Standard Invoice",
    description: "Default invoice layout",
    layoutVariant: "standard",
    styleConfig: {
      headerAlignment: "left",
      showLogo: true,
      showCompanyAddress: true,
      showPhone: true,
      showEmail: true,
      primaryColor: "#10b981",
      accentColor: "#0f172a",
      tableStyle: "bordered",
      fontScale: "normal",
    },
    headerConfig: {
      title: "Invoice",
      subtitle: "Tax Invoice",
      customText: "Thank you for your business",
    },
    footerConfig: {
      customText: "This is a system generated document.",
      showSignatureLine: true,
      showStampArea: true,
      showTerms: true,
      termsText: "Goods once sold are not returnable.",
    },
  },
  {
    documentType: "invoice",
    templateCode: "invoice_compact",
    templateName: "Compact Invoice",
    description: "Compact invoice layout for quick print",
    layoutVariant: "compact",
    styleConfig: {
      headerAlignment: "center",
      showLogo: true,
      showCompanyAddress: false,
      showPhone: true,
      showEmail: false,
      primaryColor: "#2563eb",
      accentColor: "#111827",
      tableStyle: "minimal",
      fontScale: "small",
    },
    headerConfig: {
      title: "Invoice",
      subtitle: "Compact",
      customText: "Quick issue invoice",
    },
    footerConfig: {
      customText: "System generated",
      showSignatureLine: false,
      showStampArea: false,
      showTerms: true,
      termsText: "Payment due on receipt.",
    },
  },
  {
    documentType: "receipt",
    templateCode: "receipt_standard",
    templateName: "Standard Receipt",
    description: "Default payment receipt layout",
    layoutVariant: "standard",
    styleConfig: {
      headerAlignment: "left",
      showLogo: true,
      showCompanyAddress: true,
      showPhone: true,
      showEmail: true,
      primaryColor: "#10b981",
      accentColor: "#0f172a",
      tableStyle: "bordered",
      fontScale: "normal",
    },
    headerConfig: {
      title: "Receipt",
      subtitle: "Payment Receipt",
      customText: "Received with thanks",
    },
    footerConfig: {
      customText: "This is a system generated receipt.",
      showSignatureLine: true,
      showStampArea: true,
      showTerms: false,
      termsText: "",
    },
  },
  {
    documentType: "receipt",
    templateCode: "receipt_compact",
    templateName: "Compact Receipt",
    description: "Compact receipt layout",
    layoutVariant: "compact",
    styleConfig: {
      headerAlignment: "center",
      showLogo: false,
      showCompanyAddress: false,
      showPhone: true,
      showEmail: false,
      primaryColor: "#14b8a6",
      accentColor: "#111827",
      tableStyle: "minimal",
      fontScale: "small",
    },
    headerConfig: {
      title: "Receipt",
      subtitle: "Compact",
      customText: "Thank you",
    },
    footerConfig: {
      customText: "Keep this receipt for your record.",
      showSignatureLine: false,
      showStampArea: false,
      showTerms: false,
      termsText: "",
    },
  },
];

async function run() {
  await connectDB(process.env.MONGODB_URI);

  let upserted = 0;
  for (const preset of presets) {
    await DocumentTemplatePreset.findOneAndUpdate(
      { templateCode: preset.templateCode },
      { $set: { ...preset, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  console.log(`Seeded ${upserted} document template presets.`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Failed to seed document template presets", error);
  process.exit(1);
});
