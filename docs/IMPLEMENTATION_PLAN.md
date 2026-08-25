# SmartOne implementation plan

The product is delivered as tested vertical slices, while preserving one architecture.

1. Foundation: authentication, MFA, sessions, organizations, membership, RBAC/ABAC, RLS, audit log, invitations and organization switcher.
2. CRM: accounts, contacts, leads, activities, pipelines, products, price books, lead conversion, assignment, scoring, duplicate merge and forecast.
3. Quote-to-cash: multi-currency catalog, quotes, approvals, orders, invoices, credit notes, installments, payment reconciliation and PDFs.
4. ERP finance and operations: double-entry ledger, receivables, payables, treasury, procurement, warehouse stock ledger, manufacturing, projects, HR and support.
5. Platform: custom objects, typed/calculated fields, layouts, workflow/automation/approval builders, reports, dashboards, public forms, portal and feature flags.
6. Integrations: versioned API, OAuth connections, webhooks, outbox/retry/replay, email, calendars, messaging, commerce, accounting and automation connectors.
7. Commercial release: onboarding, bilingual/Jalali UX, accessibility, mobile, observability, backups, restore drills, security testing, CI/CD, billing, documentation and support.

No item is marked complete until its schema, server authorization, UI, audit trail, automated tests and browser acceptance flow pass.
