# aim-hygienic 

```
aim-hygienic
├─ backend
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ server.js
│  └─ src
│     ├─ db.js
│     ├─ docs
│     │  └─ admin-modules.md
│     ├─ middleware
│     ├─ models
│     │  ├─ Account.js
│     │  ├─ AccountAuditLog.js
│     │  ├─ AccountTransaction.js
│     │  ├─ Area.js
│     │  ├─ Company.js
│     │  ├─ Expense.js
│     │  ├─ Field.js
│     │  ├─ InventoryMovement.js
│     │  ├─ Loan.js
│     │  ├─ LoanPayment.js
│     │  ├─ Message.js
│     │  ├─ PrimaryPayment.js
│     │  ├─ Product.js
│     │  ├─ Receipt.js
│     │  ├─ Region.js
│     │  ├─ ReturnClaim.js
│     │  ├─ SalesOrder.js
│     │  ├─ SecondaryPayment.js
│     │  ├─ StockTransfer.js
│     │  ├─ User.js
│     │  ├─ Vehicle.js
│     │  ├─ VehicleAssignment.js
│     │  ├─ VehicleMaintenance.js
│     │  ├─ VehicleRefuel.js
│     │  ├─ VehicleTrip.js
│     │  ├─ Warehouse.js
│     │  ├─ WarehouseTransaction.js
│     │  └─ Zone.js
│     ├─ routes
│     │  ├─ accounts.js
│     │  ├─ adminUsers.js
│     │  ├─ areas.js
│     │  ├─ auth.js
│     │  ├─ companies.js
│     │  ├─ dashboard.js
│     │  ├─ expenses.js
│     │  ├─ fields.js
│     │  ├─ inventory.js
│     │  ├─ liveTracking.js
│     │  ├─ loans.js
│     │  ├─ messages.js
│     │  ├─ orders.js
│     │  ├─ payments.js
│     │  ├─ products.js
│     │  ├─ receipts.js
│     │  ├─ regions.js
│     │  ├─ reports.js
│     │  ├─ returns.js
│     │  ├─ salesKpi.js
│     │  ├─ uploads.js
│     │  ├─ users.js
│     │  ├─ vehicleManagement.js
│     │  ├─ vehicles.js
│     │  ├─ warehouses.js
│     │  └─ zones.js
│     └─ utils
│        ├─ auth.js
│        ├─ password.js
│        └─ passwordHash.js
├─ frontend
│  ├─ .env.production
│  ├─ app
│  │  ├─ dashboards
│  │  │  ├─ accountOfficer
│  │  │  │  └─ page.js
│  │  │  ├─ admin
│  │  │  │  ├─ account
│  │  │  │  │  ├─ loan-detail
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ manage
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ areas
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ assets
│  │  │  │  │  └─ vehicles
│  │  │  │  │     ├─ add
│  │  │  │  │     │  └─ page.js
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ companies
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ components
│  │  │  │  │  ├─ AdminShell.js
│  │  │  │  │  ├─ Sidebar.js
│  │  │  │  │  └─ VehicleMasterForm.js
│  │  │  │  ├─ expense
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ distributor
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  └─ personal
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ fields
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ finance
│  │  │  │  │  ├─ aging
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ invoices
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  ├─ payments
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ receipts
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ hr
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ inventory
│  │  │  │  │  ├─ ledger
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ low-stock
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ summary
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ transfers
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ warehouses
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ live-tracking
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ logistics
│  │  │  │  │  ├─ dispatch.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  └─ routes
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ messages
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ operations
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ order-management
│  │  │  │  │  ├─ approvals
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ dispatch
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  ├─ returns
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ sales-orders
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ page.js
│  │  │  │  ├─ procurement
│  │  │  │  │  ├─ grn
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  ├─ payments
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ purchase-orders
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ suppliers
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ products
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ barcodes
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  └─ price-change
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ quality
│  │  │  │  │  ├─ final-release
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ finished-goods
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  ├─ production
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ raw-material
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ regions
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ reports
│  │  │  │  │  ├─ compliance
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ finance
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ hr
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ inventory
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ logistics
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  └─ sales
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ sales-kpi
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ settings
│  │  │  │  │  ├─ change-password
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ users
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  └─ roleConfig.js
│  │  │  │  ├─ vehicle-management
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ components
│  │  │  │  │  │  └─ ToastStick.js
│  │  │  │  │  ├─ fuel-management
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ maintenance
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  ├─ page.js
│  │  │  │  │  └─ vehicles
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ warehouse-inventory
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ warehouses
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ zones
│  │  │  │  │  ├─ add
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ page.js
│  │  │  │  └─ [...slug]
│  │  │  │     └─ page.js
│  │  │  ├─ brandManager
│  │  │  │  ├─ messages
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ page.js
│  │  │  │  ├─ primary-order-request
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ return-stock
│  │  │  │  │  └─ page.js
│  │  │  │  └─ settings
│  │  │  │     ├─ change-password
│  │  │  │     │  └─ page.js
│  │  │  │     └─ page.js
│  │  │  ├─ cashier
│  │  │  │  └─ page.js
│  │  │  ├─ ceo
│  │  │  │  └─ page.js
│  │  │  ├─ components
│  │  │  │  ├─ DistributorPaymentsModule.js
│  │  │  │  ├─ DistributorSecondaryOrdersModule.js
│  │  │  │  ├─ PrimaryOrderRequestModule.js
│  │  │  │  ├─ ReceiptCenter.js
│  │  │  │  ├─ ReturnStockRequestModule.js
│  │  │  │  ├─ SalesmanDeliveriesModule.js
│  │  │  │  ├─ SecondaryOrderRequestModule.js
│  │  │  │  ├─ UserChangePasswordView.js
│  │  │  │  ├─ userDashboardShell.js
│  │  │  │  ├─ UserMessagesView.js
│  │  │  │  ├─ UserOrderCenter.js
│  │  │  │  └─ UserSettingsView.js
│  │  │  ├─ customer
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ page.js
│  │  │  │  ├─ receipts
│  │  │  │  │  └─ page.js
│  │  │  │  └─ settings
│  │  │  │     ├─ change-password
│  │  │  │     │  └─ page.js
│  │  │  │     └─ page.js
│  │  │  ├─ deliveryBoy
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  └─ page.js
│  │  │  ├─ distributor
│  │  │  │  ├─ expense
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ messages
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ page.js
│  │  │  │  ├─ payments
│  │  │  │  │  ├─ page.js
│  │  │  │  │  ├─ primary
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ secondary
│  │  │  │  │     └─ page.js
│  │  │  │  ├─ primary-order-request
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ receipts
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ return-stock
│  │  │  │  │  └─ page.js
│  │  │  │  └─ settings
│  │  │  │     ├─ change-password
│  │  │  │     │  └─ page.js
│  │  │  │     └─ page.js
│  │  │  ├─ fieldSM
│  │  │  │  └─ page.js
│  │  │  ├─ hrAssistant
│  │  │  │  └─ page.js
│  │  │  ├─ kpo
│  │  │  │  └─ page.js
│  │  │  ├─ manageDirector
│  │  │  │  └─ page.js
│  │  │  ├─ nationalSM
│  │  │  │  └─ page.js
│  │  │  ├─ orderBooker
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ page.js
│  │  │  │  └─ receipts
│  │  │  │     └─ page.js
│  │  │  ├─ regionalSM
│  │  │  │  └─ page.js
│  │  │  ├─ salesman
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  └─ page.js
│  │  │  ├─ searchItems.js
│  │  │  ├─ territorySM
│  │  │  │  └─ page.js
│  │  │  ├─ warehouseManager
│  │  │  │  ├─ order-management
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ orders
│  │  │  │  │  └─ page.js
│  │  │  │  ├─ page.js
│  │  │  │  ├─ payments
│  │  │  │  │  ├─ page.js
│  │  │  │  │  ├─ primary
│  │  │  │  │  │  └─ page.js
│  │  │  │  │  └─ secondary
│  │  │  │  │     └─ page.js
│  │  │  │  └─ warehouse-inventory
│  │  │  │     └─ page.js
│  │  │  └─ zoneSM
│  │  │     └─ page.js
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.js
│  │  ├─ lib
│  │  │  ├─ api.js
│  │  │  ├─ auth.js
│  │  │  ├─ clientAuth.js
│  │  │  └─ fieldApi.js
│  │  ├─ login
│  │  │  └─ page.js
│  │  └─ page.js
│  ├─ eslint.config.mjs
│  ├─ jsconfig.json
│  ├─ next.config.mjs
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ next.svg
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  └─ README.md
├─ mobile
│  ├─ .expo
│  │  ├─ devices.json
│  │  └─ README.md
│  ├─ app.config.js
│  ├─ App.js
│  ├─ assets
│  │  ├─ icon.png
│  │  └─ splash.png
│  ├─ babel.config.js
│  ├─ eas.json
│  ├─ index.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ README.md
│  └─ src
│     ├─ components
│     │  └─ ScreenContainer.js
│     ├─ config
│     │  └─ api.js
│     ├─ context
│     │  └─ AuthContext.js
│     ├─ hooks
│     │  └─ useAuth.js
│     ├─ navigation
│     │  └─ RootNavigator.js
│     ├─ screens
│     │  ├─ DashboardScreen.js
│     │  └─ LoginScreen.js
│     └─ utils
│        └─ theme.js
└─ README.md

```