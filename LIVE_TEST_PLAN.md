# Live booking and admin test plan

Run this against a staging Supabase project or clearly labeled disposable records before testing production. Never use real patient data.

## Public booking cases

| Case | Expected result |
| --- | --- |
| New patient, Valley 1, consultation | Request is accepted with a unique reference and `PENDING_REVIEW`. |
| New patient, BF Homes, active service | Request stores the selected branch/service and appears once in admin. |
| Existing phone, changed email | Existing patient is updated without creating a duplicate. |
| Missing consent, invalid phone, malformed email | Client and API validation block submission. |
| Past time, Sunday, outside clinic hours | Request is blocked with a clear message. |
| Double submit and refresh during submit | One request is created and the button stays guarded. |
| Same slot from two browsers | Both requests may be reviewed, but only one can be confirmed when capacity is one. |
| Rate limit threshold | Excessive requests receive the throttling response. |
| Branch and service deep links | Booking opens with the correct selections prefilled. |
| Mobile keyboard and narrow viewport | Every step remains usable without horizontal overflow. |

## Admin cases

| Case | Expected result |
| --- | --- |
| Supabase Auth Super Admin login | Login succeeds, role is shown, and password can be hidden/shown. |
| Invalid credentials and signed-out API request | Login is rejected and protected APIs return `401`. |
| New pending request | Dashboard and appointment inbox show it within the refresh interval. |
| Confirm, suggest, decline, cancel | Status transition, history, conflict checks, and audit entry are correct. |
| Check in, start treatment, complete, no-show | Valid lifecycle transitions succeed and invalid transitions are blocked. |
| Payment entry | Payment appears in billing and patient totals with the correct status. |
| Inventory create, stock in, stock out, below-zero attempt | Stock and movement records reconcile; negative stock is rejected. |
| Service edit and availability toggle | Authorized edits update Supabase and public catalog behavior. |
| Branch map/review edit | Editable links persist and verified review safeguards remain visible. |
| Reports by each period and branch | Counts, totals, and branch comparison match filtered source rows. |
| Excel export | Download opens in Excel with the active period, branch, status, appointments, and payments. |
| Mobile drawer and desktop collapse | Navigation state is usable, persistent, keyboard accessible, and does not hide content. |

## Evidence to retain

- Test run timestamp, environment, commit SHA, and Supabase project reference.
- Request references for disposable appointments only.
- Screenshots of public booking success, admin review, calendar, filtered report, and export.
- Final database counts and a cleanup confirmation for disposable records.
