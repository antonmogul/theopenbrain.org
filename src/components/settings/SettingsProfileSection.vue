<script setup>
// Profile section (prototype profile.jsx §01). Functional: edits the profiles
// row via useProfile.updateProfile(). Avatar "Change photo" is presentational
// for now (avatar upload needs a storage bucket — deferred). Email is read-only
// (changing the auth email is a separate flow). bio/location require the
// 20260604 migration; until applied they read/write as null harmlessly.
import { ref, watch, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useProfile } from "@/composables/useProfile";

const { user } = useAuth();
const { profile, fetchProfile, updateProfile, loading } = useProfile();

const ROLE_OPTIONS = [
  "Student",
  "Researcher",
  "Educator",
  "Designer",
  "Engineer",
  "Other",
];

// Local editable copies; reset from the loaded profile.
const form = ref({ full_name: "", bio: "", role_field: "", location: "" });
const saved = ref(false);

function resetFromProfile() {
  const p = profile.value || {};
  form.value = {
    full_name: p.full_name || "",
    bio: p.bio || "",
    // student_major doubles as the "field" until a dedicated column exists
    role_field: p.student_major || "",
    location: p.location || "",
  };
}

watch(profile, resetFromProfile, { immediate: true });

// Ensure we have the latest profile when the section mounts.
fetchProfile();

const initials = computed(() => {
  const n = form.value.full_name || user.value?.email || "?";
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
});

const dirty = computed(() => {
  const p = profile.value || {};
  return (
    form.value.full_name !== (p.full_name || "") ||
    form.value.bio !== (p.bio || "") ||
    form.value.role_field !== (p.student_major || "") ||
    form.value.location !== (p.location || "")
  );
});

async function save() {
  saved.value = false;
  const { error } = await updateProfile({
    full_name: form.value.full_name || null,
    bio: form.value.bio || null,
    student_major: form.value.role_field || null,
    location: form.value.location || null,
  });
  if (!error) {
    saved.value = true;
    setTimeout(() => (saved.value = false), 2500);
  }
}
</script>

<template>
  <section id="profile" class="section">
    <header class="section-header">
      <p class="eyebrow">01 · Profile</p>
      <h2>Edit profile</h2>
      <p class="subtitle">
        What other readers see when you contribute notes or comments to a
        chapter.
      </p>
    </header>

    <div class="profile-grid">
      <div class="avatar-col">
        <div class="avatar" aria-hidden="true">{{ initials }}</div>
        <button class="btn-ghost photo-btn" type="button" disabled>
          Change photo
        </button>
      </div>

      <div class="fields">
        <label class="field">
          <span class="field-label">Display name</span>
          <input v-model="form.full_name" class="input" type="text" />
        </label>

        <label class="field">
          <span class="field-label">Email address</span>
          <input
            :value="user?.email || ''"
            class="input"
            type="email"
            readonly
          />
          <span class="field-hint">Email changes are handled separately.</span>
        </label>

        <label class="field">
          <span class="field-label">Bio</span>
          <textarea
            v-model="form.bio"
            class="input"
            rows="3"
            maxlength="280"
          ></textarea>
          <span class="field-hint">
            Shown in note attributions. 280 char max.
          </span>
        </label>

        <div class="field-pair">
          <label class="field">
            <span class="field-label">Role / Field</span>
            <select v-model="form.role_field" class="input">
              <option value="">—</option>
              <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Location</span>
            <input v-model="form.location" class="input" type="text" />
          </label>
        </div>

        <div class="actions">
          <button
            class="btn-solid"
            type="button"
            :disabled="!dirty || loading"
            @click="save"
          >
            {{ loading ? "Saving…" : "Save changes" }}
          </button>
          <button
            class="btn-ghost"
            type="button"
            :disabled="!dirty"
            @click="resetFromProfile"
          >
            Cancel
          </button>
          <span v-if="saved" class="saved-note">✓ Saved</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
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

.profile-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 32px;
  align-items: flex-start;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 4rem;
  font-weight: 600;
  border: 1px solid rgb(var(--color-line));
}
.photo-btn {
  margin-top: 12px;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
}
.field-hint {
  font-family: var(--font-body);
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  margin-top: 4px;
  line-height: 1.45;
}
.field-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.input {
  width: 100%;
  border: 0;
  border-bottom: 1px solid rgb(var(--color-line));
  background: transparent;
  padding: 8px 0;
  font-family: var(--font-body);
  font-size: 1.8rem;
  color: rgb(var(--color-ink));
  outline: none;
  transition: border-color 0.12s ease;
}
textarea.input {
  font-size: 1.6rem;
  line-height: 1.5;
  resize: vertical;
}
.input:focus {
  border-bottom-color: rgb(var(--color-ink));
}
.input[readonly] {
  color: rgb(var(--color-mute));
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.saved-note {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-complete));
  margin-left: 8px;
}

.btn-solid,
.btn-ghost {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-radius: 999px;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.btn-solid {
  padding: 10px 18px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink));
}
.btn-solid:hover:not(:disabled) {
  background: rgb(var(--color-ink) / 0.85);
}
.btn-ghost {
  padding: 6px 12px;
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid transparent;
}
.btn-ghost:hover:not(:disabled) {
  background: rgb(var(--color-ink) / 0.05);
}
.btn-solid:disabled,
.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
