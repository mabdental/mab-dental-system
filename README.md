# M.A.B. Dental Clinic system

This repository contains two separate Next.js applications backed by shared clinic configuration:

- apps/website — the patient-facing website at http://localhost:3000
- apps/admin — the staff operations workspace at http://localhost:3001
- packages/shared — verified business facts, service catalog, domain types, and presentation constants
- packages/server — server-only local development repository, appointment validation, status transitions, conflict checks, and optional Supabase service-role adapter
- supabase/ — PostgreSQL migration, seed data, and RLS test starter

The local development store is intentionally file-backed so the public app and admin app can complete an end-to-end flow without a Supabase project. It is for local development only. When Supabase environment variables are present, public appointment inserts use the server-side Supabase adapter.

## Local setup

~~~~text
npm.cmd install
npm.cmd run dev
~~~~

Open:

- Public website: http://localhost:3000
- Admin workspace: http://localhost:3001

The admin login is intentionally closed to public signup. In development, if no bootstrap credentials are configured, any non-empty email/password is accepted by the local-only demo mode. For a real environment, set MAB_BOOTSTRAP_ADMIN_EMAIL, MAB_BOOTSTRAP_ADMIN_PASSWORD, and a strong MAB_SESSION_SECRET outside Git.

Useful commands:

~~~~text
npm.cmd run dev:web
npm.cmd run dev:admin
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
~~~~

## Environment

Copy .env.example to a local secret file and fill only the values needed for the environment. Never commit .env, .env.local, service-role keys, or bootstrap passwords.

The public site keeps the supplied verified Valley 1 Google review URL and branch/contact data in packages/shared/src/index.ts. This is the source of truth for the local UI. In production, the same facts should be seeded into Supabase and editable only by authorized staff.

## Supabase

1. Create or select one development Supabase project.
2. Apply supabase/migrations/20260910000000_initial.sql.
3. Apply supabase/seed.sql.
4. Run the RLS checks in supabase/tests/rls_test.sql through the project’s pgTAP test workflow.
5. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY only in the correct environment.
6. Configure Auth redirect/site URLs for both deployments.
7. Create the initial Super Admin through a trusted Auth/admin workflow, then rotate the temporary bootstrap password.

The public booking endpoint validates and normalizes input server-side, creates or matches the patient by normalized phone, stores a PENDING_REVIEW appointment, and returns only a readable public reference. It never exposes operational tables to anonymous browser reads.

## Appointment lifecycle

~~~~text
PENDING_REVIEW → CONFIRMED
PENDING_REVIEW → RESCHEDULE_PROPOSED → CONFIRMED
PENDING_REVIEW → DECLINED
CONFIRMED → CHECKED_IN → IN_TREATMENT → COMPLETED
CONFIRMED → CANCELLED
CONFIRMED → NO_SHOW
~~~~

Confirmation and rescheduling validate future time, Monday–Saturday clinic hours, and overlapping confirmed appointments at the same branch. Sunday is kept as “Strictly by appointment” and is directed to Messenger.

## Deployment

Deploy apps/website and apps/admin as separate Netlify sites with the root directory available to the workspace build. Keep the shared Supabase project and environment variables aligned. Do not deploy the local file-backed data store or the local demo authentication mode. Set admin noindex,nofollow, production HTTPS, secure cookies, and a strong session secret.

Target names from the brief:

- mabdentalclinic.netlify.app
- mabclinicadmin.netlify.app

## Scope and privacy

This is a clinic operations and appointment-management platform, not a certified EHR/EMR, diagnostic system, payment processor, or audited accounting system. The public booking form intentionally collects only minimum contact/request data. Detailed clinical records should not be added without a separate security and privacy design.
