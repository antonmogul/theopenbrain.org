<script setup>
// HighlightToolbar sub-unit (#18 split): the tag editor panel.
// Presentational — the parent owns the tag list and all add/remove/dedup/save
// logic (it persists tags to the highlight). This component renders the chips
// and the input, two-way-binds the in-progress input text via v-model, and
// emits `remove` (with index), `add`, and `keydown` so the parent stays the
// authority on tag mutations.
defineProps({
  tags: { type: Array, default: () => [] },
});

const tagInput = defineModel("tagInput", { type: String, default: "" });
defineEmits(["remove", "keydown"]);
</script>

<template>
  <div class="hl-panel">
    <div class="hl-tags-list">
      <span v-for="(tag, i) in tags" :key="tag" class="hl-tag-chip">
        {{ tag }}
        <button
          @click="$emit('remove', i)"
          class="hl-tag-remove"
          :data-testid="`remove-tag-${tag}`"
        >
          &times;
        </button>
      </span>
      <input
        v-model="tagInput"
        @keydown="$emit('keydown', $event)"
        class="hl-tag-input"
        placeholder="Add tag..."
        data-testid="edit-tag-input"
      />
    </div>
  </div>
</template>

<style scoped>
.hl-panel {
  background: rgb(var(--color-paper));
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 4px 16px rgb(var(--color-ink) / 0.16),
    0 0 0 1px rgb(var(--color-line));
}

/* Tags */
.hl-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 240px;
}

.hl-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-ink));
  border-radius: 12px;
  font-size: 12px;
  font-family: "IBM Plex Sans", sans-serif;
}

.hl-tag-remove {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: rgb(var(--color-mute));
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.1s;
}

.hl-tag-remove:hover {
  background: rgb(var(--color-ink) / 0.1);
  color: rgb(var(--color-warn));
}

.hl-tag-input {
  flex: 1;
  min-width: 80px;
  padding: 4px 8px;
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  color: rgb(var(--color-ink));
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
}

.hl-tag-input:focus {
  outline: none;
  border-color: rgb(var(--color-accent));
}

.hl-tag-input::placeholder {
  color: rgb(var(--color-mute));
}
</style>
