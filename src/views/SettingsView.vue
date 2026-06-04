<script setup>
// Student settings — rebuilt to the New Design Ideas prototype (profile.jsx):
// sticky left rail + scroll-spy + six sections. Functional: Profile editing,
// Reading/Theme preferences (reused self-contained pref components), password
// change, sign out. Presentational (visual reskin, no backend yet, marked):
// Email preferences, Data & privacy, diagram + highlighter toggles, 2FA.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useProfile } from "@/composables/useProfile";
import { usePreferences } from "@/composables/usePreferences";
import { useHomeRoute } from "@/composables/useHomeRoute";

import ThemeCards from "@/components/settings/ThemeCards.vue";
import AccentSwatches from "@/components/settings/AccentSwatches.vue";
import SegmentedControl from "@/components/settings/SegmentedControl.vue";
import FontPairPicker from "@/components/settings/FontPairPicker.vue";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow.vue";
import SettingsProfileSection from "@/components/settings/SettingsProfileSection.vue";
import SettingsAccountSection from "@/components/settings/SettingsAccountSection.vue";

const { user, profile } = useAuth();
const { profile: liveProfile } = useProfile();
const { readingSize, lineLength, reduceMotion } = usePreferences();
const homeRoute = useHomeRoute();

const readingSizeOptions = [
  { value: "compact", label: "Compact" },
  { value: "regular", label: "Regular" },
  { value: "comfortable", label: "Comfortable" },
];
const lineLengthOptions = [
  { value: "tight", label: "Tight" },
  { value: "standard", label: "Standard" },
  { value: "wide", label: "Wide" },
];
const motionOptions = [
  { value: "auto", label: "Auto" },
  { value: "on", label: "Reduce" },
  { value: "off", label: "Allow" },
];

// --- Left-rail nav + scroll-spy ---
const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "reading", label: "Reading & display" },
  { id: "theme", label: "Theme & accents" },
  { id: "notifications", label: "Email preferences" },
  { id: "data", label: "Data & privacy" },
  { id: "account", label: "Account" },
];
const activeId = ref("profile");

function onScroll() {
  let current = SECTIONS[0].id;
  for (const s of SECTIONS) {
    const el = document.getElementById(s.id);
    if (el && el.getBoundingClientRect().top <= 140) current = s.id;
  }
  activeId.value = current;
}
function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

// --- Rail user card ---
const displayName = computed(
  () => liveProfile.value?.full_name || profile.value?.full_name || "Reader"
);
const railInitials = computed(() => {
  const n = displayName.value || user.value?.email || "?";
  return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
});

// --- Presentational toggle state (visual only this round) ---
const diagramPrefs = ref({ autoplay: true, captions: true });
const emailPrefs = ref({
  weekly: true,
  newChapters: true,
  milestones: false,
  digest: false,
  research: true,
});
const privacyPrefs = ref({ shareNotes: false, analytics: true, improve: true });

const HIGHLIGHTERS = [
  { key: "yellow", label: "Yellow", color: "#F4D03F" },
  { key: "pink", label: "Pink", color: "#F8B8D8" },
  { key: "blue", label: "Blue", color: "#B8D8F8" },
  { key: "green", label: "Green", color: "#B8E8C8" },
  { key: "purple", label: "Purple", color: "#C8B8E8" },
];
const highlighters = ref({
  yellow: true, pink: true, blue: true, green: true, purple: true,
});
function toggleHighlighter(key) {
  highlighters.value[key] = !highlighters.value[key];
}
</script>

<template>
  <main class="settings">
    <div class="layout">
      <!-- Left rail -->
      <aside class="rail">
        <div class="rail-user">
          <div class="rail-avatar" aria-hidden="true">{{ railInitials }}</div>
          <div class="rail-name">{{ displayName }}</div>
          <div class="rail-email">{{ user?.email }}</div>
        </div>
        <nav class="rail-nav">
          <button
            v-for="s in SECTIONS"
            :key="s.id"
            class="rail-link"
            :class="{ active: activeId === s.id }"
            @click="goTo(s.id)"
          >
            <span class="rail-bar" />
            <span class="rail-label">{{ s.label }}</span>
          </button>
        </nav>
        <hr class="rail-rule" />
        <router-link :to="homeRoute" class="rail-back">← Back to book</router-link>
      </aside>

      <!-- Content -->
      <div class="content">
        <SettingsProfileSection />

        <hr class="rule" />

        <!-- READING & DISPLAY -->
        <section id="reading" class="section">
          <header class="section-header">
            <p class="eyebrow">02 · Reading &amp; display</p>
            <h2>Type &amp; layout</h2>
            <p class="subtitle">
              Choose the typeface pairing and reading size that work best for
              your eyes. Changes preview immediately.
            </p>
          </header>

          <div class="stack">
            <div class="field-block">
              <p class="field-label">Font pairing</p>
              <FontPairPicker />
            </div>
            <div class="field-block">
              <p class="field-label">Reading size</p>
              <SegmentedControl
                v-model="readingSize"
                :options="readingSizeOptions"
                aria-label="Reading size"
              />
            </div>
            <div class="field-block">
              <p class="field-label">Line length</p>
              <SegmentedControl
                v-model="lineLength"
                :options="lineLengthOptions"
                aria-label="Line length"
              />
            </div>
            <div class="field-block">
              <p class="field-label">Diagrams</p>
              <SettingsToggleRow
                v-model:checked="diagramPrefs.autoplay"
                label="Auto-play step diagrams"
                hint="Cascade diagrams advance automatically as you scroll past."
              />
              <SettingsToggleRow
                v-model:checked="diagramPrefs.captions"
                label="Show figure captions inline"
                hint="Otherwise captions appear on hover / tap."
              />
            </div>
          </div>
        </section>

        <hr class="rule" />

        <!-- THEME & ACCENTS -->
        <section id="theme" class="section">
          <header class="section-header">
            <p class="eyebrow">03 · Theme &amp; accents</p>
            <h2>Light, dark, or follow system</h2>
            <p class="subtitle">
              Open Brain syncs with your operating-system preference by default.
              Override below if you'd rather always read in one mode.
            </p>
          </header>

          <div class="stack">
            <div class="field-block">
              <p class="field-label">Appearance</p>
              <ThemeCards />
            </div>
            <div class="field-block">
              <p class="field-label">Reduce motion</p>
              <SegmentedControl
                v-model="reduceMotion"
                :options="motionOptions"
                aria-label="Motion"
              />
            </div>
            <div class="field-block">
              <p class="field-label">Accent color</p>
              <AccentSwatches />
            </div>
            <div class="field-block">
              <p class="field-label">
                Highlighter palette
                <span class="soon">· preview</span>
              </p>
              <p class="field-hint">
                Colors available when highlighting prose. Hidden colors won't
                appear in the picker.
              </p>
              <div class="highlighter-row">
                <button
                  v-for="h in HIGHLIGHTERS"
                  :key="h.key"
                  class="hl-chip"
                  :class="{ off: !highlighters[h.key] }"
                  type="button"
                  @click="toggleHighlighter(h.key)"
                >
                  <span class="hl-swatch" :style="{ background: h.color }" />
                  {{ h.label }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <hr class="rule" />

        <!-- EMAIL PREFERENCES (presentational) -->
        <section id="notifications" class="section">
          <header class="section-header">
            <p class="eyebrow">04 · Email preferences <span class="soon">· preview</span></p>
            <h2>When we'll write to you</h2>
            <p class="subtitle">
              We default to a quiet inbox. Turn things on as you need them.
            </p>
          </header>
          <div class="bordered-card">
            <SettingsToggleRow
              v-model:checked="emailPrefs.weekly"
              label="Weekly reading nudge"
              hint="A gentle Sunday email recapping where you left off and what's next."
            />
            <SettingsToggleRow
              v-model:checked="emailPrefs.newChapters"
              label="New chapters published"
              hint="When a chapter graduates from draft. About one per quarter."
            />
            <SettingsToggleRow
              v-model:checked="emailPrefs.milestones"
              label="Quiz & flashcard milestones"
              hint="5-day streaks, perfect quizzes, chapter completions."
            />
            <SettingsToggleRow
              v-model:checked="emailPrefs.digest"
              label="Annotation digest"
              hint="Weekly summary of community notes & highlights on chapters you're reading."
            />
            <SettingsToggleRow
              v-model:checked="emailPrefs.research"
              label="Research-update bulletins"
              hint="When a chapter is updated to reflect new findings, we'll tell you what changed."
            />
          </div>
        </section>

        <hr class="rule" />

        <!-- DATA & PRIVACY (presentational) -->
        <section id="data" class="section">
          <header class="section-header">
            <p class="eyebrow">05 · Data &amp; privacy <span class="soon">· preview</span></p>
            <h2>Your reading footprint</h2>
            <p class="subtitle">
              Open Brain stores your highlights, notes, and progress so you can
              sync between devices. You can export or delete it at any time.
            </p>
          </header>

          <div class="stats-grid">
            <div class="stat"><span class="stat-value">—</span><span class="stat-label">Highlights</span></div>
            <div class="stat"><span class="stat-value">—</span><span class="stat-label">Notes</span></div>
            <div class="stat"><span class="stat-value">—</span><span class="stat-label">Chapters started</span></div>
            <div class="stat"><span class="stat-value">—</span><span class="stat-label">Storage used</span></div>
          </div>

          <div class="stack">
            <SettingsToggleRow
              v-model:checked="privacyPrefs.shareNotes"
              label="Allow community to view my notes"
              hint="Off by default. Notes are private to you unless you explicitly publish."
            />
            <SettingsToggleRow
              v-model:checked="privacyPrefs.analytics"
              label="Anonymous reading analytics"
              hint="Helps us understand which sections are confusing. No identifiable data leaves your device."
            />
            <SettingsToggleRow
              v-model:checked="privacyPrefs.improve"
              label="Use my notes for chapter improvement"
              hint="Authors review aggregated patterns to revise chapters. Your name is never attached."
            />
          </div>

          <div class="data-actions">
            <button class="btn" type="button" disabled>Download my data</button>
            <button class="btn" type="button" disabled>Delete reading history</button>
          </div>
        </section>

        <hr class="rule" />

        <SettingsAccountSection />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Settings — prototype profile.jsx layout. Rail + scroll-spy + sections. */
.settings {
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  min-height: 100vh;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  max-width: 124rem;
  margin: 0 auto;
  padding: 4rem 4.8rem 9.6rem;
  gap: 4.8rem;
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: 28rem 1fr;
  }
}

/* Left rail */
.rail {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
@media (min-width: 900px) {
  .rail {
    position: sticky;
    top: 4rem;
  }
}
.rail-user {
  margin-bottom: 18px;
}
.rail-avatar {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 2.6rem;
  font-weight: 600;
  border: 1px solid rgb(var(--color-line));
}
.rail-name {
  font-family: var(--font-body);
  font-size: 2.2rem;
  letter-spacing: -0.01em;
  margin-top: 14px;
}
.rail-email {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  margin-top: 2px;
}

.rail-nav {
  display: flex;
  flex-direction: column;
}
.rail-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 10px 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: rgb(var(--color-mute));
}
.rail-bar {
  width: 4px;
  height: 16px;
  background: transparent;
  transition: background 200ms ease;
}
.rail-label {
  font-family: var(--font-body);
  font-size: 1.5rem;
  font-weight: 400;
}
.rail-link.active {
  color: rgb(var(--color-ink));
}
.rail-link.active .rail-bar {
  background: rgb(var(--color-accent));
}
.rail-link.active .rail-label {
  font-weight: 500;
}
.rail-rule {
  border: 0;
  border-top: 1px solid rgb(var(--color-line));
  margin: 20px 0 12px;
}
.rail-back {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-ink));
  text-decoration: none;
}
.rail-back:hover {
  color: rgb(var(--color-accent));
}

/* Content */
.content {
  display: flex;
  flex-direction: column;
  gap: 6.4rem;
}
.rule {
  border: 0;
  border-top: 1px solid rgb(var(--color-line));
  margin: 0;
}

.section-header {
  margin-bottom: 28px;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0 0 10px;
}
.soon {
  color: rgb(var(--color-mute) / 0.7);
}
.section-header h2 {
  font-family: var(--font-body);
  font-size: 3.2rem;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.012em;
  margin: 0 0 8px;
}
.subtitle {
  font-family: var(--font-body);
  font-size: 1.6rem;
  line-height: 1.5;
  color: rgb(var(--color-mute));
  margin: 0;
  max-width: 64rem;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  margin: 0;
}
.field-hint {
  font-family: var(--font-body);
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  margin: 0;
  line-height: 1.45;
}

/* Highlighter chips */
.highlighter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.hl-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition: opacity 0.12s ease, border-color 0.12s ease;
}
.hl-chip.off {
  opacity: 0.4;
}
.hl-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgb(var(--color-ink) / 0.1);
}

/* Email prefs bordered card */
.bordered-card {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  overflow: hidden;
  background: rgb(var(--color-paper));
  padding: 0 20px;
}
.bordered-card :deep(.toggle-row) {
  padding: 16px 0;
}
.bordered-card :deep(.toggle-row):last-child {
  border-bottom: 0;
}

/* Data stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
  margin-bottom: 28px;
}
.stat {
  padding: 20px 10px;
  border-right: 1px solid rgb(var(--color-line));
}
.stat:last-child {
  border-right: 0;
}
.stat-value {
  display: block;
  font-family: var(--font-body);
  font-size: 3.2rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
}
.stat-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  margin-top: 6px;
}

.data-actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}
.btn {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 8px 16px;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .layout {
    padding: 2.4rem 1.8rem 8rem;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
