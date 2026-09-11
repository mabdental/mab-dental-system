# M.A.B. Dental Clinic

Production-oriented patient website and clinic operations workspace for M.A.B. Dental Clinic.

This repository is a small npm-workspaces monorepo with two independently deployable Next.js applications:

| App | Local URL | Purpose |
| --- | --- | --- |
| apps/website | http://localhost:3000 | Public clinic website and appointment requests |
| apps/admin | http://localhost:3001 | Authenticated clinic operations workspace |

Shared domain types, verified clinic facts, services, links, and presentation configuration live in packages/shared. Server-only appointment validation, status transitions, conflict checks, and the local development repository live in packages/server.

## Quick start

~~~~text
npm.cmd install
npm.cmd run dev
~~~~

Open the public site at http://localhost:3000 and the admin workspace at http://localhost:3001.

The local app uses a disposable file-backed data store at data/local-db.json. It lets the public and admin apps exercise the complete request-to-completion workflow without requiring cloud credentials. This store is development-only and is ignored by Git.

The admin login is closed to public signup. When no bootstrap credentials are set and the app is running in development, non-empty values are accepted in a clearly local-only demo mode. Before any deployment, set a real bootstrap email/password and a strong MAB_SESSION_SECRET.

## Commands

~~~~text
npm.cmd run dev
npm.cmd run dev:web
npm.cmd run dev:admin
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:e2e
npm.cmd run build
~~~~

## Product scope

The public experience includes:

- Home, Services, dynamic service details, Locations, dynamic branch details, Our Clinic, Reviews, Contact, Book Appointment, Privacy, and Terms.
- Responsive navigation and mobile menu.
- Service category and concern exploration.
- Clinic equipment explorer and accessible image gallery.
- Verified branch information for Valley 1 and BF Homes / Irineville.
- Messenger, phone, email, social, maps, and Valley 1 review links.
- A five-step appointment request flow that returns a readable MAB reference and clearly states that the schedule is pending clinic confirmation.

The admin experience includes:

- Protected login/logout and server-checked session cookie.
- Dashboard metrics and pending-request inbox.
- Appointment list/detail views and lifecycle actions.
- Patient directory and appointment history.
- Calendar grouping by local date.
- Service availability toggles.
- Branch map/review-link editing.
- Basic payment recording, inventory items and movements, reports, staff role reference, and settings.

Appointment lifecycle:

~~~~text
PENDING_REVIEW → CONFIRMED
PENDING_REVIEW → RESCHEDULE_PROPOSED → CONFIRMED
PENDING_REVIEW → DECLINED
CONFIRMED → CHECKED_IN → IN_TREATMENT → COMPLETED
CONFIRMED → CANCELLED
CONFIRMED → NO_SHOW
~~~~

Confirmation and rescheduling validate future times, Monday–Saturday hours, Sunday restrictions, and overlapping confirmed appointments at the same branch.

## Verified clinic configuration

The source of truth is packages/shared/src/index.ts and the Supabase seed:

- Official name: M.A.B. Dental Clinic
- Tagline: Your Smile is Our Masterpiece.
- Timezone: Asia/Manila
- Hours: Monday–Saturday, 8:00 AM–8:00 PM; Sunday, strictly by appointment
- Consultation: Free Consultation and Assessment
- Valley 1 Branch: 138-C Barangay San Antonio, Valley 1, Parañaque City
- BF Homes / Irineville Branch: Blk 4 Lot 13 Doña Irenea Ave., Irineville 1, BF Homes, Parañaque City
- BF / Irineville is intentionally not presented as having a verified Google Business profile or review URL.

Do not add prices, testimonials, doctors, awards, ratings, or other business facts without verification.

## Supabase setup

Apply these files to one development/production Supabase project:

1. supabase/migrations/20260910000000_initial.sql
2. supabase/seed.sql
3. supabase/tests/rls_test.sql through the project test workflow

The migration creates operational tables, enums, indexes, helper authorization functions, RLS, and the appointments Realtime publication. The public appointment route uses the service-role key only on the server when Supabase variables are present.

Required environment variables are listed in .env.example. Never commit .env files, service-role keys, bootstrap passwords, database passwords, or patient data.

## Netlify deployment

Deploy the two apps as separate public Netlify projects from the same public GitHub repository, `mabdental/mab-dental-system`.

The live projects are:

- Public clinic site: https://mabdentalclinic.netlify.app
- Admin workspace: https://mabclinicadmin.netlify.app

Both projects use the repository root as their base directory. Netlify detects the
workspace and runs the app-specific build command below:

### Public project

- Project name: `mabdentalclinic`
- Base directory: repository root
- Framework: Next.js
- Build command: `npm --workspace @mab/website run build`
- Publish directory: `apps/website/.next`

### Admin project

- Project name: `mabclinicadmin`
- Base directory: repository root
- Framework: Next.js
- Build command: `npm --workspace @mab/admin run build`
- Publish directory: `apps/admin/.next`
- Keep the admin deployment noindex/nofollow.

Set the shared Supabase and public-link variables in each Netlify project's
production environment. The server accepts Supabase's current
`SUPABASE_SECRET_KEY` name (or the legacy `SUPABASE_SERVICE_ROLE_KEY` name).
Keep the server key,
`MAB_BOOTSTRAP_ADMIN_PASSWORD`, and `MAB_SESSION_SECRET` server-only. Do not
deploy local demo authentication or the file-backed store as a production data
source.

## Testing

The current local verification covers:

- npm lint
- TypeScript typecheck
- production builds
- Chromium patient request → admin review → confirmation
- full appointment lifecycle through completion
- desktop/mobile public navigation
- public and admin route sweeps with no error overlay
- protected admin API returning 401 without a session

Run the full browser suite with:

~~~~text
npm.cmd run test:e2e
~~~~

## Contributions

See CONTRIBUTING.md for setup, branch, test, privacy, and pull-request expectations. See SECURITY.md for secret and personal-data handling.

## License

Source code is licensed under the MIT License in LICENSE. Clinic trademarks, branding, photographs, screenshots, and supplied business content are not automatically licensed by the source-code license.

## Production limitations

The current repository is a validated local implementation and deployment-ready foundation. Before public launch, complete the production Supabase adapter for all admin reads/mutations, use Supabase Auth with true staff-profile RBAC, configure Realtime authorization, rotate bootstrap credentials, replace cropped reference imagery with original clinic assets, and run the full role/security/accessibility QA matrix.
