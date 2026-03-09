# ERP Execution Plan (30 Practical Steps)

This plan converts AIM Hygienic into a full ERP platform across backend, web dashboards, and mobile dashboards (admin + non-admin).

## Phase 1 — Architecture & Governance Baseline (Steps 1–6)
1. Define ERP operating model (process owners for Procurement, Logistics, QA, Finance, IT).
2. Freeze master data governance: unique IDs, naming standards, data stewardship.
3. Build role-permission matrix (RBAC + approval limits per role).
4. Define Pakistan geo master: Province → District → Tehsil → UC, mapped to sales hierarchy.
5. Standardize status lifecycle dictionaries across modules.
6. Create audit-log policy for every critical transaction.

## Phase 2 — Core Platform Hardening (Steps 7–12)
7. Add centralized notification schema and read-state tracking.
8. Add notification APIs (list, unread summary, mark read, role filtering).
9. Add queue-ready hooks for real push channels (FCM/APNs/Expo).
10. Standardize API error envelope and validation responses.
11. Add observability baseline: request IDs, logs, metrics counters.
12. Add security controls: MFA-ready design, session controls, token rotation policy.

## Phase 3 — Procurement Deep ERP (Steps 13–17)
13. Introduce Purchase Requisition workflow.
14. Add RFQ and supplier quotation comparison matrix.
15. Add PO approval matrix (amount thresholds, maker-checker).
16. Implement GRN + quality hold checkpoints.
17. Enforce 3-way match (PO vs GRN vs Supplier Invoice) before payment.

## Phase 4 — Distribution & Logistics ERP Depth (Steps 18–21)
18. Add route planning model (vehicle capacity, stop sequencing).
19. Add dispatch execution states and SLA timers.
20. Add Proof-of-Delivery capture in mobile (photo/signature/GPS/time).
21. Add reverse logistics workflow (returns pickup, damage segregation, RTV).

## Phase 5 — Quality & Compliance (Steps 22–24)
22. Add batch/lot genealogy (raw → WIP → finished goods).
23. Add NCR and CAPA workflows with due dates and escalation.
24. Add compliance dashboard KPIs (RFT, rejection %, CAPA overdue, recall readiness).

## Phase 6 — Real-time User/Vehicle Tracking (Steps 25–27)
25. Move live tracking from polling-first to WebSocket/SSE streams.
26. Add geofence engine (warehouse, territory, route corridor alerts).
27. Add location history and playback (TTL time-series storage).

## Phase 7 — Cross-dashboard Rollout & UAT (Steps 28–30)
28. Roll out notifications and approvals to admin + distributor + brand-manager + warehouse-manager dashboards.
29. Roll out mobile push and read/ack flows to admin + distributor + brand-manager app modules.
30. Execute end-to-end UAT scripts, training, SOP signoff, go-live checklist.

---

## Immediate implementation included in this change
- Step 7: Message schema now supports priority/type/read tracking.
- Step 8: Message APIs now include unread summary + mark-read endpoint.
- Step 28: Web user message dashboards (admin + non-admin shared component) now support unread highlighting and read actions.
- Step 29: Mobile admin/distributor/brand-manager message dashboards now support refresh, unread state, and mark-read.

