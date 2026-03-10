# Quick Note Desktop Centering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Center the quick note (quick diary modal) horizontally on desktop while keeping the mobile full-screen layout unchanged.

**Architecture:** Adjust Tailwind layout classes in the quick diary modal overlay to center content on `sm` and above. No data or behavior changes.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind CSS.

---

### Task 1: Identify and adjust desktop centering classes

**Files:**
- Modify: `components/QuickDiaryModal.vue`

**Step 1: Write the failing test**
No automated test; this is a visual layout change only.

**Step 2: Run test to verify it fails**
Skip.

**Step 3: Write minimal implementation**
Update the desktop wrapper to center the modal on `sm` and above.

```vue
<!-- Find the outer wrapper for the modal overlay -->
<div class="flex items-end justify-center min-h-screen px-4 pb-20 text-center sm:block sm:p-0">
  ...
</div>

<!-- Update to center on desktop -->
<div class="flex items-end justify-center min-h-screen px-4 pb-20 text-center sm:flex sm:items-center sm:justify-center sm:p-0">
  ...
</div>
```

If needed, ensure the modal panel has `sm:mx-auto` and a reasonable max width:

```vue
<div class="relative inline-block align-bottom w-full text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:mx-auto">
  ...
</div>
```

**Step 4: Run test to verify it passes**
Manual: Open quick note on desktop width and verify it is centered. Confirm mobile remains full-screen.

**Step 5: Commit**
```bash
git add components/QuickDiaryModal.vue
git commit -m "fix: center quick note on desktop"
```

