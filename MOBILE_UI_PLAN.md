# Mobile UI plan

The mobile experience is designed around the primary user intent at each surface:
patients need a fast, confidence-building booking path; clinic staff need quick
access to today’s work without losing the complete operations menu.

## Public website

- Use a compact sticky header with a visible booking affordance and a menu button.
- Put `Book a visit`, `Find a branch`, and `Message us` in a thumb-friendly quick-action stack below the landing hero.
- Use one-column service and branch cards on phones so each card has enough reading width and a clear next action.
- Keep the global bottom action bar for public pages, but remove it from booking so it cannot compete with the booking controls.
- Keep booking as a one-question-per-screen flow with a visible step context, five-step progress indicator, and sticky `Back` / `Next` control.
- Keep booking inputs at a mobile-safe text size, avoid nested scrolling in the service list, and reserve safe-area space for the sticky action.
- Test 320px, 375px, 390px, and 430px widths, landscape phones, reduced motion, keyboard focus, large text, and validation errors.

## Admin workspace

- Use a compact top bar with a visible menu button, persistent page title, and clipped account context.
- Keep the complete navigation in a slide-over drawer, with a five-item thumb bar for Dashboard, Appointments, Calendar, Patients, and More.
- Turn operational tables into labeled stacked record cards on phones so the identity, status, and action remain readable without horizontal scrolling.
- Keep the month calendar as a true calendar grid, with compact event chips and accessible linked events.
- Stack filters into full-width controls at narrow widths while keeping search and export discoverable.
- Use bottom-sheet dialogs for rescheduling, payment entry, and inventory movements; never depend on native `prompt()` dialogs.
- Verify touch targets of at least 44px, no horizontal page overflow, safe-area padding, keyboard focus, reduced motion, and accessible labels.

## Delivered acceptance gates

1. Public home, booking entry, and admin dashboard are visually checked at an iPhone-sized viewport.
2. Public mobile navigation, booking progress, and booking action visibility are covered by browser tests.
3. Admin mobile navigation and the full drawer are covered by a phone-sized browser test.
4. `prefers-reduced-motion` and safe-area styles are present on both surfaces.
5. The live booking and admin matrix in `LIVE_TEST_PLAN.md` remains the release-level acceptance pass.
