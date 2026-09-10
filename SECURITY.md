# Security and privacy

Please do not report security issues in a public issue or pull request.

Report privately to the repository owner through the authenticated GitHub account or the clinic’s approved privacy contact. Do not include passwords, service-role keys, access tokens, OTPs, or real patient information in the report.

## Required safeguards

- Keep Supabase service-role credentials server-side only.
- Keep bootstrap passwords and session secrets in environment variables, never Git or client bundles.
- Use Supabase Auth and RLS for production staff access.
- Do not use editable user metadata for authorization decisions.
- Keep public booking data minimal and never collect detailed medical information in the public form.
- Audit appointment, payment, inventory, staff-role, branch, and service mutations.
- Use disposable test fixtures and reset local test data after verification.
- Do not treat the platform as a certified EHR/EMR, diagnostic system, payment processor, or audited accounting system.
