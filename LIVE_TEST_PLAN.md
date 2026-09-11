# M.A.B. Dental Clinic live test plan

This plan validates the public booking experience and the clinic admin workspace with ten synthetic patient profiles. Run it against a staging Supabase project or a clearly labeled disposable dataset. Do not use real patient information.

## Test controls

- Test run ID: `MAB-LIVE-YYYYMMDD-NN`.
- Timezone: `Asia/Manila`.
- `D1`: the next future Monday–Saturday at 10:00 AM.
- `D2`: the next future Monday–Saturday at 11:00 AM on the same day as `D1`.
- `D3`: a future Monday–Saturday at 2:00 PM.
- `DS`: the next Sunday at 10:00 AM, used only for blocked-input testing.
- Capacity: one appointment at a time per branch.
- Mark every record with the test run ID in the optional patient message where the UI allows it.

## Ten synthetic patients

Use reserved example email addresses and non-routable test phone values. Patient 03 deliberately reuses Patient 01's phone to exercise the returning-patient path.

| ID | Synthetic details | Public booking case | Admin workflow and expected result |
| --- | --- | --- | --- |
| P01 | Ana Santos · `09000000001` · `p01@example.invalid` | Valley 1, free consultation, `D1`, no optional message | Appears once as `PENDING_REVIEW`; staff declines it and verifies `DECLINED`, status history, and audit entry. |
| P02 | Ben Cruz · `09000000002` · `p02@example.invalid` | BF Homes, Root Canal Therapy, `D3`, detailed concern message | Confirm → check in → start treatment → complete; patient history, timestamps, audit trail, and paid Cash payment reconcile. |
| P03 | Carla Reyes · `09000000001` · `p03@example.invalid` | Valley 1, Teeth Whitening, `D2`; returning phone with changed name/email | Updates the existing patient record without a duplicate; appointment links to the same patient and can be cancelled. |
| P04 | Daniel Lim · `09000000004` · blank email | Valley 1, Oral Prophylaxis, `D1` | Confirm, propose a new time, confirm the reschedule, and verify the original and new schedule plus conflict checks. |
| P05 | Eva Garcia · `09000000005` · `p05@example.invalid` | BF Homes, Pediatric Dentistry, `D2`; guardian context in the message | Confirm then mark `NO_SHOW`; verify it remains in reports and does not count as completed. |
| P06 | Farid Noor · `09000000006` · `p06@example.invalid` | Valley 1, Orthodontic Treatment, `D3` | Leave pending, suggest a new time, verify `RESCHEDULE_PROPOSED`, then confirm the proposed slot. |
| P07 | Grace Tan · `09000000007` · `p07@example.invalid` | BF Homes, Composite Restoration, `D1` at 10:00 AM | Confirm first at a one-capacity slot; verify calendar placement and branch-level conflict protection. |
| P08 | Hugo Bautista · `09000000008` · `p08@example.invalid` | BF Homes, Oral Prophylaxis, the same `D1` 10:00 AM slot | Attempt confirmation after P07; the system rejects the overlap, then staff declines the request and verifies the final state. |
| P09 | Irene Navarro · `09000000009` · blank email | Valley 1, Dentures, `D3`; no email and long but valid message | Confirm, complete the visit, record a GCash payment, and verify patient payment totals and filtered report totals. |
| P10 | Jose Dela Cruz · `09000000010` · `p10@example.invalid` | Valley 1, Tooth Extraction, `D2`; deep link with branch/service prefilled | Confirm → check in → start treatment → complete; verify mobile booking, calendar event, patient profile, and payment record. |

## Public patient test pass

Run each of the ten profiles through the public site and record the returned reference code.

1. Test desktop and mobile viewports at 320px, 375px, 390px, 430px, and desktop width.
2. Confirm both branches, all ten selected services/consultation paths, optional email, optional message, consent, and deep-link prefill.
3. Confirm the progress flow remains usable after Back, refresh, keyboard navigation, and a temporary network delay.
4. Verify one request produces one reference code, the submit button is guarded against double submission, and the success state is readable.
5. Verify the returning-phone case updates the patient rather than creating a duplicate.
6. Verify Sunday, past date, before-hours, after-hours, missing branch, missing service, missing time, invalid phone, invalid email, missing consent, oversized message, and malformed JSON are rejected with a useful message.
7. Send two same-slot requests from separate browser contexts and confirm only one can be confirmed at capacity one.
8. Exercise rate limiting with synthetic requests and confirm the throttled response does not create extra records.
9. Check external Messenger, telephone, map, review, privacy, and terms links without submitting patient data to those services.
10. Confirm no server key, bootstrap password, patient record, or internal admin link appears in the public page or browser bundle.

## Admin test pass

Use a fresh browser context for the admin checks.

### Access and navigation

- Valid Supabase Auth Super Admin login succeeds and shows the correct profile.
- Invalid email/password is rejected without revealing which field was wrong.
- Password `Show` and `Hide` controls change only the input type and remain keyboard accessible.
- Sign out invalidates the session; a direct protected API request returns `401` afterward.
- The desktop navigation expands and minimizes, retains its preference after reload, and keeps icon labels available.
- The mobile navigation drawer opens, closes, traps no focus, and leaves the main content usable.
- The active user with the Super Admin role can open and edit every module: appointments, calendar, patients, staff, services, branches, billing, inventory, reports, and settings.

### Appointment operations

- Search by reference, name, and phone; filter by every status and both branches.
- Review each of the ten new requests and verify branch, service, patient, preferred time, and message.
- Exercise every lifecycle transition: `PENDING_REVIEW`, `CONFIRMED`, `RESCHEDULE_PROPOSED`, `CANCELLED`, `DECLINED`, `CHECKED_IN`, `IN_TREATMENT`, `COMPLETED`, and `NO_SHOW`.
- Attempt invalid transitions from terminal states and confirm they are rejected.
- Confirm same-branch overlap protection, different-branch same-time acceptance, duration boundaries, Sunday rules, and audit history.
- Verify the calendar contains only scheduled statuses and links each event to appointment detail.

### Patient, billing, and inventory operations

- Confirm the patient directory contains nine unique patients after the returning-phone case.
- Open each patient profile and verify appointment history, contact fields, completion date, and payment summary.
- Record Cash, GCash, Maya, Bank Transfer, Card, and Other payments in disposable fixtures; verify status, amount, reference, branch, patient, and appointment links.
- Exercise unpaid, partial, paid, void, and refunded payment states where supported by the admin API or fixture setup.
- Create an inventory item, set reorder level, stock in, stock out, adjustment, and attempt a below-zero movement.
- Verify branch stock, movement reason, timestamps, and audit records reconcile.

### Configuration and reporting

- Edit a service name, category, short description, long description, duration, price, featured state, and public availability; confirm the public service page reflects the saved values.
- Edit branch map/review links and verify the unverified-branch review safeguard remains visible.
- Open the calendar month view, previous/next month controls, Today, event details, and mobile layout.
- Run reports for Last 1 day, Last 7 days, Last 30 days, Last 3 months, Last 6 months, All time, and a custom inclusive date range.
- Repeat each period with All branches, Valley 1, and BF Homes filters, then repeat with each appointment status.
- Reconcile displayed counts and paid totals to the filtered appointment/payment rows.
- Export each representative filter to Excel and verify the workbook contains the active range, branch, status, appointments, payments, and no records outside the filter.
- Verify empty states, zero totals, long names, missing email, and large result sets remain readable.

## Security and resilience checks

- Confirm all admin API routes require the signed session cookie.
- Confirm service and Supabase server keys are server-only and absent from `NEXT_PUBLIC_` variables.
- Confirm RLS is enabled on every exposed table and the service-role grant is present for the server runtime.
- Try malformed IDs, unknown actions, invalid status payloads, negative payment amounts, invalid inventory quantities, and oversized text.
- Refresh during every loading state and after each mutation; confirm no duplicate mutation occurs.
- Disable the network during reads and writes; confirm the UI gives a recoverable error and does not claim success.
- Check browser console, accessibility tree, keyboard focus, reduced motion, color contrast, and horizontal overflow on desktop and mobile.

## Evidence and cleanup

Capture the test run ID, environment, commit SHA, Supabase project reference, browser/device, reference codes, screenshots, API status results, exported workbook, and any failure logs.

After testing, remove only records tagged with the test run ID in a transaction: appointments, status history, payments, audit entries, patients created by the run, and disposable inventory fixtures. Verify the final counts are zero for the run tag and that seeded branches/services remain intact. Never delete untagged clinic data.

## Release gate

The release is accepted when all ten public profiles have expected outcomes, every admin transition and module check passes, every report filter reconciles, an Excel export opens successfully, mobile and desktop checks pass, cleanup is verified, and no untriaged error remains.
