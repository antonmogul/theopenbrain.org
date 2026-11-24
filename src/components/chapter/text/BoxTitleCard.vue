<script setup>
/*
 * BoxTitleCard — how a side-scrolling breakout box opens (OPENBRAIN-77,
 * Maura's scroll sketch, 23 Nov; the rules are helper/boxTitleCard.js).
 *
 * The box's lead picture, full bleed and darkened, with the box's title,
 * the first sentence or two of its text, a "more" link and a "Skip" pill
 * over it. Three ways, by `variant`:
 *
 * - "pinned" (the pinned track): laid over the whole box. BreakoutBox
 *   drives it from the page's scroll (drive): the picture arrives alone,
 *   the words fade in once the box is nearly pinned, and scrolling on the
 *   words go and the picture travels to where the track shows it (its box
 *   is interpolated to the real image's, measured each frame, so it lands
 *   exactly on it), while the box's colour behind it clears to show the
 *   track. Past the end the card is out of the way.
 * - "static" (the track under reduced motion): a still block before the
 *   box. No zoom, no fade.
 * - "simple" (the phone's swipe track): the same still block with the
 *   picture, the title and Skip only, at most most of one screen (svh:
 *   a block in the flow never follows the address bar, OPENBRAIN-185).
 *
 * A still card is the only place its title and picture are shown: the box
 * under it hides its own heading and leaves the picture off its track
 * (BreakoutBox, RailPart), and `expandable` puts the track's expand button
 * on the card's corner instead.
 *
 * The title and the quotation repeat what the box says (its own heading is
 * the box's name, its text follows), so they are hidden from assistive
 * technology; the two buttons are real and say what they do.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { cardFrame, cardRect } from "@/helper/boxTitleCard";

const props = defineProps({
  title: { type: String, required: true },
  /** The first sentence or two of the box's text. */
  excerpt: { type: String, default: "" },
  /** { src, alt }: the box's lead picture. */
  picture: { type: Object, required: true },
  /** "pinned" | "static" | "simple". */
  variant: { type: String, default: "static" },
  /** A pinned card's place in its scroll, 0 to 1, for a card nothing
   *  drives (stories, tests). BreakoutBox calls drive() instead. */
  progress: { type: Number, default: null },
  /** A still card whose picture is not on the track after it: a button
   *  opens the picture full screen (BreakoutBox answers `expand`). */
  expandable: { type: Boolean, default: false },
});
defineEmits(["more", "skip", "expand"]);

const root = ref(null);
const pictureEl = ref(null);
/* "arriving" (the picture alone), "open" (the words are in), "done". */
const state = ref("arriving");
let hidden = null; // the track's own picture, out of sight while ours flies

function show(el) {
  if (hidden && hidden !== el) hidden.style.visibility = "";
  hidden = el || null;
  if (hidden) hidden.style.visibility = "hidden";
}

/**
 * Put the card where the page's scroll says.
 * @param {{ progress: number, near?: boolean, target?: Element | null }} at
 *   `near`: the box is close enough to its pin for the words to come in;
 *   `target`: the track's own lead image, where the picture lands.
 */
function drive({ progress = 0, near = true, target = null } = {}) {
  const el = root.value;
  const pic = pictureEl.value;
  if (!el || !pic || props.variant !== "pinned") return;
  const frame = cardFrame(progress);
  state.value = frame.done ? "done" : near ? "open" : "arriving";
  el.style.setProperty("--tc-copy", frame.copy.toFixed(3));
  el.style.setProperty("--tc-scrim", frame.scrim.toFixed(3));
  el.style.setProperty("--tc-ground", frame.ground.toFixed(3));

  const flying = frame.move > 0 && !frame.done;
  const box = flying ? el.getBoundingClientRect() : null;
  const to = flying ? target?.getBoundingClientRect?.() : null;
  if (box && to && to.width > 1 && to.height > 1) {
    const rect = cardRect(
      { left: 0, top: 0, width: box.width, height: box.height },
      {
        left: to.left - box.left,
        top: to.top - box.top,
        width: to.width,
        height: to.height,
      },
      frame.move
    );
    pic.style.left = `${rect.left.toFixed(2)}px`;
    pic.style.top = `${rect.top.toFixed(2)}px`;
    pic.style.width = `${rect.width.toFixed(2)}px`;
    pic.style.height = `${rect.height.toFixed(2)}px`;
    pic.style.opacity = "";
    // One picture on screen: the track's own stays out until ours lands.
    show(target.closest?.("[data-rail-plate]") || target);
  } else {
    // Nowhere to land (the image has not loaded, a figure with no still):
    // the picture stays where it is and clears with the box's colour.
    pic.style.left = pic.style.top = pic.style.width = pic.style.height = "";
    pic.style.opacity = flying ? frame.ground.toFixed(3) : "";
    show(null);
  }
}

watch(
  () => [props.progress, props.variant],
  () => {
    if (props.progress !== null) drive({ progress: props.progress });
  },
  { flush: "post" }
);
onMounted(() => {
  if (props.progress !== null) drive({ progress: props.progress });
});
onBeforeUnmount(() => show(null));

defineExpose({ drive });
</script>

<template>
  <div
    ref="root"
    class="tc"
    :class="`tc--${variant}`"
    data-box-title-card
    :data-card-variant="variant"
    :data-card-state="variant === 'pinned' ? state : undefined"
  >
    <span class="tc-ground" aria-hidden="true"></span>
    <div ref="pictureEl" class="tc-picture">
      <img
        class="tc-img"
        :src="picture.src"
        alt=""
        decoding="async"
        draggable="false"
      />
      <span class="tc-scrim" aria-hidden="true"
        ><span class="tc-scrim-in"></span
      ></span>
    </div>
    <div class="tc-copy">
      <div class="tc-copy-in">
        <p class="tc-title" aria-hidden="true">{{ title }}</p>
        <p
          v-if="excerpt && variant !== 'simple'"
          class="tc-excerpt"
          aria-hidden="true"
        >
          {{ excerpt }}
        </p>
        <button
          v-if="variant !== 'simple'"
          class="tc-more"
          type="button"
          data-card-more
          @click="$emit('more')"
        >
          more<span class="sr-only">: read {{ title }}</span>
        </button>
      </div>
      <button
        v-if="expandable && variant !== 'pinned'"
        class="tc-expand"
        type="button"
        title="Expand to full screen"
        aria-label="Expand the picture to full screen"
        data-card-expand
        @click="$emit('expand')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />
        </svg>
      </button>
      <button
        class="tc-skip"
        type="button"
        data-card-skip
        @click="$emit('skip')"
      >
        <span>Skip<span class="sr-only"> this box</span></span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 3v10M4 9l4 4 4-4" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tc {
  --tc-bg: var(--bx-bg, rgb(var(--color-dark-surface)));
  position: relative;
  overflow: hidden;
  background: var(--tc-bg);
  color: #fff;
}
.tc-ground {
  position: absolute;
  inset: 0;
  background: var(--tc-bg);
}
.tc-picture {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.tc-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
}
/* The darkening: always the dark surface, whatever the box's treatment,
   so the white words on it keep their contrast on any picture. */
.tc-scrim,
.tc-scrim-in {
  position: absolute;
  inset: 0;
}
.tc-scrim-in {
  background: linear-gradient(
    rgb(var(--color-dark-surface) / 0.74),
    rgb(var(--color-dark-surface) / 0.58) 55%,
    rgb(var(--color-dark-surface) / 0.74)
  );
}
.tc-copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding: clamp(2.5rem, 14vh, 9rem) clamp(1.25rem, 6vw, 6rem)
    clamp(1.5rem, 6vh, 3.5rem);
  text-align: center;
}
.tc-copy-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  max-width: 44rem;
}
.tc-title {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  font-weight: 500;
  line-height: 1.2;
  text-wrap: balance;
  hyphens: manual; /* a title is never broken mid-word */
}
.tc-excerpt {
  max-width: 34rem;
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(0.95rem, 1.15vw, 1.0625rem);
  line-height: 1.5;
  color: rgb(255 255 255 / 0.88);
  text-wrap: pretty;
}
.tc-more {
  min-height: 44px;
  padding: 0 0.75rem;
  border: 0;
  background: transparent;
  color: #fff;
  font: 400 var(--ui-size-12) / 1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 0.35em;
  cursor: pointer;
}
.tc-more::after {
  content: "…";
}
.tc-skip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  margin-top: auto;
  padding: 0 1.25rem;
  border: 1px solid #fff;
  border-radius: 999px;
  background: #fff;
  color: rgb(var(--color-dark-surface));
  font: 400 var(--ui-size-11) / 1 var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
@media (hover: hover) {
  .tc-more:hover {
    text-decoration-thickness: 2px;
  }
  .tc-skip:hover {
    background: rgb(var(--color-chapter-pale, 255 255 255));
  }
}
/* On the picture's corner, the chip every picture on a track has. */
.tc-expand {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.45);
  border-radius: 0;
  background: rgb(20 20 20 / 0.72);
  color: #fff;
  cursor: pointer;
}
.tc-expand:hover {
  border-color: #fff;
  background: rgb(20 20 20 / 0.9);
}
.tc-more:focus-visible,
.tc-expand:focus-visible,
.tc-skip:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

/* ── Pinned: over the whole box, driven by the page's scroll ─────────────
   --tc-copy, --tc-scrim and --tc-ground are drive()'s; the words' and the
   darkening's arrival is the one thing on a clock (the inner elements), so
   it never lags the scroll that takes them away again (the outer ones). */
.tc--pinned {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: transparent;
}
.tc--pinned .tc-ground {
  opacity: var(--tc-ground, 1);
}
.tc--pinned .tc-picture {
  will-change: left, top, width, height;
}
.tc--pinned .tc-scrim {
  opacity: var(--tc-scrim, 1);
}
.tc--pinned .tc-copy {
  /* Clear of the timeline's strip, which the box leaves room for. */
  padding-bottom: calc(
    var(--reader-timeline-h, 0px) + clamp(1.5rem, 6vh, 3.5rem)
  );
  opacity: var(--tc-copy, 1);
}
.tc--pinned .tc-scrim-in,
.tc--pinned .tc-copy-in,
.tc--pinned .tc-skip {
  opacity: 0;
  transition: opacity 0.7s ease;
}
.tc--pinned .tc-copy-in {
  transform: translateY(0.75rem);
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}
.tc--pinned[data-card-state="open"] .tc-scrim-in,
.tc--pinned[data-card-state="open"] .tc-copy-in,
.tc--pinned[data-card-state="open"] .tc-skip,
.tc--pinned[data-card-state="done"] .tc-scrim-in {
  opacity: 1;
  transform: none;
}
.tc--pinned[data-card-state="open"] .tc-skip {
  transition-delay: 0.25s;
}
/* The words take no clicks until they are there, nor once they have gone;
   the card takes none at all once the track is the reader's. */
.tc--pinned[data-card-state="arriving"] .tc-copy {
  pointer-events: none;
}
.tc--pinned[data-card-state="done"] {
  visibility: hidden;
  pointer-events: none;
}

/* ── Still: a block before the box (reduced motion, phones) ────────────── */
.tc--static,
.tc--simple {
  height: min(72vh, 44rem);
  height: min(72svh, 44rem);
}
.tc--simple {
  height: min(58vh, 30rem);
  height: min(58svh, 30rem);
}
.tc--simple .tc-copy {
  padding-top: clamp(2rem, 9vh, 4rem);
}
.tc--simple .tc-title {
  font-size: clamp(1.5rem, 6vw, 2rem);
}

@media print {
  .tc {
    display: none;
  }
}
</style>
