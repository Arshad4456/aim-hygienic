# Rawyan ERP — Phase 10 Final Operations, Reports, and Customer Billing

Phase 10 finalizes the ERP operating layer after Phase 1–9.

## Primary Sales: Company → Distributor

Primary sales belongs to the company.

1. Company creates Primary Sales Order.
2. Company approves the order.
3. Company creates and posts Company Dispatch Note.
4. Company stock decreases.
5. Distributor Invoice is generated.
6. Distributor Stock Receipt draft is generated.
7. Distributor posts stock receipt.
8. Distributor stock increases.
9. Distributor pays the company against Distributor Invoice in Company Finance.

Live tracking for this flow belongs to the company delivery/driver/sales team.

## Secondary Sales: Distributor → Customer

Secondary sales belongs to the distributor.

1. Distributor creates Customer/Secondary Sales Order.
2. Distributor approves the order.
3. Distributor delivers and invoices.
4. Distributor stock decreases.
5. Customer Invoice is generated.
6. Customer sees invoice in Customer Billing Portal.
7. Customer pays against invoice.
8. Customer Receipt is posted.

Live tracking for this flow belongs to distributor salesman/order booker/delivery team.

## Fleet and Live Tracking

Fleet should be connected to the delivery owner:

- Company fleet for company primary dispatches.
- Distributor fleet for distributor secondary deliveries.
- Mobile live tracking for salesman, order booker, delivery boy, and allowed field roles.

## New portals

- `/portals/operations`
- `/portals/customer/billing`
- `/portals/customer/invoices`
- `/portals/customer/receipts`
- `/portals/reports`

## API endpoints

- `GET /api/operations/overview`
- `GET /api/operations/customer-portal`
