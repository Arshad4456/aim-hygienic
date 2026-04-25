# Step 3 Delete List

## Safe to delete now

```txt
backend/node_modules
frontend/node_modules
mobile/node_modules
frontend/.next
frontend/out
frontend/dist
backend/dist
mobile/.expo
mobile/dist
.env
.env.local
.env.production
*.log
```

## Delete if still present from old naming

```txt
frontend/app/dashboards
```

## Do not delete yet

Keep these until all their screens are migrated into `frontend/src/features`:

```txt
frontend/app/portals/admin
frontend/app/portals/distributor
frontend/app/portals/customer
frontend/app/portals/salesman
frontend/app/portals/orderBooker
frontend/app/portals/warehouseManager
frontend/app/portals/deliveryBoy
frontend/app/portals/supplier
frontend/app/portals/brandManager
frontend/app/portals/components
```
