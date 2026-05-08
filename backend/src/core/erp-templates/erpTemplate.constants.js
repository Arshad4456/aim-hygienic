const DEFAULT_ERP_TEMPLATES = [
  {
    "key": "distribution_erp",
    "name": "Distribution ERP",
    "description": "Supplier \u2192 Company \u2192 Distributor \u2192 Customer flow with primary and secondary sales.",
    "modules": [
      "companies",
      "users",
      "territory",
      "products",
      "procurement",
      "inventory",
      "warehouse",
      "sales",
      "distribution",
      "customers",
      "finance",
      "expenses",
      "returns",
      "fleet",
      "live_tracking",
      "messages",
      "reports"
    ],
    "defaultRoles": [
      "Company Admin",
      "Sales Manager",
      "Warehouse Manager",
      "Distributor",
      "Order Booker",
      "Salesman",
      "Delivery Boy",
      "Accountant"
    ],
    "mobileRoles": [
      "Salesman",
      "Order Booker",
      "Delivery Boy",
      "Warehouse Manager",
      "Distributor"
    ]
  },
  {
    "key": "trading_erp",
    "name": "Trading ERP",
    "description": "Supplier \u2192 Company \u2192 Customer flow for buy-and-sell businesses.",
    "modules": [
      "companies",
      "users",
      "products",
      "procurement",
      "inventory",
      "warehouse",
      "sales",
      "customers",
      "finance",
      "reports"
    ],
    "defaultRoles": [
      "Company Admin",
      "Purchase Manager",
      "Sales Manager",
      "Warehouse Manager",
      "Accountant"
    ],
    "mobileRoles": [
      "Salesman",
      "Warehouse Manager"
    ]
  },
  {
    "key": "manufacturing_erp",
    "name": "Manufacturing ERP",
    "description": "Raw material, production, finished goods, quality, and sales.",
    "modules": [
      "companies",
      "users",
      "procurement",
      "inventory",
      "warehouse",
      "manufacturing",
      "sales",
      "finance",
      "reports"
    ],
    "defaultRoles": [
      "Company Admin",
      "Production Manager",
      "Quality Manager",
      "Warehouse Manager",
      "Accountant"
    ],
    "mobileRoles": [
      "Warehouse Manager",
      "Production Supervisor"
    ]
  },
  {
    "key": "retail_pos_erp",
    "name": "Retail POS ERP",
    "description": "Supplier \u2192 Store \u2192 Walk-in/customer POS flow.",
    "modules": [
      "companies",
      "users",
      "products",
      "inventory",
      "warehouse",
      "retail-pos",
      "customers",
      "finance",
      "reports"
    ],
    "defaultRoles": [
      "Company Admin",
      "Store Manager",
      "Cashier",
      "Accountant"
    ],
    "mobileRoles": [
      "Store Manager"
    ]
  },
  {
    "key": "service_erp",
    "name": "Service ERP",
    "description": "Client, service team, task, invoice, and payment flow.",
    "modules": [
      "companies",
      "users",
      "customers",
      "projects",
      "tasks",
      "finance",
      "reports"
    ],
    "defaultRoles": [
      "Company Admin",
      "Project Manager",
      "Service Agent",
      "Accountant"
    ],
    "mobileRoles": [
      "Service Agent"
    ]
  },
  {
    "key": "custom_erp",
    "name": "Custom ERP",
    "description": "Super Admin selects modules and role defaults manually.",
    "modules": [],
    "defaultRoles": [
      "Company Admin"
    ],
    "mobileRoles": []
  }
];
module.exports = { DEFAULT_ERP_TEMPLATES };
