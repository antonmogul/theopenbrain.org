<script setup>
// Every problem in the deck, by slide (OPENBRAIN-129): validateDeck's
// output plus the preview's overflow checks. Choosing one emits `jump` with
// its slide and path, then `close`; the editor selects the slide and focuses
// the field (fieldId). Errors block Publish, warnings don't. When eyebrows
// are numbered out of order, "Renumber eyebrows" fixes them all (undoable).
import { computed, nextTick, ref } from "vue";
import { BaseModal, Button } from "@/components/dashboard/shared";
import { fieldLabel } from "./fieldPaths.js";
import { IconError, IconWarn } from "./editorIcons.js";
import { useDialogFocus } from "./editorA11y.js";
import "./deckEditor.css";

const props = defineProps({
  open: { type: Boolean, default: false },
  // [{ slideId, path, level: 'error'|'warn', code, message }]
  problems: { type: Array, required: true },
  // The deck's entries, for slide order, numbers and labels.
  entries: { type: Array, required: true },
});
const emit = defineEmits(["jump", "renumber", "close"]);

const errorCount = computed(
  () => props.problems.filter((p) => p.level === "error").length
);
const warningCount = computed(() => props.problems.length - errorCount.value);
const canRenumber = computed(() =>
  props.problems.some((p) => p.code === "W_EYEBROW")
);

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Problems in slide order, errors first within a slide; problems about the
// whole deck (no slide) come first.
const groups = computed(() => {
  const bySlide = new Map();
  for (const p of props.problems) {
    const key = p.slideId ?? "";
    if (!bySlide.has(key)) bySlide.set(key, []);
    bySlide.get(key).push(p);
  }
  const order = (list) =>
    [...list].sort((a, b) =>
      a.level === b.level ? 0 : a.level === "error" ? -1 : 1
    );
  const out = [];
  if (bySlide.has(""))
    out.push({
      key: "deck",
      title: "Whole deck",
      problems: order(bySlide.get("")),
    });
  props.entries.forEach((entry, i) => {
    const list = bySlide.get(entry.id);
    if (!list) return;
    out.push({
      key: entry.id,
      title: `Slide ${i + 1} · ${entry.label || "Untitled"}`,
      layout: entry.layout,
      problems: order(list),
    });
    bySlide.delete(entry.id);
  });
  // Problems for a slide that has since gone: still listed, never lost.
  for (const [id, list] of bySlide)
    if (id)
      out.push({ key: id, title: `Slide “${id}”`, problems: order(list) });
  return out;
});

const root = ref(null);
const firstButton = ref(null);
const doneButton = ref(null);
const firstItem = () =>
  root.value?.querySelector(".deck-problems__item") || doneButton.value?.$el;
const dialogFocus = useDialogFocus(
  () => props.open,
  () => firstButton.value?.$el || firstItem()
);

// Renumbering clears the eyebrow warnings, and with them the focused button:
// focus moves on to the first problem left (or Done) instead of dropping to
// the page behind the dialog. If a stale eyebrow is left, the button stays,
// and so does focus.
async function renumber() {
  emit("renumber");
  await nextTick();
  if (firstButton.value) return;
  firstItem()?.focus();
}

function jump(problem) {
  dialogFocus.forget();
  emit("jump", { slideId: problem.slideId, path: problem.path });
  emit("close");
}
</script>

<template>
  <BaseModal
    :model-value="open"
    title="Problems"
    size="lg"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <div ref="root" class="deck-problems">
      <p class="deck-problems__summary">
        <span class="deck-ed-badge is-error"
          ><IconError />{{ plural(errorCount, "error") }}</span
        >
        <span class="deck-ed-badge is-warn"
          ><IconWarn />{{ plural(warningCount, "warning") }}</span
        >
        <span>Errors block Publish; warnings don't.</span>
      </p>

      <div v-if="canRenumber" class="deck-problems__renumber">
        <p class="deck-ed-desc">
          Some eyebrows are numbered for a different position (“02 · Team” on
          slide 3).
        </p>
        <Button ref="firstButton" variant="outline" size="sm" @click="renumber"
          >Renumber eyebrows</Button
        >
      </div>

      <p v-if="!problems.length" class="deck-problems__none">
        No problems. The deck is ready to publish.
      </p>

      <section
        v-for="group in groups"
        :key="group.key"
        class="deck-problems__group"
        :aria-labelledby="`deck-problems-${group.key}`"
      >
        <h4 :id="`deck-problems-${group.key}`" class="deck-ed-heading">
          {{ group.title }}
        </h4>
        <ul class="deck-problems__list">
          <li
            v-for="(problem, i) in group.problems"
            :key="`${problem.code}-${problem.path}-${i}`"
          >
            <button
              type="button"
              class="deck-problems__item deck-ed-focus"
              :class="problem.level === 'error' ? 'is-error' : 'is-warn'"
              @click="jump(problem)"
            >
              <component
                :is="problem.level === 'error' ? IconError : IconWarn"
                class="deck-problems__icon"
              />
              <span class="sr-only">{{
                problem.level === "error" ? "Error:" : "Warning:"
              }}</span>
              <span class="deck-problems__text">
                <span class="deck-problems__message">{{
                  problem.message
                }}</span>
                <span
                  v-if="problem.path && group.layout"
                  class="deck-problems__where"
                  >{{ fieldLabel(group.layout, problem.path) }}</span
                >
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <Button ref="doneButton" size="sm" @click="emit('close')">Done</Button>
    </template>
  </BaseModal>
</template>

<style scoped>
.deck-problems {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 65vh;
  overflow-y: auto;
  padding: 2px;
}
.deck-problems__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-mute));
}
.deck-problems__renumber {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 10px 12px;
  background: rgb(var(--color-warn) / 0.12);
}
.deck-problems__none {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  color: rgb(var(--color-ink));
}
.deck-problems__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.deck-problems__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
.deck-problems__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-bottom: 1px solid rgb(var(--color-line));
  background: none;
  text-align: left;
  cursor: pointer;
}
.deck-problems__item:hover {
  background: rgb(var(--color-ink) / 0.04);
}
.deck-problems__icon {
  flex: none;
  margin-top: 2px;
}
.is-error .deck-problems__icon {
  color: rgb(var(--color-accent));
}
.is-warn .deck-problems__icon {
  color: rgb(var(--color-warn));
}
.deck-problems__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.deck-problems__message {
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.4;
  color: rgb(var(--color-ink));
}
.deck-problems__where {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  color: rgb(var(--color-mute));
}
</style>
