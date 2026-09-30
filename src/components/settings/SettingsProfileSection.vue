<script setup>
// Profile section (prototype profile.jsx §01). Functional: edits the profiles
// row via useProfile.updateProfile(). Avatar "Change photo" is presentational
// for now (avatar upload needs a storage bucket — deferred). Email is read-only
// (changing the auth email is a separate flow). bio/location require the
// 20260604 migration; until applied they read/write as null harmlessly.
import { ref, watch, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useProfile } from "@/composables/useProfile";
import FormField from "@/components/dashboard/shared/FormField.vue";
import Button from "@/components/dashboard/shared/Button.vue";

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
        <Button variant="ghost" size="sm" class="photo-btn" disabled>
          Change photo
        </Button>
      </div>
      <div class="fields">
        <FormField label="Display name">
          <input v-model="form.full_name" type="text" />
        </FormField>
        <FormField
          label="Email address"
          hint="Email changes are handled separately."
        >
          <input :value="user?.email || ''" type="email" readonly />
        </FormField>
        <FormField label="Bio" hint="Shown in note attributions. 280 char max.">
          <textarea v-model="form.bio" rows="3" maxlength="280"></textarea>
        </FormField>
        <div class="field-pair">
          <FormField label="Role / Field">
            <select v-model="form.role_field">
              <option value="">—</option>
              <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </FormField>
          <FormField label="Location">
            <input v-model="form.location" type="text" />
          </FormField>
        </div>
        <div class="actions">
          <Button
            variant="solid"
            :loading="loading"
            :disabled="!dirty"
            @click="save"
          >
            {{ loading ? "Saving…" : "Save changes" }}
          </Button>
          <Button variant="ghost" :disabled="!dirty" @click="resetFromProfile">
            Cancel
          </Button>
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
  font-size: var(--ui-size-11);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0 0 10px;
}
.section-header h2 {
  font-family: var(--font-body);
  font-size: var(--ui-size-32);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.012em;
  margin: 0 0 8px;
}
.subtitle {
  font-family: var(--font-body);
  font-size: var(--ui-size-16);
  line-height: 1.5;
  color: rgb(var(--color-mute));
  margin: 0;
  max-width: 40rem;
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
  /* The reader's accent, like the rail avatar (OPENBRAIN-126). */
  background: rgb(var(--color-accent));
  color: rgb(var(--color-paper));
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 2.5rem;
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
.field-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.actions :deep(.btn) {
  white-space: nowrap;
}
.saved-note {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  color: rgb(var(--color-complete));
  margin-left: 8px;
}

/* Phones: the avatar sits above the fields instead of taking a column. */
@media (max-width: 599px) {
  .profile-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .avatar-col {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .avatar {
    width: 80px;
    height: 80px;
    font-size: 1.625rem;
  }
  .photo-btn {
    margin-top: 0;
  }
}
</style>
