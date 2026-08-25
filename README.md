# SmartOne

SmartOne is the production CRM/ERP platform for SmartSync. The repository is intentionally structured around one modular Next.js application, PostgreSQL, object storage, and a small background worker.

## Local development

1. Copy `.env.example` to `.env.local` and replace every secret.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `pnpm install`.
4. Run migrations with `pnpm db:migrate`.
5. Start the app with `pnpm dev`.

## Non-negotiable architecture rules

- Every tenant-owned row contains `organization_id`.
- All mutations and audit records share one database transaction.
- PostgreSQL row-level security is the final tenant-isolation boundary.
- Monetary values use integer minor units; posted accounting entries are immutable.
- External side effects are idempotent and use an outbox/retry record.
- UI permissions never replace server-side authorization.
