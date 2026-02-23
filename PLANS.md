# Plans Summary

> Last updated: 2026-02-24

---

## Status Overview

| Plan | Status | Completed Date |
|------|--------|----------------|
| Blog Category Refactor | ✅ Done | types/blog.ts created |
| PWA Refactor | ✅ Done | useAppPWA.ts composable |
| WebSocket Alerts | ✅ Done | commit: abc46d7 |
| Test Coverage | ⚠️ In Progress | See below |
| Logger + Error Handling | 📋 Planned | See below |
| Dead Code Cleanup | 📋 Identified | See below |

---

## Active Plans (Priority Order)

### 1. Test Coverage Plan ⚠️

**File**: `plans/test-coverage-plan.md`

**Status**: Partial implementation - tests exist but failures present

**Goals**:
- Statements ≥ 75%, Branches ≥ 65%, Functions ≥ 75%, Lines ≥ 75%

**Current**: 18 test files, 260 tests (174 passing, 86 failing)

**Blocker**: Must complete before logger/error handling refactor

---

### 2. Logger + Error Handling Design 📋

**File**: `plans/logger-error-handling-design.md`

**Status**: Designed, awaiting test coverage

**Dependencies**: Test Coverage Plan must be complete first

**Key Changes**:
- Unified logger system (`lib/logger.ts`)
- Structured error codes
- Request ID tracking
- API error response standardization

---

### 3. Dead Code Audit Report 📋

**File**: `plans/dead-code-audit-report.md`

**Status**: Identified, ready for cleanup

**High Priority Removals**:
- `components/HealthStatus.vue` - unused
- `components/HoldingCard.vue` - unused
- `composables/useBreakpoints.ts` - unused
- `composables/useNavigationAnimation.ts` - unused

---

### 4. Production Readiness Audit 🔍

**File**: `plans/production-readiness-audit.md`

**Status**: Audit complete, 3 critical issues identified

**Critical Issues**:
1. Inconsistent logging system
2. Missing error codes
3. Incomplete test coverage

---

## Documentation / Reviews

| File | Type | Purpose |
|------|------|---------|
| `blog-system-review.md` | Review | Blog system architecture analysis |
| `product-priority-roadmap.md` | Roadmap | High-level product priorities (Phases 1-4) |

---

## Completed Plans (Archived)

### 1. Blog Category Refactor ✅
- Unified category type definitions in `types/blog.ts`
- English keys stored in database
- i18n translation support
- Legacy migration helpers included

### 2. PWA Refactor ✅
- `composables/useAppPWA.ts` - unified PWA state management
- `components/PWAInstallPrompt.vue` - install prompt component
- `components/PWAUpdatePrompt.vue` - update prompt component
- Service Worker update handling

### 3. WebSocket Alerts ✅
- `server/websocket/connectionManager.ts` - connection management
- `server/websocket/alertHandler.ts` - alert handling
- `composables/useWebSocket.ts` - client WebSocket composable
- Real-time alert push instead of polling

---

## Recommended Execution Order

1. **Fix failing tests** (Test Coverage Plan)
2. **Add missing tests** for auth/diary/websocket error paths
3. **Achieve coverage targets** (75/65/75/75%)
4. **Implement logger** (Logger + Error Handling Design)
5. **Clean up dead code** (Dead Code Audit)
6. **Review production readiness** (Production Readiness Audit)

---

## Quick Reference

| Location | Path |
|----------|------|
| Plans | `plans/` |
| Tests | `tests/` |
| Types | `types/` |
| Composables | `composables/` |
| Server WebSocket | `server/websocket/` |
| Logger | `lib/logger.ts` |
