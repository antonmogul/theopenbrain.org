# Dashboard Shared Library + Shell — Implementation Plan (Sub-project A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the unified, token-based shared component library + light-rail shell in `src/components/dashboard/shared/` that all three dashboards (and SettingsView) will consume.

**Architecture:** Rebuild the 12 dead Tailwind components to the SettingsView token aesthetic (`rgb(var(--color-*))`, `var(--font-*)`, no Tailwind/hex), add 7 new components (shell, section header, stat grid, list row, button, form field, preview tag), and promote 3 already-on-brand settings primitives (Switch, SegmentedControl, ToggleRow). Export everything from a flat barrel. Per-role accent flows via `[data-accent]` on the shell root.

**Tech Stack:** Vue 3 `<script setup>`, Vite, Tailwind (being migrated away from), CSS custom properties in `src/styles/brand.css`. No component-test convention exists; verification is `npm run build` + `npm run lint` + an import smoke-check.

**Verification contract (every task):** `npm run lint` must pass (auto-fixes), and after the barrel exists, `npm run build` must succeed. Components with real logic (BaseModal, DataTable, SearchInput, Pagination) preserve their existing behavior verbatim — only chrome changes.

**Spec:** `docs/superpowers/specs/2026-06-13-unified-dashboard-redesign-design.md` (§3).

---

## File Structure

All under `src/components/dashboard/shared/` unless noted:

- **Promote (move from `src/components/settings/`):** `Switch.vue`, `SegmentedControl.vue`, `ToggleRow.vue` + UI aliases `src/components/UI/Switch.vue`, `src/components/UI/SegmentedControl.vue`.
- **New:** `PreviewTag.vue`, `Button.vue`, `SectionHeader.vue`, `StatGrid.vue`, `ListRow.vue`, `FormField.vue`, `DashboardNavIcon.vue`, `DashboardRail.vue`, `DashboardShell.vue`.
- **Rebuild (overwrite existing):** `BaseCard.vue`, `StatCard.vue` (was `MetricCard.vue`), `StatusBadge.vue`, `EmptyState.vue`, `LoadingState.vue`, `ErrorState.vue`, `BaseModal.vue`, `ConfirmDialog.vue`, `SearchInput.vue`, `FilterChips.vue`, `DataTable.vue`, `Pagination.vue`.
- **Barrel:** `index.js`.

Dependency order: leaf primitives (PreviewTag, Switch, Button) → composites (SectionHeader, StatCard, etc.) → shell (depends on NavIcon + Rail) → barrel.

---

## Task 1: PreviewTag + promote Switch/SegmentedControl/ToggleRow

**Files:**
- Create: `src/components/dashboard/shared/PreviewTag.vue`
- Create: `src/components/dashboard/shared/Switch.vue`, `.../SegmentedControl.vue`, `.../ToggleRow.vue`
- Create: `src/components/UI/Switch.vue`, `src/components/UI/SegmentedControl.vue` (re-export shims)

- [ ] **Step 1: Create `PreviewTag.vue`**

```vue
<script setup>
// The "· preview" / "· coming soon" inline marker for not-yet-wired UI.
// Single source so every mocked surface looks identical (SettingsView .soon).
const props = defineProps({
  variant: { type: String, default: "preview" }, // preview | soon | beta
  bare: { type: Boolean, default: false }, // omit the leading "· "
});
const TEXT = { preview: "preview", soon: "coming soon", beta: "beta" };
</script>

<template>
  <span class="preview-tag">{{ bare ? "" : "· " }}<slot>{{ TEXT[variant] || variant }}</slot></span>
</template>

<style scoped>
.preview-tag {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute) / 0.7);
  letter-spacing: 0.04em;
}
</style>
```

- [ ] **Step 2: Move the three settings primitives**

```bash
cd /Users/antonmorrison/Documents/GitHub/the-open-brain/theopenbrain.org
git mv src/components/settings/SettingsSwitch.vue src/components/dashboard/shared/Switch.vue
git mv src/components/settings/SegmentedControl.vue src/components/dashboard/shared/SegmentedControl.vue
git mv src/components/settings/SettingsToggleRow.vue src/components/dashboard/shared/ToggleRow.vue
```

- [ ] **Step 3: Fix `ToggleRow.vue`'s import + add `preview` prop**

`ToggleRow.vue` imports `./SettingsSwitch.vue` — now it's a sibling `Switch.vue`. Change the import line to `import Switch from "./Switch.vue";` and the template tag `<SettingsSwitch ... />` to `<Switch ... />`. Add to its `defineProps`: `preview: { type: Boolean, default: false }`, and in the template after the label add `<PreviewTag v-if="preview" />` (import `PreviewTag from "./PreviewTag.vue"`). The `.toggle-row` / `.toggle-label` / `.toggle-hint` styles stay as-is (already token-based).

- [ ] **Step 4: Create UI re-export shims**

`src/components/UI/Switch.vue`:
```vue
<script>
export { default } from "@/components/dashboard/shared/Switch.vue";
</script>
```
`src/components/UI/SegmentedControl.vue`:
```vue
<script>
export { default } from "@/components/dashboard/shared/SegmentedControl.vue";
</script>
```

- [ ] **Step 5: Update SettingsView + section components to the new import paths**

These three files import the moved primitives. Update them:
- `src/views/SettingsView.vue`: `import SegmentedControl from "@/components/settings/SegmentedControl.vue";` → `"@/components/dashboard/shared/SegmentedControl.vue"`; `import SettingsToggleRow from "@/components/settings/SettingsToggleRow.vue";` → `import ToggleRow from "@/components/dashboard/shared/ToggleRow.vue";` and rename all `<SettingsToggleRow` → `<ToggleRow` in its template.
- Grep for other importers: `grep -rln "settings/SettingsSwitch\|settings/SegmentedControl\|settings/SettingsToggleRow" src/` and update each the same way.

- [ ] **Step 6: Lint + grep verify no stale imports**

```bash
npm run lint
grep -rn "SettingsSwitch\|settings/SegmentedControl\|SettingsToggleRow" src/ && echo "STALE IMPORTS REMAIN" || echo "clean"
```
Expected: lint passes; grep prints `clean`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "refactor: promote Switch/SegmentedControl/ToggleRow to dashboard/shared + add PreviewTag"
```

---

## Task 2: Button

**Files:** Create `src/components/dashboard/shared/Button.vue`

- [ ] **Step 1: Create `Button.vue`** (consolidates `.btn`/`.btn-solid`/`.btn-ghost`/`.btn-danger`)

```vue
<script setup>
// One pill button covering the variants scattered across SettingsProfileSection/
// SettingsAccountSection. Mono uppercase, token-based.
import { computed } from "vue";
const props = defineProps({
  variant: { type: String, default: "solid" }, // solid | ghost | outline | danger
  size: { type: String, default: "md" }, // sm | md | lg
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  as: { type: String, default: "button" }, // button | a | router-link
  to: { type: [String, Object], default: undefined },
});
defineEmits(["click"]);
const tag = computed(() => props.as);
</script>

<template>
  <component
    :is="tag"
    :to="as === 'router-link' ? to : undefined"
    :href="as === 'a' ? to : undefined"
    :type="as === 'button' ? 'button' : undefined"
    class="btn"
    :class="[`v-${variant}`, `s-${size}`, { block, loading }]"
    :disabled="as === 'button' ? (disabled || loading) : undefined"
    :aria-disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.btn.block { width: 100%; }
.s-sm { font-size: 1rem; padding: 6px 12px; }
.s-md { font-size: 1.1rem; padding: 9px 18px; }
.s-lg { font-size: 1.3rem; padding: 12px 24px; }

.v-solid { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); border-color: rgb(var(--color-ink)); }
.v-solid:hover { background: rgb(var(--color-ink) / 0.85); }
.v-outline { background: transparent; color: rgb(var(--color-ink)); border-color: rgb(var(--color-ink) / 0.85); }
.v-outline:hover { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); }
.v-ghost { background: transparent; color: rgb(var(--color-ink)); }
.v-ghost:hover { background: rgb(var(--color-ink) / 0.06); }
.v-danger { background: transparent; color: rgb(var(--color-accent)); border-color: rgb(var(--color-accent)); }
.v-danger:hover { background: rgb(var(--color-accent) / 0.08); }

.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

.spinner {
  width: 13px; height: 13px; border-radius: 999px;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: btn-spin 0.6s linear infinite;
}
@keyframes btn-spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/shared/Button.vue && git commit -m "feat: add token-based shared Button"
```

---

## Task 3: SectionHeader

**Files:** Create `src/components/dashboard/shared/SectionHeader.vue`

- [ ] **Step 1: Create `SectionHeader.vue`** (extracts SettingsView `.section-header`)

```vue
<script setup>
// Numbered-eyebrow section header: "NN · Title" → h2 → subtitle. Optional
// right-aligned actions slot and preview marker. Extracted from SettingsView.
import PreviewTag from "./PreviewTag.vue";
defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  preview: { type: Boolean, default: false },
});
</script>

<template>
  <header class="section-header">
    <div class="header-row">
      <div class="header-text">
        <p v-if="eyebrow" class="eyebrow">
          {{ eyebrow }} <PreviewTag v-if="preview" />
        </p>
        <h2>{{ title }}</h2>
      </div>
      <div v-if="$slots.actions" class="header-actions"><slot name="actions" /></div>
    </div>
    <p v-if="subtitle || $slots.default" class="subtitle">
      <slot>{{ subtitle }}</slot>
    </p>
  </header>
</template>

<style scoped>
.section-header { margin-bottom: 28px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.header-actions { flex: none; display: flex; align-items: center; gap: 8px; padding-top: 4px; }
.eyebrow {
  font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
  letter-spacing: 0.12em; color: rgb(var(--color-mute)); margin: 0 0 10px;
}
h2 {
  font-family: var(--font-body); font-size: 3.2rem; font-weight: 500;
  line-height: 1.1; letter-spacing: -0.012em; margin: 0;
}
.subtitle {
  font-family: var(--font-body); font-size: 1.6rem; line-height: 1.5;
  color: rgb(var(--color-mute)); margin: 8px 0 0; max-width: 64rem;
}
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/SectionHeader.vue && git commit -m "feat: add SectionHeader (eyebrow + title + subtitle)"
```

---

## Task 4: BaseCard, StatGrid, ListRow, StatCard

**Files:** Create/overwrite `BaseCard.vue`, `StatGrid.vue`, `ListRow.vue`; rebuild `MetricCard.vue` → `StatCard.vue`.

- [ ] **Step 1: Overwrite `BaseCard.vue`**

```vue
<script setup>
// Bordered token surface card (SettingsView .bordered-card / .rows-card).
import { computed } from "vue";
const props = defineProps({
  padding: { type: String, default: "md" }, // none | sm | md | lg
  interactive: { type: Boolean, default: false },
  as: { type: String, default: "div" },
});
defineEmits(["click"]);
const tag = computed(() => props.as);
</script>

<template>
  <component
    :is="tag" class="base-card" :class="[`p-${padding}`, { interactive }]"
    @click="interactive && $emit('click', $event)"
  >
    <div v-if="$slots.header" class="card-header"><slot name="header" /></div>
    <slot />
    <div v-if="$slots.footer" class="card-footer"><slot name="footer" /></div>
  </component>
</template>

<style scoped>
.base-card {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  text-align: left;
  transition: border-color 0.12s ease;
}
.p-none { padding: 0; }
.p-sm { padding: 12px; }
.p-md { padding: 20px; }
.p-lg { padding: 28px; }
.interactive { cursor: pointer; }
.interactive:hover { border-color: rgb(var(--color-ink) / 0.35); }
.card-header { border-bottom: 1px solid rgb(var(--color-line)); margin: -20px -20px 16px; padding: 16px 20px; }
.card-footer { border-top: 1px solid rgb(var(--color-line)); margin: 16px -20px -20px; padding: 16px 20px; }
</style>
```

- [ ] **Step 2: Create `StatGrid.vue`** (SettingsView `.stats-grid`)

```vue
<script setup>
defineProps({
  columns: { type: Number, default: 4 },
  bordered: { type: Boolean, default: true },
});
</script>

<template>
  <div class="stat-grid" :class="{ bordered }" :style="{ '--cols': columns }">
    <slot />
  </div>
</template>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(var(--cols), 1fr); }
.stat-grid:not(.bordered) { gap: 16px; }
.stat-grid.bordered {
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
}
.stat-grid.bordered :slotted(*) { border-right: 1px solid rgb(var(--color-line)); }
.stat-grid.bordered :slotted(*:last-child) { border-right: 0; }
@media (max-width: 767px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
```

- [ ] **Step 3: Rebuild as `StatCard.vue` (delete `MetricCard.vue`)**

```bash
git rm src/components/dashboard/shared/MetricCard.vue
```
Create `src/components/dashboard/shared/StatCard.vue`:
```vue
<script setup>
// Big-number stat: value + mono uppercase label, optional delta + icon.
// Replaces MetricCard. Delta tone maps to semantic tokens (not hardcoded green/red).
import { computed } from "vue";
import PreviewTag from "./PreviewTag.vue";
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: "" },
  prefix: { type: String, default: "" },
  suffix: { type: String, default: "" },
  delta: { type: Number, default: null },
  deltaLabel: { type: String, default: "" },
  tone: { type: String, default: "auto" }, // auto | accent | complete | warn | mute
  preview: { type: Boolean, default: false },
});
const display = computed(() => {
  if (props.preview) return "—";
  return typeof props.value === "number" ? props.value.toLocaleString() : props.value;
});
const deltaTone = computed(() => {
  if (props.tone !== "auto") return props.tone;
  if (props.delta == null) return "mute";
  return props.delta >= 0 ? "complete" : "warn";
});
</script>

<template>
  <div class="stat" :class="`pad`">
    <span class="stat-value">{{ prefix }}{{ display }}{{ preview ? "" : suffix }}</span>
    <span class="stat-label">{{ label }} <PreviewTag v-if="preview" /></span>
    <span v-if="delta != null && !preview" class="stat-delta" :class="`t-${deltaTone}`">
      {{ delta >= 0 ? "+" : "" }}{{ delta }}% {{ deltaLabel }}
    </span>
  </div>
</template>

<style scoped>
.stat.pad { padding: 20px 10px; }
.stat-value {
  display: block; font-family: var(--font-body); font-size: 3.2rem;
  font-weight: 500; line-height: 1; letter-spacing: -0.01em; color: rgb(var(--color-ink));
}
.stat-label {
  display: block; font-family: var(--font-mono); font-size: 1rem;
  text-transform: uppercase; letter-spacing: 0.1em; color: rgb(var(--color-mute)); margin-top: 6px;
}
.stat-delta { display: block; font-family: var(--font-mono); font-size: 1.1rem; margin-top: 6px; }
.t-complete { color: rgb(var(--color-complete)); }
.t-warn { color: rgb(var(--color-warn)); }
.t-accent { color: rgb(var(--color-accent)); }
.t-mute { color: rgb(var(--color-mute)); }
</style>
```

- [ ] **Step 4: Create `ListRow.vue`** (extracts SettingsAccount `.row`)

```vue
<script setup>
// label + hint on the left, action on the right; optional left media. Bottom
// hairline. Extracted from SettingsAccountSection .rows-card .row.
defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  interactive: { type: Boolean, default: false },
  divider: { type: Boolean, default: true },
});
defineEmits(["click"]);
</script>

<template>
  <div
    class="list-row" :class="{ interactive, divider }"
    @click="interactive && $emit('click', $event)"
  >
    <div v-if="$slots.media" class="row-media"><slot name="media" /></div>
    <div class="row-text">
      <div class="row-label"><slot name="label">{{ label }}</slot></div>
      <div v-if="hint || $slots.hint" class="row-hint"><slot name="hint">{{ hint }}</slot></div>
    </div>
    <div v-if="$slots.default || $slots.action" class="row-action">
      <slot name="action"><slot /></slot>
    </div>
  </div>
</template>

<style scoped>
.list-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; }
.list-row.divider { border-bottom: 1px solid rgb(var(--color-line)); }
.list-row.interactive { cursor: pointer; }
.list-row.interactive:hover { background: rgb(var(--color-ink) / 0.03); }
.row-media { flex: none; }
.row-text { flex: 1; min-width: 0; }
.row-label { font-family: var(--font-body); font-size: 1.5rem; color: rgb(var(--color-ink)); }
.row-hint { font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-mute)); margin-top: 2px; line-height: 1.45; }
.row-action { flex: none; }
</style>
```

- [ ] **Step 5: Lint + Commit**

```bash
npm run lint
git add -A && git commit -m "feat: rebuild BaseCard + StatCard, add StatGrid + ListRow (token-based)"
```

---

## Task 5: FormField

**Files:** Create `src/components/dashboard/shared/FormField.vue`

- [ ] **Step 1: Create `FormField.vue`** (extracts SettingsProfileSection `.field`)

```vue
<script setup>
// Labeled field wrapper: mono uppercase label + control slot + hint/error.
// Slotted inputs get the .input chrome via :deep so callers pass bare elements.
defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
});
</script>

<template>
  <label class="field">
    <span v-if="label" class="field-label">
      {{ label }}<span v-if="required" class="req" aria-hidden="true"> *</span>
    </span>
    <slot />
    <span v-if="error" class="field-error">{{ error }}</span>
    <span v-else-if="hint" class="field-hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase;
  letter-spacing: 0.1em; color: rgb(var(--color-mute));
}
.req { color: rgb(var(--color-accent)); }
.field-hint { font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-mute)); margin-top: 4px; line-height: 1.45; }
.field-error { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-accent)); margin-top: 4px; }

/* Style slotted native controls consistently (boxed token input). */
.field :deep(input),
.field :deep(select),
.field :deep(textarea) {
  width: 100%; border: 1px solid rgb(var(--color-line)); border-radius: 4px;
  background: transparent; padding: 10px 12px;
  font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); outline: none;
  transition: border-color 0.12s ease;
}
.field :deep(input:focus),
.field :deep(select:focus),
.field :deep(textarea:focus) { border-color: rgb(var(--color-ink)); }
.field :deep(textarea) { line-height: 1.5; resize: vertical; }
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/FormField.vue && git commit -m "feat: add FormField wrapper"
```

---

## Task 6: States — EmptyState, LoadingState, ErrorState

**Files:** Overwrite `EmptyState.vue`, `LoadingState.vue`, `ErrorState.vue`

- [ ] **Step 1: Overwrite `EmptyState.vue`**

```vue
<script setup>
import Button from "./Button.vue";
defineProps({
  title: { type: String, default: "Nothing here yet" },
  message: { type: String, default: "" },
  actionLabel: { type: String, default: "" },
});
defineEmits(["action"]);
</script>

<template>
  <div class="state">
    <div v-if="$slots.icon" class="state-icon"><slot name="icon" /></div>
    <h3 class="state-title">{{ title }}</h3>
    <p v-if="message" class="state-msg">{{ message }}</p>
    <div v-if="$slots.action || actionLabel" class="state-action">
      <slot name="action">
        <Button v-if="actionLabel" variant="outline" size="sm" @click="$emit('action')">{{ actionLabel }}</Button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; gap: 8px; }
.state-icon { color: rgb(var(--color-mute)); opacity: 0.6; margin-bottom: 8px; }
.state-title { font-family: var(--font-body); font-size: 1.8rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.state-msg { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-mute)); margin: 0; max-width: 42rem; line-height: 1.5; }
.state-action { margin-top: 12px; }
</style>
```

- [ ] **Step 2: Overwrite `LoadingState.vue`**

```vue
<script setup>
defineProps({
  message: { type: String, default: "Loading…" },
  size: { type: String, default: "md" }, // sm | md | lg
  inline: { type: Boolean, default: false },
});
</script>

<template>
  <div class="loading" :class="[{ inline }, `s-${size}`]">
    <span class="spinner" aria-hidden="true" />
    <span v-if="message" class="loading-msg">{{ message }}</span>
  </div>
</template>

<style scoped>
.loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 48px 24px; }
.loading.inline { padding: 0; }
.spinner { border-radius: 999px; border: 2px solid rgb(var(--color-line)); border-top-color: rgb(var(--color-accent)); animation: ls-spin 0.7s linear infinite; }
.s-sm .spinner { width: 16px; height: 16px; }
.s-md .spinner { width: 22px; height: 22px; }
.s-lg .spinner { width: 32px; height: 32px; border-width: 3px; }
.loading-msg { font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-mute)); text-transform: uppercase; letter-spacing: 0.08em; }
@keyframes ls-spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 3: Overwrite `ErrorState.vue`**

```vue
<script setup>
import Button from "./Button.vue";
defineProps({
  title: { type: String, default: "Something went wrong" },
  message: { type: String, default: "" },
  retryLabel: { type: String, default: "Try again" },
  showRetry: { type: Boolean, default: true },
});
defineEmits(["retry"]);
</script>

<template>
  <div class="state">
    <div class="state-icon"><slot name="icon">⚠</slot></div>
    <h3 class="state-title">{{ title }}</h3>
    <p v-if="message" class="state-msg">{{ message }}</p>
    <div v-if="showRetry || $slots.action" class="state-action">
      <slot name="action">
        <Button variant="outline" size="sm" @click="$emit('retry')">{{ retryLabel }}</Button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; gap: 8px; }
.state-icon { color: rgb(var(--color-warn)); font-size: 2.4rem; margin-bottom: 4px; }
.state-title { font-family: var(--font-body); font-size: 1.8rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.state-msg { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-mute)); margin: 0; max-width: 42rem; line-height: 1.5; }
.state-action { margin-top: 12px; }
</style>
```

- [ ] **Step 4: Lint + Commit**

```bash
npm run lint
git add -A && git commit -m "feat: rebuild Empty/Loading/Error states (token-based)"
```

---

## Task 7: StatusBadge + FilterChips

**Files:** Overwrite `StatusBadge.vue`, `FilterChips.vue`

- [ ] **Step 1: Overwrite `StatusBadge.vue`** (drop the `STATUS_COLORS` Tailwind map)

```vue
<script setup>
import { computed } from "vue";
const props = defineProps({
  variant: { type: String, default: "neutral" }, // neutral | accent | complete | warn
  status: { type: String, default: "" }, // optional convenience
  size: { type: String, default: "sm" }, // sm | md | lg
  dot: { type: Boolean, default: false },
});
// Map known domain statuses → variant + auto-label when `status` is given.
const STATUS_MAP = {
  published: "complete", active: "complete", completed: "complete", passed: "complete",
  draft: "warn", pending: "warn", failed: "warn",
  archived: "neutral", inactive: "neutral",
};
const resolved = computed(() => (props.status ? STATUS_MAP[props.status.toLowerCase()] || "neutral" : props.variant));
const autoLabel = computed(() => props.status.charAt(0).toUpperCase() + props.status.slice(1));
</script>

<template>
  <span class="badge" :class="[`v-${resolved}`, `s-${size}`]">
    <span v-if="dot" class="dot" aria-hidden="true" />
    <slot>{{ autoLabel }}</slot>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em;
  border-radius: 999px; border: 1px solid transparent; white-space: nowrap;
}
.s-sm { font-size: 1rem; padding: 3px 9px; }
.s-md { font-size: 1.1rem; padding: 4px 11px; }
.s-lg { font-size: 1.3rem; padding: 6px 14px; }
.dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.v-neutral { color: rgb(var(--color-mute)); background: rgb(var(--color-mute) / 0.1); }
.v-accent { color: rgb(var(--color-accent)); background: rgb(var(--color-accent) / 0.1); }
.v-complete { color: rgb(var(--color-complete)); background: rgb(var(--color-complete) / 0.12); }
.v-warn { color: rgb(var(--color-warn)); background: rgb(var(--color-warn) / 0.12); }
</style>
```

- [ ] **Step 2: Overwrite `FilterChips.vue`** (SettingsView `.hl-chip` pill, token accent)

```vue
<script setup>
const props = defineProps({
  options: { type: Array, required: true }, // [{ value, label, count? }]
  modelValue: { type: [String, Array], default: "" },
  showCounts: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);
function isSelected(v) {
  return props.multiple ? (props.modelValue || []).includes(v) : props.modelValue === v;
}
function select(v) {
  if (!props.multiple) return emit("update:modelValue", v);
  const set = new Set(props.modelValue || []);
  set.has(v) ? set.delete(v) : set.add(v);
  emit("update:modelValue", [...set]);
}
</script>

<template>
  <div class="chips">
    <button
      v-for="o in options" :key="o.value" type="button"
      class="chip" :class="{ on: isSelected(o.value) }" @click="select(o.value)"
    >
      {{ o.label }}<span v-if="showCounts && o.count != null" class="chip-count">{{ o.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px;
  border: 1px solid rgb(var(--color-line)); border-radius: 999px; background: transparent;
  font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
  letter-spacing: 0.06em; color: rgb(var(--color-mute)); cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;
}
.chip:hover { color: rgb(var(--color-ink)); }
.chip.on { border-color: rgb(var(--color-accent)); color: rgb(var(--color-accent)); }
.chip-count { font-size: 1rem; opacity: 0.7; }
</style>
```

- [ ] **Step 3: Lint + Commit**

```bash
npm run lint
git add -A && git commit -m "feat: rebuild StatusBadge + FilterChips (token-based)"
```

---

## Task 8: BaseModal (rebuild, preserve logic)

**Files:** Overwrite `BaseModal.vue`

- [ ] **Step 1: Overwrite `BaseModal.vue`** — preserve escape/scroll-lock/teleport/transition logic verbatim; `show`→`modelValue` with `show` alias; token chrome.

```vue
<script setup>
// Teleported scrim dialog. Logic (escape, backdrop, body-scroll-lock, transitions)
// preserved from the original; chrome rebuilt to tokens. v-model:open via modelValue.
import { watch, onMounted, onUnmounted, computed } from "vue";
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  show: { type: Boolean, default: undefined }, // deprecated alias
  title: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md | lg | xl | full
  closeOnBackdrop: { type: Boolean, default: true },
  closeOnEscape: { type: Boolean, default: true },
});
const emit = defineEmits(["update:modelValue", "close"]);
const open = computed(() => (props.show !== undefined ? props.show : props.modelValue));
function close() { emit("update:modelValue", false); emit("close"); }
function handleBackdropClick() { if (props.closeOnBackdrop) close(); }
function handleEscape(e) { if (e.key === "Escape" && props.closeOnEscape && open.value) close(); }
watch(open, (v) => { document.body.style.overflow = v ? "hidden" : ""; });
onMounted(() => document.addEventListener("keydown", handleEscape));
onUnmounted(() => { document.removeEventListener("keydown", handleEscape); document.body.style.overflow = ""; });
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-root">
        <div class="modal-backdrop" @click="handleBackdropClick" />
        <div class="modal-wrap">
          <div class="modal-panel" :class="`sz-${size}`" @click.stop>
            <div v-if="title || $slots.header" class="modal-header">
              <slot name="header"><h3 class="modal-title">{{ title }}</h3></slot>
              <button type="button" class="modal-close" aria-label="Close" @click="close">✕</button>
            </div>
            <div class="modal-body"><slot /></div>
            <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-root { position: fixed; inset: 0; z-index: 50; overflow-y: auto; }
.modal-backdrop { position: fixed; inset: 0; background: rgb(var(--color-ink) / 0.4); }
.modal-wrap { position: relative; display: flex; min-height: 100%; align-items: center; justify-content: center; padding: 16px; }
.modal-panel {
  position: relative; width: 100%; background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line)); border-radius: 6px;
  box-shadow: 0 20px 60px rgb(var(--color-ink) / 0.18);
}
.sz-sm { max-width: 28rem; } .sz-md { max-width: 36rem; } .sz-lg { max-width: 52rem; }
.sz-xl { max-width: 72rem; } .sz-full { max-width: 96rem; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid rgb(var(--color-line)); }
.modal-title { font-family: var(--font-body); font-size: 2rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.modal-close { border: 0; background: transparent; color: rgb(var(--color-mute)); font-size: 1.6rem; cursor: pointer; line-height: 1; }
.modal-close:hover { color: rgb(var(--color-ink)); }
.modal-body { padding: 22px; }
.modal-footer { padding: 16px 22px; border-top: 1px solid rgb(var(--color-line)); display: flex; justify-content: flex-end; gap: 8px; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/BaseModal.vue && git commit -m "feat: rebuild BaseModal to tokens (modelValue, logic preserved)"
```

---

## Task 9: ConfirmDialog

**Files:** Overwrite `ConfirmDialog.vue`

- [ ] **Step 1: Overwrite `ConfirmDialog.vue`** (built on BaseModal + Button)

```vue
<script setup>
import { computed } from "vue";
import BaseModal from "./BaseModal.vue";
import Button from "./Button.vue";
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  show: { type: Boolean, default: undefined },
  title: { type: String, default: "Confirm" },
  message: { type: String, default: "Are you sure?" },
  confirmLabel: { type: String, default: "Confirm" },
  cancelLabel: { type: String, default: "Cancel" },
  variant: { type: String, default: "danger" }, // danger | warn | info
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);
const confirmVariant = computed(() => (props.variant === "info" ? "solid" : "danger"));
function cancel() { emit("update:modelValue", false); emit("cancel"); }
</script>

<template>
  <BaseModal
    :model-value="show !== undefined ? show : modelValue" :title="title" size="sm"
    @update:model-value="$emit('update:modelValue', $event)" @close="cancel"
  >
    <p class="confirm-msg"><slot>{{ message }}</slot></p>
    <template #footer>
      <Button variant="ghost" size="sm" @click="cancel">{{ cancelLabel }}</Button>
      <Button :variant="confirmVariant" size="sm" :loading="loading" @click="$emit('confirm')">{{ confirmLabel }}</Button>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-msg { font-family: var(--font-body); font-size: 1.5rem; line-height: 1.5; color: rgb(var(--color-ink)); margin: 0; }
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/ConfirmDialog.vue && git commit -m "feat: rebuild ConfirmDialog on BaseModal + Button"
```

---

## Task 10: SearchInput (rebuild, preserve debounce)

**Files:** Overwrite `SearchInput.vue`

- [ ] **Step 1: Overwrite `SearchInput.vue`** — preserve debounce + clear logic verbatim; token chrome; inline SVG icon kept but recolored via currentColor.

```vue
<script setup>
// Debounced search field. Debounce/clear logic preserved from original; token chrome.
import { ref, watch } from "vue";
const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Search…" },
  debounce: { type: Number, default: 300 },
});
const emit = defineEmits(["update:modelValue", "search"]);
const localValue = ref(props.modelValue);
let debounceTimer = null;
watch(() => props.modelValue, (v) => { localValue.value = v; });
function handleInput(e) {
  localValue.value = e.target.value;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit("update:modelValue", localValue.value);
    emit("search", localValue.value);
  }, props.debounce);
}
function clear() { localValue.value = ""; emit("update:modelValue", ""); emit("search", ""); }
</script>

<template>
  <div class="search">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
    <input type="text" :value="localValue" :placeholder="placeholder" class="search-input" @input="handleInput" />
    <button v-if="localValue" type="button" class="search-clear" aria-label="Clear" @click="clear">✕</button>
  </div>
</template>

<style scoped>
.search { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: rgb(var(--color-mute)); pointer-events: none; }
.search-input {
  width: 100%; border: 1px solid rgb(var(--color-line)); border-radius: 4px; background: transparent;
  padding: 9px 34px 9px 36px; font-family: var(--font-body); font-size: 1.4rem;
  color: rgb(var(--color-ink)); outline: none; transition: border-color 0.12s ease;
}
.search-input::placeholder { color: rgb(var(--color-mute)); }
.search-input:focus { border-color: rgb(var(--color-ink)); }
.search-clear { position: absolute; right: 10px; border: 0; background: transparent; color: rgb(var(--color-mute)); cursor: pointer; font-size: 1.3rem; line-height: 1; }
.search-clear:hover { color: rgb(var(--color-ink)); }
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/SearchInput.vue && git commit -m "feat: rebuild SearchInput to tokens (debounce preserved)"
```

---

## Task 11: Pagination (rebuild, preserve windowing)

**Files:** Overwrite `Pagination.vue`

- [ ] **Step 1: Overwrite `Pagination.vue`** — preserve `visiblePages` windowing + `goToPage` + `from/toItem` computeds verbatim; token chrome.

```vue
<script setup>
// Page controls + "showing X–Y of N". Window logic preserved from original; token chrome.
import { computed } from "vue";
const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, default: 0 },
  pageSize: { type: Number, default: 20 },
  showInfo: { type: Boolean, default: true },
});
const emit = defineEmits(["page-change"]);
const fromItem = computed(() => (props.currentPage - 1) * props.pageSize + 1);
const toItem = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems));
const hasPrevious = computed(() => props.currentPage > 1);
const hasNext = computed(() => props.currentPage < props.totalPages);
const visiblePages = computed(() => {
  const pages = []; const total = props.totalPages; const current = props.currentPage;
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages.push(1);
    if (current > 3) pages.push("…");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push("…");
    pages.push(total);
  }
  return pages;
});
function goToPage(page) { if (page !== "…" && page !== props.currentPage) emit("page-change", page); }
</script>

<template>
  <div class="pagination">
    <div v-if="showInfo && totalItems > 0" class="page-info">Showing {{ fromItem }}–{{ toItem }} of {{ totalItems }}</div>
    <div v-else-if="showInfo" class="page-info">No results</div>
    <nav v-if="totalPages > 1" class="page-nav">
      <button type="button" class="page-btn" :disabled="!hasPrevious" @click="goToPage(currentPage - 1)">‹</button>
      <template v-for="(page, i) in visiblePages" :key="i">
        <span v-if="page === '…'" class="page-ellipsis">…</span>
        <button v-else type="button" class="page-btn" :class="{ current: page === currentPage }" @click="goToPage(page)">{{ page }}</button>
      </template>
      <button type="button" class="page-btn" :disabled="!hasNext" @click="goToPage(currentPage + 1)">›</button>
    </nav>
  </div>
</template>

<style scoped>
.pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.page-info { font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgb(var(--color-mute)); }
.page-nav { display: flex; align-items: center; gap: 4px; }
.page-btn {
  min-width: 32px; padding: 6px 10px; border: 1px solid transparent; border-radius: 999px;
  background: transparent; font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-ink)); cursor: pointer;
}
.page-btn:hover:not(:disabled):not(.current) { background: rgb(var(--color-ink) / 0.06); }
.page-btn.current { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-ellipsis { padding: 0 6px; color: rgb(var(--color-mute)); }
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/Pagination.vue && git commit -m "feat: rebuild Pagination to tokens (windowing preserved)"
```

---

## Task 12: DataTable (rebuild, preserve API)

**Files:** Overwrite `DataTable.vue`. First read the existing file to preserve its sort/select API exactly.

- [ ] **Step 1: Read the existing DataTable to capture its full API**

Run: `cat src/components/dashboard/shared/DataTable.vue`
Capture: prop names (`columns`, `data`, `rowKey`, `selectable`, `hoverable`, `striped`, `compact`), emits (`row-click`, `sort`, `select`), slot names (`cell-<key>`, `empty`), and the internal sort state logic.

- [ ] **Step 2: Overwrite `DataTable.vue`** — keep the captured logic/emits; rename `compact`→`dense`; mono uppercase token headers; hairline rows; empty slot defaults to `<EmptyState>`; add `header-<key>` slot. Preserve the exact sort-toggle behavior and `cell-<key>`/`{ row, value }` slot contract observed in Step 1. (Write the full component with token `<style scoped>` — no Tailwind, no hex.)

- [ ] **Step 3: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/DataTable.vue && git commit -m "feat: rebuild DataTable to tokens (API preserved, compact→dense)"
```

---

## Task 13: DashboardNavIcon

**Files:** Create `src/components/dashboard/shared/DashboardNavIcon.vue`

- [ ] **Step 1: Read the icon switch from DashboardSidebar + the extra glyphs from StudentSidebar**

Run: `sed -n '84,296p' src/components/dashboard/DashboardSidebar.vue` (the `grid/book/layers/image/quiz/users/chart/folder/clipboard/graduation/share` SVGs) and `grep -n "icon ===" src/components/student/StudentSidebar.vue` to find `highlight/notes/progress/settings` glyphs.

- [ ] **Step 2: Create `DashboardNavIcon.vue`** — single `<svg>` with the full `v-if/v-else-if` chain (24×24, `stroke="currentColor"`, `stroke-width="2"`, `aria-hidden="true"`). Names: `grid book layers image quiz flashcard highlight notes progress users chart folder clipboard graduation share settings`. `progress` reuses the `chart` bars glyph; `flashcard` = two stacked rounded rects; pull `highlight/notes/settings` from StudentSidebar. Default fallback = circle. (Copy the exact SVG path data from Step 1's output; do not invent paths for the existing names.)

- [ ] **Step 3: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/DashboardNavIcon.vue && git commit -m "feat: extract DashboardNavIcon from sidebar SVG switch"
```

---

## Task 14: DashboardRail

**Files:** Create `src/components/dashboard/shared/DashboardRail.vue`

- [ ] **Step 1: Create `DashboardRail.vue`** (SettingsView `.rail` aesthetic, tab-switch behavior)

```vue
<script setup>
// The unified light rail: user card + accent-bar nav + back-link. SettingsView
// .rail aesthetic, click-to-switch (not scroll-spy). Accent inherited via
// [data-accent] on the parent shell — the rail never takes an accent value.
import { computed } from "vue";
import DashboardNavIcon from "./DashboardNavIcon.vue";
const props = defineProps({
  navItems: { type: Array, required: true }, // [{ id, label, icon?, count?, soon? }]
  activeSection: { type: String, required: true },
  displayName: { type: String, default: "Reader" },
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  backLabel: { type: String, default: "Back to book" },
  backTo: { type: [String, Object], default: "/" },
  showBack: { type: Boolean, default: true },
});
const emit = defineEmits(["update:activeSection", "back"]);
const initials = computed(() => {
  const n = props.displayName || props.email || "?";
  return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
});
const metaLine = computed(() => (props.role ? props.role.toUpperCase() : props.email));
</script>

<template>
  <aside class="rail">
    <slot name="user">
      <div class="rail-user">
        <div class="rail-avatar" aria-hidden="true">{{ initials }}</div>
        <div class="rail-name">{{ displayName }}</div>
        <div v-if="metaLine" class="rail-meta">{{ metaLine }}</div>
      </div>
    </slot>

    <nav class="rail-nav">
      <button
        v-for="item in navItems" :key="item.id" type="button"
        class="rail-link" :class="{ active: activeSection === item.id }"
        @click="$emit('update:activeSection', item.id)"
      >
        <span class="rail-bar" />
        <DashboardNavIcon v-if="item.icon" :name="item.icon" class="rail-icon" />
        <span class="rail-label">{{ item.label }}</span>
        <span v-if="item.soon" class="rail-soon">· soon</span>
        <span v-else-if="item.count != null" class="rail-count">{{ item.count }}</span>
      </button>
    </nav>

    <slot name="footer">
      <template v-if="showBack">
        <hr class="rail-rule" />
        <router-link v-if="backTo" :to="backTo" class="rail-back">← {{ backLabel }}</router-link>
        <button v-else type="button" class="rail-back" @click="$emit('back')">← {{ backLabel }}</button>
      </template>
    </slot>
  </aside>
</template>

<style scoped>
.rail { align-self: start; display: flex; flex-direction: column; gap: 4px; }
@media (min-width: 900px) { .rail { position: sticky; top: 4rem; } }
.rail-user { margin-bottom: 18px; }
.rail-avatar {
  width: 80px; height: 80px; border-radius: 999px; background: rgb(var(--color-accent));
  color: rgb(var(--color-paper)); display: grid; place-items: center;
  font-family: var(--font-mono); font-size: 2.6rem; font-weight: 600;
}
.rail-name { font-family: var(--font-body); font-size: 2.2rem; letter-spacing: -0.01em; margin-top: 14px; color: rgb(var(--color-ink)); }
.rail-meta { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
.rail-nav { display: flex; flex-direction: column; }
.rail-link {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 10px 0; border: 0; background: transparent; cursor: pointer; color: rgb(var(--color-mute));
}
.rail-bar { width: 4px; height: 16px; flex: none; background: transparent; transition: background 200ms ease; }
.rail-icon { flex: none; opacity: 0.7; }
.rail-label { font-family: var(--font-body); font-size: 1.5rem; font-weight: 400; flex: 1; }
.rail-soon { font-family: var(--font-mono); font-size: 1rem; color: rgb(var(--color-mute) / 0.7); }
.rail-count { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); }
.rail-link:hover { color: rgb(var(--color-ink)); }
.rail-link:hover .rail-icon { opacity: 1; }
.rail-link.active { color: rgb(var(--color-ink)); }
.rail-link.active .rail-bar { background: rgb(var(--color-accent)); }
.rail-link.active .rail-icon { opacity: 1; }
.rail-link.active .rail-label { font-weight: 500; }
.rail-rule { border: 0; border-top: 1px solid rgb(var(--color-line)); margin: 20px 0 12px; width: 100%; }
.rail-back { font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgb(var(--color-ink)); text-decoration: none; background: transparent; border: 0; cursor: pointer; text-align: left; padding: 0; }
.rail-back:hover { color: rgb(var(--color-accent)); }
</style>
```

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/DashboardRail.vue && git commit -m "feat: add DashboardRail (light token rail, accent-bar nav)"
```

---

## Task 15: DashboardShell

**Files:** Create `src/components/dashboard/shared/DashboardShell.vue`

- [ ] **Step 1: Create `DashboardShell.vue`** (2-column grid, owns `[data-accent]` + sticky/responsive)

```vue
<script setup>
// Unified 2-column dashboard frame: sticky light rail + scrollable content.
// Owns per-role accent via [data-accent] on its root, and the responsive grid
// (mirrors SettingsView .layout). Forwards rail props + re-emits its events.
import DashboardRail from "./DashboardRail.vue";
defineProps({
  navItems: { type: Array, required: true },
  activeSection: { type: String, required: true },
  displayName: { type: String, default: "Reader" },
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  accent: { type: String, default: "magenta" }, // magenta | teal | amber | mono
  backLabel: { type: String, default: "Back to book" },
  backTo: { type: [String, Object], default: "/" },
  showBack: { type: Boolean, default: true },
});
defineEmits(["update:activeSection", "back"]);
</script>

<template>
  <div class="shell" :data-accent="accent === 'magenta' ? null : accent">
    <div class="shell-layout">
      <DashboardRail
        :nav-items="navItems" :active-section="activeSection" :display-name="displayName"
        :email="email" :role="role" :back-label="backLabel" :back-to="backTo" :show-back="showBack"
        @update:active-section="$emit('update:activeSection', $event)" @back="$emit('back')"
      >
        <template v-if="$slots.user" #user><slot name="user" /></template>
        <template v-if="$slots.footer" #footer><slot name="footer" /></template>
      </DashboardRail>
      <div class="shell-content"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.shell { background: rgb(var(--color-bg)); color: rgb(var(--color-ink)); font-family: var(--font-body); min-height: 100vh; }
.shell-layout {
  display: grid; grid-template-columns: 1fr; max-width: 124rem; margin: 0 auto;
  padding: 4rem 4.8rem 9.6rem; gap: 4.8rem;
}
@media (min-width: 900px) { .shell-layout { grid-template-columns: 28rem 1fr; } }
@media (max-width: 767px) { .shell-layout { padding: 2.4rem 1.8rem 8rem; } }
.shell-content { display: flex; flex-direction: column; gap: 6.4rem; min-width: 0; }
</style>
```

Note: `magenta` is the `:root` default, so we set `data-accent` to `null` for it (avoids an unnecessary attribute) and to the literal value otherwise.

- [ ] **Step 2: Lint + Commit**

```bash
npm run lint
git add src/components/dashboard/shared/DashboardShell.vue && git commit -m "feat: add DashboardShell (2-col frame, per-role [data-accent])"
```

---

## Task 16: Barrel index.js + full build verification

**Files:** Overwrite `src/components/dashboard/shared/index.js`

- [ ] **Step 1: Overwrite `index.js`** with the flat barrel

```js
// Unified dashboard component library — token-based.
// Layout
export { default as DashboardShell } from "./DashboardShell.vue";
export { default as DashboardRail } from "./DashboardRail.vue";
export { default as DashboardNavIcon } from "./DashboardNavIcon.vue";
export { default as SectionHeader } from "./SectionHeader.vue";
// Cards & stats
export { default as BaseCard } from "./BaseCard.vue";
export { default as StatCard } from "./StatCard.vue";
export { default as StatGrid } from "./StatGrid.vue";
export { default as ListRow } from "./ListRow.vue";
// Data display
export { default as DataTable } from "./DataTable.vue";
export { default as StatusBadge } from "./StatusBadge.vue";
// States
export { default as EmptyState } from "./EmptyState.vue";
export { default as LoadingState } from "./LoadingState.vue";
export { default as ErrorState } from "./ErrorState.vue";
// Overlays
export { default as BaseModal } from "./BaseModal.vue";
export { default as ConfirmDialog } from "./ConfirmDialog.vue";
// Inputs & controls
export { default as Button } from "./Button.vue";
export { default as SearchInput } from "./SearchInput.vue";
export { default as FilterChips } from "./FilterChips.vue";
export { default as SegmentedControl } from "./SegmentedControl.vue";
export { default as ToggleRow } from "./ToggleRow.vue";
export { default as Switch } from "./Switch.vue";
export { default as FormField } from "./FormField.vue";
// Markers
export { default as PreviewTag } from "./PreviewTag.vue";
// Pagination
export { default as Pagination } from "./Pagination.vue";
// Temporary alias for any dead code still importing MetricCard.
export { default as MetricCard } from "./StatCard.vue";
```

- [ ] **Step 2: Full production build**

```bash
npm run build
```
Expected: build succeeds (exit 0), no unresolved imports.

- [ ] **Step 3: Import smoke check** — verify every barrel export resolves to a real `.vue`

```bash
node -e "const fs=require('fs');const idx=fs.readFileSync('src/components/dashboard/shared/index.js','utf8');const files=[...idx.matchAll(/from \"\.\/(.+\.vue)\"/g)].map(m=>m[1]);const missing=files.filter(f=>!fs.existsSync('src/components/dashboard/shared/'+f));console.log(missing.length?('MISSING: '+missing.join(', ')):'all '+files.length+' barrel files exist')"
```
Expected: `all N barrel files exist`.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/shared/index.js && git commit -m "feat: flat barrel for the rebuilt dashboard library"
```

---

## Self-Review Notes (done by author)

- **Spec coverage:** Every component in spec §3.2 maps to a task (Tasks 1–15) and the barrel to Task 16. The shell (§3.1) is Tasks 13–15. SettingsView import migration (§3.2 convergence) is Task 1 Step 5.
- **Type consistency:** `modelValue`/`update:modelValue` used consistently; `Button` `variant` enum (`solid|ghost|outline|danger`) referenced consistently by EmptyState/ErrorState/ConfirmDialog; `ConfirmDialog`/`BaseModal` share the `modelValue`+`show`-alias pattern; `StatCard` `tone` enum matches its `t-*` classes.
- **Deferred to execution:** DataTable (Task 12) intentionally reads-then-rewrites because its existing sort/select logic must be preserved verbatim and is too long to safely inline blind; the task captures the exact API to keep.
- **Out of this plan:** the three dashboard view migrations (Student/Professor/Creator) and cleanup/report are separate sub-projects (B–E), written as their own plans after this library lands and is validated by the first dashboard.
