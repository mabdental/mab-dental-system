# Mobile UI plan

## Public website

- Use a thumb-friendly bottom action bar for `Book Appointment` and `Message Us`.
- Keep the brand header compact with a full-screen menu sheet for navigation.
- Use one-column service cards with large tap targets and progressive disclosure for detail text.
- Turn location cards into swipeable branch panels with call, directions, review, and booking actions.
- Keep booking as a one-question-per-screen flow with a sticky `Back` and `Next` control.
- Test 320px, 375px, 390px, and 430px widths, landscape phones, reduced motion, keyboard focus, and large text.

## Admin workspace

- Use a compact top bar with a visible menu button and persistent page title.
- Keep the navigation as a slide-over drawer on phones and the collapsible icon rail on desktop.
- Turn data tables into stacked record cards with the primary action visible and secondary actions in an overflow menu.
- Use a month calendar with swipeable month navigation and a day agenda drawer for event details.
- Put filters in a horizontally scrollable control row and keep export available in the page header.
- Use bottom sheets for service editing, inventory movements, payment entry, and appointment actions.
- Verify touch targets of at least 44px, no horizontal page overflow, safe-area padding, and accessible labels.

## Delivery sequence

1. Finish the responsive interaction patterns above.
2. Capture screenshots at the four target widths and run the browser accessibility sweep.
3. Run the live booking and admin matrix in `LIVE_TEST_PLAN.md` with disposable records.
