# TODOs

This file tracks deferred work and future improvements for the Diary Vue project.

## Font & Typography

- [x] **Add Plus Jakarta Sans font import to app.vue** ✅ Completed 2026-04-05
  - **Why**: CategoryFilter.vue and PostMeta.vue reference `font-family: 'Plus Jakarta Sans'`, but the font is not imported
  - **Details**: Add Google Fonts import for Plus Jakarta Sans with all weights (300-800) to app.vue
  - **Priority**: Medium — Currently falls back to default sans-serif, which may cause inconsistent visual appearance
  - **Dependencies**: None
  - **Blocked by**: None

## Testing

- [ ] **Add component tests for CategoryFilter and PostMeta**
  - **Why**: These components currently have no test coverage
  - **Details**: Create tests/components/CategoryFilter.test.ts and tests/components/PostMeta.test.ts
  - **Priority**: Low — Components are working, but tests would prevent regressions
  - **Dependencies**: None
  - **Blocked by**: Font import (for accurate visual regression testing)

- [ ] **Update BlogCard.test.ts for i18n changes**
  - **Why**: Recent changes added i18n for "minute" label, but tests don't verify this
  - **Details**: Add test case verifying `blog.minute` i18n key is used correctly
  - **Priority**: Low
  - **Dependencies**: None
  - **Blocked by**: None

## Documentation

- [ ] **Add application screenshots to README**
  - **Why**: README.md has a TODO for adding application screenshots
  - **Details**: Capture screenshots of key pages (blog list, article detail, diary list) and add to README
  - **Priority**: Low
  - **Dependencies**: Font import (for better visual presentation)
  - **Blocked by**: None
