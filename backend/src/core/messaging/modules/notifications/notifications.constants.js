const MODULE_KEY = "notifications";
const CHANNELS = ["in_app", "push", "sms", "whatsapp", "email"];
const PRIORITIES = ["low", "normal", "high", "critical"];

const EVENT_TEMPLATES = {
  order_approved: {
    module: "sales",
    title: "Order approved",
    body: "An order has been approved and is ready for the next step.",
    channels: ["in_app", "push"],
  },
  dispatch_assigned: {
    module: "logistics",
    title: "Dispatch assigned",
    body: "A dispatch has been assigned to a delivery user or vehicle.",
    channels: ["in_app", "push", "whatsapp"],
  },
  delivery_completed: {
    module: "logistics",
    title: "Delivery completed",
    body: "A delivery has been completed and proof of delivery can be reviewed.",
    channels: ["in_app", "push"],
  },
  invoice_generated: {
    module: "finance",
    title: "Invoice generated",
    body: "A new invoice has been generated in finance.",
    channels: ["in_app", "push", "email"],
  },
  payment_received: {
    module: "finance",
    title: "Payment received",
    body: "A receipt has been posted against an invoice or account.",
    channels: ["in_app", "push", "sms"],
  },
  overdue_invoice: {
    module: "finance",
    title: "Overdue invoice",
    body: "An invoice is overdue and requires follow-up.",
    channels: ["in_app", "push", "sms", "whatsapp"],
  },
  supplier_payment_due: {
    module: "procurement",
    title: "Supplier payment due",
    body: "A supplier payable is due for review or payment.",
    channels: ["in_app", "push", "email"],
  },
  low_balance: {
    module: "finance",
    title: "Low account balance",
    body: "A cash or bank account balance is below the defined threshold.",
    channels: ["in_app", "push"],
  },
  stock_low: {
    module: "inventory",
    title: "Low stock alert",
    body: "A product stock level is below the minimum quantity.",
    channels: ["in_app", "push"],
  },
  return_requested: {
    module: "returns",
    title: "Return requested",
    body: "A return, damage, or expiry request needs review.",
    channels: ["in_app", "push"],
  },
  vehicle_maintenance_due: {
    module: "fleet",
    title: "Vehicle maintenance due",
    body: "A vehicle needs maintenance, permit, token, or fitness review.",
    channels: ["in_app", "push", "whatsapp"],
  },
};

module.exports = { MODULE_KEY, CHANNELS, PRIORITIES, EVENT_TEMPLATES };
