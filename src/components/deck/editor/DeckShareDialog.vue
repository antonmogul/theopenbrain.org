<script setup>
// Share a deck (OPENBRAIN-129): its funder link, whether it is the deck at
// this site's /deck, a new link (the old one stops working) and
// Unpublish. The dialog only asks; the editor does each write through
// useDecks and passes `busy` and any `error` back in. Rotating and
// unpublishing are confirmed here first, because neither can be undone
// from a funder's side.
import { computed, ref, watch } from "vue";
import {
  BaseModal,
  Button,
  ConfirmDialog,
  StatusBadge,
  Switch,
} from "@/components/dashboard/shared";
import { deckHomeLabel } from "@/composables/useDecks.js";
import { useDialogFocus } from "./editorA11y.js";
import "./deckEditor.css";

const props = defineProps({
  open: { type: Boolean, default: false },
  // The deck row: status, share_token, pinned, version, published_version,
  // published_at, title.
  deck: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: "" },
});
const emit = defineEmits([
  "close",
  "copy",
  "copy-failed",
  "rotate",
  "unpublish",
  "pin",
]);
// The pinned deck's address on the site this page is on.
const deckHome = deckHomeLabel();

const published = computed(() => props.deck.status === "published");
const url = computed(() => {
  const origin = typeof location === "undefined" ? "" : location.origin;
  return `${origin}/deck/s/${props.deck.share_token || ""}`;
});
const unpublishedChanges = computed(
  () =>
    published.value &&
    Number(props.deck.version) > Number(props.deck.published_version)
);
const publishedOn = computed(() => {
  if (!props.deck.published_at) return "";
  return new Date(props.deck.published_at).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Copy here, so the link is on the clipboard whatever the editor does with
// the event, then say so beside the button. `copy` only when it is on the
// clipboard: the editor says "Link copied."
const copied = ref(false);
const linkInput = ref(null);
const firstControl = ref(null);
async function copy() {
  try {
    await navigator.clipboard.writeText(url.value);
    copied.value = true;
    emit("copy", url.value);
  } catch {
    // No clipboard access (an insecure origin, a denied permission):
    // select the link so it can be copied by hand, and say so.
    linkInput.value?.select();
    emit("copy-failed", url.value);
  }
}
watch(
  () => props.open,
  () => (copied.value = false)
);

// The confirmations are ConfirmDialogs: they take focus and give it back to
// the button that asked.
const confirming = ref(null); // 'rotate' | 'unpublish' | null
function confirm() {
  emit(confirming.value);
  confirming.value = null;
}

// Copy when the link is live; otherwise Done, the one control that always is.
const doneButton = ref(null);
const elementOf = (r) => r.value?.$el ?? r.value;
useDialogFocus(
  () => props.open,
  () => elementOf(published.value ? firstControl : doneButton)
);
</script>

<template>
  <BaseModal
    :model-value="open"
    title="Share"
    size="lg"
    :close-on-escape="!confirming"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <div class="share">
      <p class="share__status" role="status">
        <StatusBadge :status="deck.status || 'draft'" />
        <span v-if="published">
          Published {{ publishedOn
          }}<template v-if="deck.published_version">
            · version {{ deck.published_version }}</template
          ><template v-if="unpublishedChanges">
            · Unpublished changes: funders see the published version.</template
          >
        </span>
        <span v-else-if="deck.published_at">
          Unpublished. The link is off until you publish again; it stays the
          same.
        </span>
        <span v-else>Not published yet.</span>
      </p>

      <div class="deck-ed-field" :class="{ 'is-off': !published }">
        <label class="deck-ed-label" for="deck-share-link">Funder link</label>
        <div class="share__link">
          <input
            id="deck-share-link"
            ref="linkInput"
            class="deck-ed-input"
            type="text"
            readonly
            :value="url"
            :disabled="!published"
            aria-describedby="deck-share-link-desc"
            @focus="$event.target.select()"
          />
          <Button
            ref="firstControl"
            variant="outline"
            size="sm"
            :disabled="!published"
            @click="copy"
            >{{ copied ? "Copied" : "Copy" }}</Button
          >
        </div>
        <p id="deck-share-link-desc" class="deck-ed-desc">
          <template v-if="published"
            >Anyone with this link can open the deck without signing in. Add #N
            to open on slide N.</template
          >
          <template v-else>Publish the deck to turn this link on.</template>
        </p>
        <p v-if="published" class="share__open">
          <a class="deck-ed-link" :href="url" target="_blank" rel="noopener"
            >Open as a funder sees it</a
          >
          <span class="deck-ed-desc"
            >Signed in as a creator, you also see the speaker notes there.</span
          >
        </p>
      </div>

      <div class="share__row" :class="{ 'is-off': !published }">
        <div>
          <label
            id="deck-share-pin-label"
            for="deck-share-pin"
            class="share__row-label"
            >Show this deck at {{ deckHome }}</label
          >
          <p id="deck-share-pin-desc" class="deck-ed-desc">
            Only one deck is shown there. If you unpublish it, /deck shows the
            bundled October copy.
          </p>
        </div>
        <Switch
          id="deck-share-pin"
          :checked="!!deck.pinned"
          :disabled="!published || busy"
          aria-labelledby="deck-share-pin-label"
          aria-describedby="deck-share-pin-desc"
          @update:checked="(v) => emit('pin', v)"
        />
      </div>

      <p v-if="error" class="share__error" role="alert">{{ error }}</p>
    </div>

    <template #footer>
      <Button
        variant="ghost"
        size="sm"
        :disabled="busy"
        @click="confirming = 'rotate'"
        >Make a new link</Button
      >
      <Button
        v-if="published"
        variant="danger"
        size="sm"
        :disabled="busy"
        @click="confirming = 'unpublish'"
        >Unpublish</Button
      >
      <Button ref="doneButton" size="sm" @click="emit('close')">Done</Button>
    </template>
  </BaseModal>

  <ConfirmDialog
    :model-value="confirming === 'rotate'"
    title="Make a new link?"
    message="Old links stop working. Send the new link to anyone who should still see the deck."
    confirm-label="Make a new link"
    variant="danger"
    :loading="busy"
    @confirm="confirm"
    @cancel="confirming = null"
  />
  <ConfirmDialog
    :model-value="confirming === 'unpublish'"
    title="Unpublish this deck?"
    confirm-label="Unpublish"
    variant="danger"
    :loading="busy"
    @confirm="confirm"
    @cancel="confirming = null"
  >
    Funders' links stop working until you publish again; the link itself stays
    the same.<template v-if="deck.pinned">
      {{ deckHome }} goes back to the bundled October copy.</template
    >
  </ConfirmDialog>
</template>

<style scoped>
.share {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.share__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.45;
  color: rgb(var(--color-ink));
}
.share__link {
  display: flex;
  gap: 8px;
}
.share__open {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 0 0;
}
.is-off .deck-ed-input {
  background: rgb(var(--color-bg));
  color: rgb(var(--color-mute));
  text-decoration: line-through;
}
.share__row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgb(var(--color-line));
}
.share__row.is-off .share__row-label {
  color: rgb(var(--color-mute));
}
.share__row-label {
  font-family: var(--font-ui);
  font-size: var(--ui-size-15);
  color: rgb(var(--color-ink));
}
.share__error {
  margin: 0;
  padding: 8px 10px;
  border-left: 3px solid rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.06);
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
</style>
