# Quick Note Desktop Centering Design

## Summary
Center the quick note (quick diary modal) on desktop screens while keeping mobile full-screen behavior unchanged.

## Goals
- Desktop (sm and up) modal is horizontally centered.
- Mobile layout remains full-screen and unchanged.
- No behavior, data, or API changes.

## Non-Goals
- No redesign of modal content or interactions.
- No routing changes.
- No new tests.

## Current Context
The quick note UI is implemented in `components/QuickDiaryModal.vue` using a full-screen overlay with a desktop layout wrapper. Desktop currently appears left-aligned due to outer flex alignment on larger screens.

## Approach (Recommended)
Adjust desktop layout alignment classes on the modal wrapper to use centered alignment for `sm` and above, and ensure the modal container uses a max width with `mx-auto` so it sits centrally within the overlay.

### Why this approach
- Minimal changes.
- Matches existing structure and Tailwind usage.
- Low risk, easy to verify.

## UX Details
- Mobile: full-screen modal (no change).
- Desktop: modal centered horizontally (and vertically if already intended by existing styles).

## Implementation Notes
- Update `components/QuickDiaryModal.vue` desktop wrapper classes (e.g., `sm:items-center sm:justify-center`).
- Ensure the modal panel has `mx-auto` and an explicit max width if needed.

## Testing
- Manual visual check on desktop width.
- Confirm mobile layout is unchanged.
