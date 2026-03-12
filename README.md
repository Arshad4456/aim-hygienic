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
│  ├─ .env
│  ├─ .expo
│  │  ├─ devices.json
│  │  ├─ README.md
│  │  └─ settings.json
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
│     ├─ api
│     │  ├─ auth.js
│     │  ├─ client.js
│     │  ├─ endpoints.js
│     │  └─ uploads.js
│     ├─ auth
│     │  ├─ AuthProvider.js
│     │  ├─ storage.js
│     │  └─ useAuth.js
│     ├─ navigation
│     │  ├─ AdminSidebarConfig.js
│     │  ├─ AuthStack.js
│     │  ├─ DrawerNavigator.js
│     │  ├─ moduleMap.json
│     │  ├─ RoleDrawerContent.js
│     │  ├─ RoleMenuConfig.js
│     │  ├─ RootNavigator.js
│     │  └─ ScreenRegistry.js
│     ├─ screens
│     │  ├─ accountOfficer
│     │  │  └─ DashboardScreen.js
│     │  ├─ admin
│     │  │  ├─ account
│     │  │  │  ├─ AccountScreen.js
│     │  │  │  ├─ loan-detail
│     │  │  │  │  └─ LoanDetailScreen.js
│     │  │  │  └─ manage
│     │  │  │     └─ ManageScreen.js
│     │  │  ├─ areas
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  └─ AreasScreen.js
│     │  │  ├─ assets
│     │  │  │  └─ vehicles
│     │  │  │     ├─ add
│     │  │  │     │  └─ AddScreen.js
│     │  │  │     └─ VehiclesScreen.js
│     │  │  ├─ companies
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  └─ CompaniesScreen.js
│     │  │  ├─ DashboardScreen.js
│     │  │  ├─ expense
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  ├─ daily
│     │  │  │  │  └─ DailyScreen.js
│     │  │  │  ├─ distributor
│     │  │  │  │  └─ DistributorScreen.js
│     │  │  │  ├─ ExpenseScreen.js
│     │  │  │  └─ personal
│     │  │  │     └─ PersonalScreen.js
│     │  │  ├─ fields
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  └─ FieldsScreen.js
│     │  │  ├─ finance
│     │  │  │  ├─ aging
│     │  │  │  │  └─ AgingScreen.js
│     │  │  │  ├─ FinanceScreen.js
│     │  │  │  ├─ invoices
│     │  │  │  │  └─ InvoicesScreen.js
│     │  │  │  ├─ payments
│     │  │  │  │  └─ PaymentsScreen.js
│     │  │  │  └─ receipts
│     │  │  │     └─ ReceiptsScreen.js
│     │  │  ├─ hr
│     │  │  │  └─ HrScreen.js
│     │  │  ├─ inventory
│     │  │  │  ├─ components
│     │  │  │  │  └─ InventoryTransactionModule.js
│     │  │  │  ├─ damage-stock
│     │  │  │  │  └─ DamageStockScreen.js
│     │  │  │  ├─ ledger
│     │  │  │  │  └─ LedgerScreen.js
│     │  │  │  ├─ low-stock
│     │  │  │  │  └─ LowStockScreen.js
│     │  │  │  ├─ purchase-stock
│     │  │  │  │  └─ PurchaseStockScreen.js
│     │  │  │  ├─ return-stock
│     │  │  │  │  └─ ReturnStockScreen.js
│     │  │  │  ├─ sale-stock
│     │  │  │  │  └─ SaleStockScreen.js
│     │  │  │  ├─ summary
│     │  │  │  │  └─ SummaryScreen.js
│     │  │  │  ├─ transfers
│     │  │  │  │  └─ TransfersScreen.js
│     │  │  │  └─ warehouses
│     │  │  │     └─ WarehousesScreen.js
│     │  │  ├─ live-tracking
│     │  │  │  └─ LiveTrackingScreen.js
│     │  │  ├─ logistics
│     │  │  │  ├─ LogisticsScreen.js
│     │  │  │  └─ routes
│     │  │  │     └─ RoutesScreen.js
│     │  │  ├─ messages
│     │  │  │  └─ MessagesScreen.js
│     │  │  ├─ operations
│     │  │  │  └─ OperationsScreen.js
│     │  │  ├─ order-management
│     │  │  │  ├─ approvals
│     │  │  │  │  └─ ApprovalsScreen.js
│     │  │  │  ├─ dispatch
│     │  │  │  │  └─ DispatchScreen.js
│     │  │  │  ├─ OrderManagementScreen.js
│     │  │  │  ├─ returns
│     │  │  │  │  └─ ReturnsScreen.js
│     │  │  │  ├─ sales-orders
│     │  │  │  │  └─ SalesOrdersScreen.js
│     │  │  │  └─ secondary-orders
│     │  │  │     └─ SecondaryOrdersScreen.js
│     │  │  ├─ procurement
│     │  │  │  ├─ grn
│     │  │  │  │  └─ GrnScreen.js
│     │  │  │  ├─ payments
│     │  │  │  │  └─ PaymentsScreen.js
│     │  │  │  ├─ ProcurementScreen.js
│     │  │  │  ├─ purchase-orders
│     │  │  │  │  └─ PurchaseOrdersScreen.js
│     │  │  │  └─ suppliers
│     │  │  │     └─ SuppliersScreen.js
│     │  │  ├─ products
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  ├─ barcodes
│     │  │  │  │  └─ BarcodesScreen.js
│     │  │  │  ├─ price-change
│     │  │  │  │  └─ PriceChangeScreen.js
│     │  │  │  ├─ productConstants.js
│     │  │  │  └─ ProductsScreen.js
│     │  │  ├─ quality
│     │  │  │  ├─ final-release
│     │  │  │  │  └─ FinalReleaseScreen.js
│     │  │  │  ├─ finished-goods
│     │  │  │  │  └─ FinishedGoodsScreen.js
│     │  │  │  ├─ production
│     │  │  │  │  └─ ProductionScreen.js
│     │  │  │  ├─ QualityScreen.js
│     │  │  │  └─ raw-material
│     │  │  │     └─ RawMaterialScreen.js
│     │  │  ├─ regions
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  └─ RegionsScreen.js
│     │  │  ├─ reports
│     │  │  │  ├─ compliance
│     │  │  │  │  └─ ComplianceScreen.js
│     │  │  │  ├─ finance
│     │  │  │  │  └─ FinanceScreen.js
│     │  │  │  ├─ hr
│     │  │  │  │  └─ HrScreen.js
│     │  │  │  ├─ inventory
│     │  │  │  │  └─ InventoryScreen.js
│     │  │  │  ├─ logistics
│     │  │  │  │  └─ LogisticsScreen.js
│     │  │  │  ├─ ReportsScreen.js
│     │  │  │  └─ sales
│     │  │  │     └─ SalesScreen.js
│     │  │  ├─ sales-kpi
│     │  │  │  └─ SalesKpiScreen.js
│     │  │  ├─ settings
│     │  │  │  ├─ change-password
│     │  │  │  │  └─ ChangePasswordScreen.js
│     │  │  │  └─ SettingsScreen.js
│     │  │  ├─ users
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  ├─ roleConfig.js
│     │  │  │  └─ UsersScreen.js
│     │  │  ├─ vehicle-management
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  ├─ fuel-management
│     │  │  │  │  └─ FuelManagementScreen.js
│     │  │  │  ├─ maintenance
│     │  │  │  │  └─ MaintenanceScreen.js
│     │  │  │  ├─ VehicleManagementScreen.js
│     │  │  │  └─ vehicles
│     │  │  │     └─ VehiclesScreen.js
│     │  │  ├─ warehouse-inventory
│     │  │  │  └─ WarehouseInventoryScreen.js
│     │  │  ├─ warehouses
│     │  │  │  ├─ add
│     │  │  │  │  └─ AddScreen.js
│     │  │  │  └─ WarehousesScreen.js
│     │  │  └─ zones
│     │  │     ├─ add
│     │  │     │  └─ AddScreen.js
│     │  │     └─ ZonesScreen.js
│     │  ├─ auth
│     │  │  └─ LoginScreen.js
│     │  ├─ brandManager
│     │  │  ├─ DashboardScreen.js
│     │  │  ├─ messages
│     │  │  │  └─ MessagesScreen.js
│     │  │  ├─ orders
│     │  │  │  └─ OrdersScreen.js
│     │  │  ├─ primary-order-request
│     │  │  │  └─ PrimaryOrderRequestScreen.js
│     │  │  ├─ return-stock
│     │  │  │  └─ ReturnStockScreen.js
│     │  │  └─ settings
│     │  │     ├─ change-password
│     │  │     │  └─ ChangePasswordScreen.js
│     │  │     └─ SettingsScreen.js
│     │  ├─ cashier
│     │  │  └─ DashboardScreen.js
│     │  ├─ ceo
│     │  │  └─ DashboardScreen.js
│     │  ├─ common
│     │  │  ├─ DashboardHome.js
│     │  │  ├─ ModulePlaceholderScreen.js
│     │  │  ├─ NotFoundScreen.js
│     │  │  ├─ RoleShellBase.js
│     │  │  └─ SettingsScreen.js
│     │  ├─ customer
│     │  │  ├─ DashboardScreen.js
│     │  │  ├─ orders
│     │  │  │  └─ OrdersScreen.js
│     │  │  ├─ receipts
│     │  │  │  └─ ReceiptsScreen.js
│     │  │  └─ settings
│     │  │     ├─ change-password
│     │  │     │  └─ ChangePasswordScreen.js
│     │  │     └─ SettingsScreen.js
│     │  ├─ deliveryBoy
│     │  │  ├─ DashboardScreen.js
│     │  │  └─ orders
│     │  │     └─ OrdersScreen.js
│     │  ├─ distributor
│     │  │  ├─ DashboardScreen.js
│     │  │  ├─ expense
│     │  │  │  └─ ExpenseScreen.js
│     │  │  ├─ messages
│     │  │  │  └─ MessagesScreen.js
│     │  │  ├─ orders
│     │  │  │  └─ OrdersScreen.js
│     │  │  ├─ payments
│     │  │  │  ├─ PaymentsScreen.js
│     │  │  │  ├─ primary
│     │  │  │  │  └─ PrimaryScreen.js
│     │  │  │  └─ secondary
│     │  │  │     └─ SecondaryScreen.js
│     │  │  ├─ primary-order-request
│     │  │  │  └─ PrimaryOrderRequestScreen.js
│     │  │  ├─ receipts
│     │  │  │  └─ ReceiptsScreen.js
│     │  │  ├─ return-stock
│     │  │  │  └─ ReturnStockScreen.js
│     │  │  └─ settings
│     │  │     ├─ change-password
│     │  │     │  └─ ChangePasswordScreen.js
│     │  │     └─ SettingsScreen.js
│     │  ├─ fieldSM
│     │  │  └─ DashboardScreen.js
│     │  ├─ hrAssistant
│     │  │  └─ DashboardScreen.js
│     │  ├─ kpo
│     │  │  └─ DashboardScreen.js
│     │  ├─ manageDirector
│     │  │  └─ DashboardScreen.js
│     │  ├─ nationalSM
│     │  │  └─ DashboardScreen.js
│     │  ├─ orderBooker
│     │  │  ├─ DashboardScreen.js
│     │  │  ├─ orders
│     │  │  │  └─ OrdersScreen.js
│     │  │  └─ receipts
│     │  │     └─ ReceiptsScreen.js
│     │  ├─ regionalSM
│     │  │  └─ DashboardScreen.js
│     │  ├─ salesman
│     │  │  ├─ DashboardScreen.js
│     │  │  └─ orders
│     │  │     └─ OrdersScreen.js
│     │  ├─ territorySM
│     │  │  └─ DashboardScreen.js
│     │  ├─ warehouseManager
│     │  │  ├─ DashboardScreen.js
│     │  │  ├─ order-management
│     │  │  │  └─ OrderManagementScreen.js
│     │  │  ├─ orders
│     │  │  │  └─ OrdersScreen.js
│     │  │  ├─ payments
│     │  │  │  ├─ PaymentsScreen.js
│     │  │  │  ├─ primary
│     │  │  │  │  └─ PrimaryScreen.js
│     │  │  │  └─ secondary
│     │  │  │     └─ SecondaryScreen.js
│     │  │  └─ warehouse-inventory
│     │  │     └─ WarehouseInventoryScreen.js
│     │  └─ zoneSM
│     │     └─ DashboardScreen.js
│     ├─ theme
│     │  ├─ colors.js
│     │  ├─ spacing.js
│     │  └─ typography.js
│     ├─ ui
│     │  ├─ Button.js
│     │  ├─ Card.js
│     │  ├─ DateRangePicker.js
│     │  ├─ EmptyState.js
│     │  ├─ Input.js
│     │  ├─ ListRow.js
│     │  ├─ Loader.js
│     │  ├─ Select.js
│     │  └─ Toast.js
│     └─ utils
│        ├─ format.js
│        ├─ permissions.js
│        ├─ roleRedirect.js
│        ├─ routeTitle.js
│        └─ validators.js
└─ README.md

```