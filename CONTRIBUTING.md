# Contributing to M.A.B. Dental Clinic

Thank you for helping improve the M.A.B. Dental Clinic system.

## Before you start

This repository handles appointment and contact information. Never use real patient data in local development, screenshots, examples, pull requests, or automated tests. Use disposable fixtures only.

Install the pinned dependencies:

~~~~text
npm.cmd install
~~~~

## Development

Run both apps:

~~~~text
npm.cmd run dev
~~~~

Run one app:

~~~~text
npm.cmd run dev:web
npm.cmd run dev:admin
~~~~

The public app is on port 3000 and the admin app is on port 3001. Local admin demo authentication is for development only.

## Change workflow

1. Create a focused branch from main.
2. Keep verified business facts centralized in packages/shared/src/index.ts and Supabase seed data.
3. Keep server-only code and secrets out of client components.
4. Add or update migrations for schema changes.
5. Add tests for changed user flows and authorization boundaries.
6. Run lint, typecheck, end-to-end tests, and builds before opening a pull request.

~~~~text
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:e2e
npm.cmd run build
~~~~

## Pull requests

Describe:

- What changed and why.
- Which public/admin routes are affected.
- How the change was tested.
- Any Supabase migration, RLS, environment, or deployment work required.
- Any known privacy, accessibility, or responsive considerations.

Do not include secret values, patient data, screenshots containing personal information, or claims about clinic services that are not verified.

## Commit guidance

Use short, descriptive commit messages. Keep unrelated formatting or generated files out of the change. Do not commit node_modules, .next, data/local-db.json, environment files, or credentials.
