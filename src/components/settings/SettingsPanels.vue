<script setup>
// Settings content panels, host-agnostic: rendered both by the standalone
// SettingsView (route, with rail + scroll-spy) and inline in the Student
// dashboard. Sections: Profile, Email preferences, Data & privacy, Account.
// Reading & display + Theme & accents were intentionally removed (those prefs
// live elsewhere / are hidden everywhere per product decision).
import { ref } from "vue";
import ToggleRow from "@/components/dashboard/shared/ToggleRow.vue";
import SettingsProfileSection from "@/components/settings/SettingsProfileSection.vue";
import SettingsAccountSection from "@/components/settings/SettingsAccountSection.vue";

// --- Presentational toggle state (visual only this round) ---
const emailPrefs = ref({
  weekly: true,
  newChapters: true,
  milestones: false,
  digest: false,
  research: true,
});
const privacyPrefs = ref({ shareNotes: false, analytics: true, improve: true });
</script>

<template>
  <div class="settings-panels">
    <SettingsProfileSection />

    <hr class="rule" />

    <!-- EMAIL PREFERENCES (presentational) -->
    <section id="notifications" class="section">
      <header class="section-header">
        <p class="eyebrow">02 · Email preferences <span class="soon">· preview</span></p>
        <h2>When we'll write to you</h2>
        <p class="subtitle">
          We default to a quiet inbox. Turn things on as you need them.
        </p>
      </header>
      <div class="bordered-card">
        <ToggleRow
          v-model:checked="emailPrefs.weekly"
          label="Weekly reading nudge"
          hint="A gentle Sunday email recapping where you left off and what's next."
        />
        <ToggleRow
          v-model:checked="emailPrefs.newChapters"
          label="New chapters published"
          hint="When a chapter graduates from draft. About one per quarter."
        />
        <ToggleRow
          v-model:checked="emailPrefs.milestones"
          label="Quiz & flashcard milestones"
          hint="5-day streaks, perfect quizzes, chapter completions."
        />
        <ToggleRow
          v-model:checked="emailPrefs.digest"
          label="Annotation digest"
          hint="Weekly summary of community notes & highlights on chapters you're reading."
        />
        <ToggleRow
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
        <p class="eyebrow">03 · Data &amp; privacy <span class="soon">· preview</span></p>
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
        <ToggleRow
          v-model:checked="privacyPrefs.shareNotes"
          label="Allow community to view my notes"
          hint="Off by default. Notes are private to you unless you explicitly publish."
        />
        <ToggleRow
          v-model:checked="privacyPrefs.analytics"
          label="Anonymous reading analytics"
          hint="Helps us understand which sections are confusing. No identifiable data leaves your device."
        />
        <ToggleRow
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
</template>

<style scoped>
.settings-panels {
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
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
