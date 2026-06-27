<script setup>
// HighlightToolbar sub-unit (#18 split): the edit-mode action cluster
// (note / tag / delete buttons + overflow "more" menu).
// Presentational — the parent owns panel-visibility state and passes the
// active flags in; this component only emits intent events. The overflow
// dropdown's open state is driven by `overflowOpen` (parent-owned) so the
// parent's single-open-panel orchestration stays authoritative.
defineProps({
  notePanelActive: { type: Boolean, default: false },
  tagPanelActive: { type: Boolean, default: false },
  deleteConfirmActive: { type: Boolean, default: false },
  overflowOpen: { type: Boolean, default: false },
});

defineEmits([
  "toggle-note",
  "toggle-tag",
  "toggle-delete",
  "toggle-overflow",
  "copy-text",
]);
</script>

<template>
  <div class="hl-actionbar">
    <!-- Note button -->
    <button
      @click="$emit('toggle-note')"
      class="hl-action"
      :class="{ 'hl-action-active': notePanelActive }"
      title="Add note"
      data-testid="edit-note-btn"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
        />
        <path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        />
      </svg>
    </button>

    <!-- Tag button -->
    <button
      @click="$emit('toggle-tag')"
      class="hl-action"
      :class="{ 'hl-action-active': tagPanelActive }"
      title="Add tags"
      data-testid="edit-tag-btn"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
        />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    </button>

    <!-- Delete button -->
    <button
      @click="$emit('toggle-delete')"
      class="hl-action hl-action-danger"
      :class="{ 'hl-action-active': deleteConfirmActive }"
      title="Delete highlight"
      data-testid="edit-delete-btn"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="3 6 5 6 21 6" />
        <path
          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        />
      </svg>
    </button>

    <!-- Overflow menu -->
    <div class="hl-overflow-wrap">
      <button
        @click="$emit('toggle-overflow')"
        class="hl-action"
        title="More actions"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      <!-- Overflow dropdown -->
      <div v-if="overflowOpen" class="hl-dropdown">
        <button @click="$emit('copy-text')" class="hl-dropdown-item">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path
              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            />
          </svg>
          Copy text
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hl-actionbar {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Action buttons */
.hl-action {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-mute));
  transition: all 0.12s ease;
}

.hl-action:hover {
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-ink));
}

.hl-action-active {
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-accent));
}

.hl-action-danger:hover {
  color: rgb(var(--color-warn));
}

/* Overflow menu */
.hl-overflow-wrap {
  position: relative;
}

.hl-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: rgb(var(--color-paper));
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(var(--color-ink) / 0.22),
    0 0 0 1px rgb(var(--color-line));
  overflow: hidden;
  min-width: 130px;
}

.hl-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: rgb(var(--color-mute));
  font-size: 13px;
  font-family: "IBM Plex Sans", sans-serif;
  cursor: pointer;
  transition: background 0.1s;
}

.hl-dropdown-item:hover {
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-ink));
}
</style>
