<script setup>
/*
 * "Animations are off" (OPENBRAIN-189).
 *
 * A device can ask for less motion without its owner knowing: Windows'
 * "Animation effects" was off on Stuart's office PC, the book's covers,
 * figures and page effects held still, and it read as broken. The book
 * keeps respecting that setting (people who need it rely on it) but now
 * says so once, where the first still thing is, and offers the way out.
 *
 * Shown while useMotionPreference's `noticePending` is true: the device
 * asks for less motion, the reader has chosen nothing in this book, and
 * has not answered (or seen it and moved on) in this browser. "Turn animations on" sets the
 * book's own preference, which wins over the device and takes effect at
 * once; "Keep them off" goes on following the device. Either answer is
 * remembered, and the notice is replaced by one line saying where the
 * setting lives (the "?" in the top bar), which takes focus so the
 * keyboard does not lose its place when the buttons go.
 *
 * It lives on the chapter cover (OpenerHero places it), so it covers no
 * text and none of the figure pane, and scrolls away with the cover. A
 * reader who lands further down still gets the dot on the "?".
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useMotionPreference } from "@/composables/useMotionPreference";

const { noticePending, setAnimations, dismissNotice } = useMotionPreference();

// null until the reader answers here: "on" | "off".
const outcome = ref(null);
const visible = computed(() => noticePending.value || outcome.value !== null);

// A live region announces what is added to it, not what it is born with:
// the text goes in once the region is in the page.
const announced = ref(false);
onMounted(() => {
  announced.value = true;
});

// Once per browser: a notice the reader saw and scrolled past without
// answering counts as "Keep them off" when the chapter closes, so it does
// not come back on every chapter. Only once it was on screen: a reader who
// resumes mid-chapter never saw the cover, and is asked next time.
const rootRef = ref(null);
let seen = false;
let observer = null;
watch(rootRef, (el) => {
  observer?.disconnect();
  observer = null;
  if (!el || typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) seen = true;
  });
  observer.observe(el);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  if (seen && noticePending.value) dismissNotice();
});

const doneRef = ref(null);
async function answer(value) {
  if (value === "on") setAnimations("on");
  else dismissNotice();
  outcome.value = value;
  await nextTick();
  doneRef.value?.focus();
}
</script>

<template>
  <aside
    v-if="visible"
    ref="rootRef"
    class="motion-notice"
    aria-label="Animations"
    data-testid="motion-notice"
    :data-outcome="outcome"
  >
    <template v-if="outcome === null">
      <p class="motion-notice__text" role="status">
        <template v-if="announced">
          <strong class="motion-notice__lead">Animations are off</strong>
          because your device asks for less motion.
        </template>
      </p>
      <div class="motion-notice__actions">
        <button
          type="button"
          class="motion-notice__btn motion-notice__btn--primary"
          data-testid="motion-notice-on"
          @click="answer('on')"
        >
          Turn animations on
        </button>
        <button
          type="button"
          class="motion-notice__btn"
          data-testid="motion-notice-off"
          @click="answer('off')"
        >
          Keep them off
        </button>
      </div>
    </template>
    <p
      v-else
      ref="doneRef"
      class="motion-notice__text motion-notice__text--done"
      role="status"
      tabindex="-1"
    >
      <strong class="motion-notice__lead">{{
        outcome === "on" ? "Animations are on." : "Animations stay off."
      }}</strong>
      Change this any time under
      <span class="motion-notice__key" aria-hidden="true">?</span
      ><span class="motion-notice__sr">Help</span> in the top bar.
    </p>
  </aside>
</template>

<style scoped>
.motion-notice {
  box-sizing: border-box;
  max-width: 21rem;
  padding: 0.75rem 0.875rem;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
  border-radius: var(--radius-control);
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  hyphens: manual;
  -webkit-hyphens: manual;
}
.motion-notice__text {
  margin: 0;
  /* The region is in the page before its text (see `announced`): keep its
     line so the buttons do not jump when the text arrives. */
  min-height: 1.45em;
}
.motion-notice__text--done:focus {
  outline: none;
}
.motion-notice__lead {
  font-weight: 600;
}
.motion-notice__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.625rem;
}
.motion-notice__btn {
  flex: 1 1 auto;
  min-height: 44px;
  padding: 0 0.75rem;
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}
.motion-notice__btn:hover {
  border-color: rgb(var(--color-ink));
}
.motion-notice__btn--primary {
  background: rgb(var(--color-ink));
  border-color: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.motion-notice__btn--primary:hover {
  background: rgb(var(--color-ink) / 0.85);
}
.motion-notice__btn:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.motion-notice__key {
  display: inline-grid;
  place-items: center;
  width: 1.375rem;
  height: 1.375rem;
  border: 1px solid rgb(var(--color-line));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1;
  vertical-align: -0.2em;
}
/* The key cap is a picture of the button; its name is what gets read. */
.motion-notice__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
