Status: completed
Type: AFK

## What to build

Make Timeline the canonical authenticated home while preserving the public guest homepage. A returning or newly logged-in user should reach their chronological Diary history consistently from every home affordance and authenticated redirect.

## Acceptance criteria

- [ ] Authenticated home resolves to `/timeline`; guest home remains `/`.
- [ ] Login, authenticated auth-page recovery, logo, and home actions use the same authenticated-home contract.
- [ ] Registration continues to send an unauthenticated new account to login rather than bypassing authentication.
- [ ] Route and authentication tests pin the new behavior.

## Blocked by

None - can start immediately

## Comments

- Implemented a shared authenticated-home route contract and covered authenticated root, auth-page, login, logo/home, and guest-home behavior with focused tests.
