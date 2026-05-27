# UI Styling Guide — CabFleet

This document is the single source of truth for styling conventions. It is referenced by `AGENTS.md` and enforced by ESLint.

---

## 1. Layer model

Every styling decision belongs to exactly one layer. Layers form a strict hierarchy — lower layers define tokens; upper layers consume them.

| Layer | Path | May use palette? | Must use semantic? | Variant API |
|-------|------|------------------|--------------------|-------------|
| **Theme** | `src/app/globals.css` | Yes — defines raw ramps + semantic mappings | Yes — declares all `--color-*` semantic vars | N/A |
| **UI primitives** | `src/components/ui/*` | **Yes — only long-term palette-aware layer** | Map palette → intent via CVA/tailwind-variants | `intent`, `size`, `variant` typed props |
| **Common components** | `src/components/common/*` | **No** | **Required** | Strict TS unions only |
| **Layout shell** | `src/layout/*` | Transitional (until tokenized) | Yes (target state) | Compose common/ui |
| **Feature** | `src/app/*`, `src/modules/*/components/*` | **Forbidden** | **Required** | Compose components only |

---

## 2. Semantic token reference

All tokens live in `@theme { }` inside `src/app/globals.css`. The Tailwind utility name is derived from the CSS variable name.

### 2a. Color tokens

| CSS variable | Tailwind utility | Use |
|---|---|---|
| `--color-primary` | `text-primary` / `bg-primary` | Brand action color |
| `--color-primary-hover` | `bg-primary-hover` | Hover state of primary |
| `--color-primary-foreground` | `text-primary-foreground` | Text on solid primary bg |
| `--color-text` | `text-default` | Default body text |
| `--color-text-muted` | `text-muted` | Secondary/supporting text |
| `--color-text-inverse` | `text-inverse` | Text on dark surfaces |
| `--color-border` | `border-default` | Default border |
| `--color-border-strong` | `border-strong` | Emphasized border |
| `--color-focus-ring` | `ring-focus` | Focus ring |

### 2b. Surface tokens

| CSS variable | Tailwind utility | Use |
|---|---|---|
| `--color-surface` | `bg-surface` | Page background, default cards |
| `--color-surface-elevated` | `bg-surface-elevated` | Raised cards, dropdowns |
| `--color-surface-inset` | `bg-surface-inset` | Inputs, table headers, wells |
| `--color-surface-sidebar` | `bg-surface-sidebar` | Navigation chrome |
| `--color-surface-modal` | `bg-surface-modal` | Dialogs, overlays |

### 2c. Subtle / tinted tokens (replaces opacity hacks)

Never use `bg-brand-500/10` or `dark:bg-success-500/15` in feature code. Use paired tokens instead.

| Background | Foreground | Use |
|---|---|---|
| `bg-primary-subtle` | `text-on-primary-subtle` | Stat card accent, active nav tint |
| `bg-success-subtle` | `text-on-success-subtle` | Success banners, status pills |
| `bg-warning-subtle` | `text-on-warning-subtle` | Warning callouts |
| `bg-error-subtle` | `text-on-error-subtle` | Error callouts |

### 2d. Feedback color tokens

| Token | Use |
|---|---|
| `text-success` / `bg-success` | Success state |
| `text-warning` / `bg-warning` | Warning state |
| `text-error` / `bg-error` | Error state |

### 2e. Typography tokens

| CSS variable | Tailwind utility | Use |
|---|---|---|
| `--font-heading` | `font-heading` | Headings |
| `--font-body` | `font-body` | Body text (default) |
| `--font-mono` | `font-mono` | Code, monospaced |
| `--text-display` | `text-display` | Large display headings |
| `--text-title` | `text-title` | Page / section titles |
| `--text-body` | `text-body` | Default body size |
| `--text-caption` | `text-caption` | Labels, hints, metadata |

---

## 3. Migration cheat sheet

Direct mapping from legacy palette classes to semantic replacements.

| Legacy (forbidden in feature code) | Semantic replacement |
|---|---|
| `bg-brand-50`, `bg-brand-500/10`, `dark:bg-brand-500/15` | `bg-primary-subtle` |
| `text-brand-500`, `text-brand-700` | `text-primary` or `text-on-primary-subtle` |
| `bg-brand-500` | `bg-primary` |
| `hover:bg-brand-600` | `hover:bg-primary-hover` |
| `bg-white dark:bg-white/[0.03]` | `bg-surface-elevated` |
| `bg-gray-50` (page bg) | `bg-surface` |
| `bg-white` (card/dialog) | `bg-surface` or `bg-surface-elevated` |
| `border-gray-200 dark:border-gray-800` | `border-default` |
| `border-gray-100 dark:border-gray-800` | `border-default` |
| `text-gray-800 dark:text-white/90` | `text-default` |
| `text-gray-700 dark:text-gray-300` | `text-default` |
| `text-gray-500 dark:text-gray-400` | `text-muted` |
| `text-gray-400` | `text-muted` |
| `bg-gray-100 dark:bg-white/5` | `bg-surface-inset` |
| `bg-gray-900 dark:bg-gray-900` | `bg-surface-sidebar` or `bg-surface-inset` |
| `dark:bg-gray-dark` | `bg-surface-sidebar` |
| `text-[13px]`, `text-theme-sm` (legacy) | `text-caption` |
| `text-theme-xs` (legacy) | `text-caption` |
| `rounded-[17px]` | `rounded-lg` |
| `dark:bg-brand-500/12`, `dark:bg-brand-500/20` | `bg-primary-subtle` |
| `bg-success-50 dark:bg-success-500/15` | `bg-success-subtle` |
| `bg-warning-50 dark:bg-warning-500/15` | `bg-warning-subtle` |
| `bg-error-50 dark:bg-error-500/15` | `bg-error-subtle` |
| `text-success-700 dark:text-success-400` | `text-on-success-subtle` |
| `text-warning-700 dark:text-warning-400` | `text-on-warning-subtle` |
| `text-error-700 dark:text-error-400` | `text-on-error-subtle` |

---

## 4. Forbidden patterns in feature code

`src/app/**` and `src/modules/*/components/**`:

| Pattern | Why forbidden |
|---|---|
| `bg-brand-*`, `text-brand-*` | Palette coupling → redesign requires per-page edits |
| `text-gray-*`, `border-gray-*` | Same |
| `bg-success-*`, `bg-error-*`, `bg-warning-*` | Use subtle token pairs |
| `*/10`, `*/15`, `*/20` opacity hacks | Bypass semantic intent, break WCAG contrast guarantee |
| `#rrggbb` hex inline | Hardcoded, not token-driven |
| `style={{ color: ... }}` | Same |
| `STATUS_COLOR`, `TONE_CLASS` local maps | Use `StatusBadge` + `StatusTone` instead |
| `w-[372px]`, `text-[13px]`, `rounded-[17px]` etc. | Destroys spacing/sizing consistency |

Allowlisted files where palette is OK: `src/app/globals.css`, `src/components/ui/*`.

---

## 5. Spacing + radius conventions

**Preferred spacing scale:** `2`, `4`, `6`, `8` (i.e. `p-2`, `gap-4`, `space-y-6`, `p-8`)

**Avoid off-scale drift** in feature code: `p-7`, `gap-11`, `mt-9` unless explicitly justified with a PR comment.

**Preferred radius tiers:**

| Token | Tailwind class | Use |
|---|---|---|
| `--radius-sm` | `rounded-sm` | Small chips, tags |
| `--radius-md` | `rounded-md` | Buttons, inputs |
| `--radius-lg` | `rounded-lg` | Cards, dialogs |
| `--radius-xl` | `rounded-xl` | Large panels |
| `--radius-full` | `rounded-full` | Pills, avatars |

Avoid `rounded-[17px]` and other arbitrary radius in feature code.

---

## 6. Status styling

`StatusBadge` is the **single source of truth** for status pills. Never create local `STATUS_COLOR` maps.

```ts
// Allowed tone type (exported from src/components/common/StatusBadge.tsx)
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

// Per-domain tone maps live near the feature (client-safe, no server imports)
const ATTENDANCE_STATUS_TONE: Record<string, StatusTone> = {
  PRESENT: "success",
  HALF_DAY: "warning",
  ABSENT: "error",
  ON_LEAVE: "info",
};

// Usage in JSX
<StatusBadge tone={ATTENDANCE_STATUS_TONE[row.status] ?? "neutral"}>
  {ATTENDANCE_STATUS_LABEL[row.status] ?? row.status}
</StatusBadge>
```

Domains that use `StatusBadge`: bookings, payments, invoices, attendance, reports, dispatch, maintenance/fuel, driver trips.

---

## 7. Variant library usage (`ui/*` only)

| Tool | Use for | Example components |
|---|---|---|
| **CVA** (`class-variance-authority`) | Simple primitives — variants on one element | `Button`, `Badge`, `Alert`, `Avatar` |
| **tailwind-variants** | Compound components with **slots** (parent + children) | `Select`, `Tabs`, `Dropdown` |

Feature code never uses CVA or tailwind-variants directly — it composes `ui/*` and `common/*` components.

All class composition uses `cn()` from `src/lib/cn.ts` (clsx + tailwind-merge).

---

## 8. Mobile / operational UX

This is operational fleet software, not a marketing SaaS.

| Audience | Priorities |
|---|---|
| Admin / staff | High information density; efficient tables and filters; minimal decorative chrome |
| Drivers (field) | Touch-friendly controls; large tap targets (min 44px); responsive layouts; low animation |
| All | Fast perceived performance; avoid gratuitous animations/transitions |

---

## 9. Phase 7+ new feature checklist

Before submitting a PR with new UI:

- [ ] Feature code only uses semantic utilities and shared components
- [ ] No `brand-*`, `gray-*`, hex, or opacity hacks in `src/app/*` or `src/modules/*`
- [ ] No arbitrary Tailwind values (or PR comment justification for allowlist)
- [ ] Status display uses `StatusBadge` + `StatusTone` — no inline `STATUS_COLOR`
- [ ] Spacing on approved scale; radius uses a tier token
- [ ] Subtle tints use paired `bg-*-subtle` + `text-on-*-subtle` tokens
- [ ] New `*.constants.ts` exports labels/tones only — no class strings, no server imports
- [ ] Shared layout patterns (stat cards, filter bars) use `StatCard`/`DateRangeFilterBar`
