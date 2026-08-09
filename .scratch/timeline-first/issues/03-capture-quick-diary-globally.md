Status: completed
Type: AFK

## What to build

Provide one shared Quick Diary launcher in the authenticated shell. Desktop navigation and the mobile primary action must open the existing Quick Diary modal; Timeline, Diaries, and Calendar should use the same launcher while retaining their source and selected-date context.

## Acceptance criteria

- [ ] One shared shell state opens and closes the existing `QuickDiaryModal` from desktop and mobile actions.
- [ ] Calendar-selected dates and existing Timeline/Diaries capture sources remain intact.
- [ ] Saving through the global modal still notifies existing Diary mutation listeners so visible Timeline and Calendar data refresh.
- [ ] `Cmd+J` and `Ctrl+J` open Quick Diary, but never while typing in input, textarea, select, contenteditable, or textbox surfaces.
- [ ] Modal focus return and Escape behavior remain intact, and automated tests cover launcher state plus keyboard guards.

## Blocked by

- `02-navigate-primary-jobs-without-duplicates.md`

## Comments

- The authenticated shell is now the sole `QuickDiaryModal` owner. Calendar date context, mutation refresh, focus behavior, mobile/desktop actions, and Ctrl/Cmd+J guards are covered by focused tests.
