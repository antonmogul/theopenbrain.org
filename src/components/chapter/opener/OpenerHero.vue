<script setup>
/*
 * Chapter opener — hero (OPENBRAIN-32, Figma attn/introduction 1495:34229).
 *
 * A full-bleed cover the height of one viewport and a thin down-arrow
 * centred near the bottom. As the reader scrolls the first viewport the
 * cover blurs and darkens slightly (skipped under reduced motion: the
 * reader's own setting, else the device's). The chapter title is NOT
 * printed here any more: it lives in the dark title/TOC block that follows.
 *
 * The "?" that sat bottom-right is in the top bar now (ReaderTopBar,
 * OPENBRAIN-189): here it scrolled away with the cover. Under the top
 * bar's right end the cover carries MotionNotice, which shows only while
 * the device asks for less motion and the reader has not been asked.
 *
 * With a `reactive` record (OPENBRAIN-146) a Lottie the pointer scrubs is
 * laid over the still cover; the still stays underneath as the poster and
 * takes over when the file is missing (`data-reactive-cover` says which).
 * A `kind: "head"` record (OPENBRAIN-171) mounts HeadCover instead, which
 * brings its own ground and still and lays them out itself, so the chapter
 * cover is not painted behind it; if its artwork is missing the chapter
 * cover is what shows. Its `ink` colours the down-arrow, which is white
 * for a photograph and would vanish on paper.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { jumpToElement } from "@/helper/readerJump";
import { useReducedMotion } from "@/composables/useReducedMotion";
import MotionNotice from "../MotionNotice.vue";
import ReactiveCover from "./ReactiveCover.vue";
import HeadCover from "./HeadCover.vue";

const props = defineProps({
  cover: { type: String, required: true },
  /* reactiveCoverForModule()'s record, or null for a still cover only. */
  reactive: { type: Object, default: null },
  /* Used only for the image's accessible name. */
  title: { type: String, default: "" },
  /* Where the down-arrow scrolls to (an element id, without "#"). */
  scrollTarget: { type: String, default: "chapter-toc" },
});

const scrollProgress = ref(0); // 0 at top → 1 after one viewport scrolled
// Live: "Turn animations on" in the notice below takes effect at once.
const reducedMotion = useReducedMotion();

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
    scrollProgress.value = p;
    ticking = false;
  });
}

// "loading" | "ready" | "unavailable" — from the reactive cover; null when
// the chapter has none. Bound as data-reactive-cover on the hero.
const reactiveState = ref(null);
const showReactive = computed(
  () => !!props.reactive && reactiveState.value !== "unavailable"
);
// A head paints its own ground and still.
const ownGround = computed(
  () => showReactive.value && props.reactive.kind === "head"
);
// Two layers of the one picture (the styles below say why): the first is the
// cover as it has always been laid out, the second fills the blur's bleed.
// A head has no picture here, so its own paper fills the bleed.
const coverStyle = computed(() => ({
  backgroundImage: ownGround.value
    ? "none"
    : `url(${props.cover}), url(${props.cover})`,
  backgroundColor:
    ownGround.value && props.reactive.paper ? props.reactive.paper : undefined,
  filter: reducedMotion.value
    ? "none"
    : `blur(${(scrollProgress.value * 8).toFixed(2)}px)`,
}));
const scrimOpacity = computed(() =>
  reducedMotion.value ? 0 : (scrollProgress.value * 0.25).toFixed(3)
);
const arrowHidden = computed(() => scrollProgress.value > 0.1);

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

function scrollDown() {
  const el = document.getElementById(props.scrollTarget);
  if (!el) return;
  // Native "auto" still follows html:focus-within's smooth scrolling. Use
  // the reader's jump so reduced motion is instant and the top bar clears it.
  jumpToElement(el, { align: "top", remember: false });
}
</script>

<template>
  <section
    class="opener-hero"
    aria-label="Chapter cover"
    :data-reactive-cover="reactive ? reactiveState || 'loading' : null"
  >
    <div
      class="opener-hero__cover"
      role="img"
      :aria-label="title ? `Cover image for ${title}` : 'Chapter cover image'"
      :style="coverStyle"
    >
      <!-- Inside the cover so the scroll blur and the scrim cover it too;
           in the stage, which is the hero's own box, so the cover's bleed
           moves nothing they draw. -->
      <div class="opener-hero__stage">
        <HeadCover
          v-if="ownGround"
          :spec="reactive"
          @state="reactiveState = $event"
        />
        <ReactiveCover
          v-else-if="showReactive"
          :spec="reactive"
          @state="reactiveState = $event"
        />
      </div>
    </div>
    <div class="opener-hero__scrim" :style="{ opacity: scrimOpacity }" />

    <button
      type="button"
      class="opener-hero__arrow"
      :class="{
        'opener-hero__arrow--hidden': arrowHidden,
        'opener-hero__arrow--ink': ownGround && reactive.ink,
      }"
      :style="ownGround && reactive.ink ? { color: reactive.ink } : undefined"
      aria-label="Scroll to the table of contents"
      @click="scrollDown"
    >
      <!-- Figma asset "Line 273" (1495:34231): a 32.5×22 line arrow, rotated to point down. -->
      <svg
        width="22"
        height="33"
        viewBox="0 0 32.5 22.0919"
        fill="none"
        aria-hidden="true"
        focusable="false"
        class="opener-hero__arrow-glyph"
      >
        <path
          d="M0.43934 9.98528C-0.146447 10.5711 -0.146447 11.5208 0.43934 12.1066L9.98528 21.6525C10.5711 22.2383 11.5208 22.2383 12.1066 21.6525C12.6924 21.0668 12.6924 20.117 12.1066 19.5312L3.62132 11.0459L12.1066 2.56066C12.6924 1.97487 12.6924 1.02513 12.1066 0.439341C11.5208 -0.146446 10.5711 -0.146446 9.98528 0.439341L0.43934 9.98528ZM1.5 11.0459V12.5459H32.5V11.0459V9.54594H1.5V11.0459Z"
          fill="currentColor"
        />
      </svg>
    </button>

    <MotionNotice class="opener-hero__notice" />
  </section>
</template>

<style scoped>
.opener-hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: rgb(var(--color-dark-surface));
}
/* The cover runs past the hero on every side (OPENBRAIN-83). A blurred
   box fades out at its edges, and as the cover blurred on scroll its last
   pixels faded into the dark ground behind it: a shadow along the cover's
   foot, where the contents begin (Maura, 25 Nov). The fade now happens in
   the bleed, which the hero clips. The bleed is three times the widest
   blur (8px), about as far as a blur reaches.
   The picture is painted twice so that nothing moves: once in the hero's
   own box (the content box, the layout it always had), and once over the
   whole of the larger box, under it, to give the bleed something to blur. */
.opener-hero__cover {
  --hero-bleed: 24px;
  position: absolute;
  inset: calc(-1 * var(--hero-bleed));
  padding: var(--hero-bleed);
  background-repeat: no-repeat;
  background-position: center 20%;
  background-size: cover;
  background-origin: content-box, border-box;
  will-change: filter;
}
.opener-hero__stage {
  position: absolute;
  inset: var(--hero-bleed);
}
.opener-hero__scrim {
  position: absolute;
  inset: 0;
  background: #000;
  pointer-events: none;
}

/* Down arrow: centred, 69px from the bottom in the 1728 frame → 4.3rem. */
.opener-hero__arrow {
  position: absolute;
  left: 50%;
  bottom: 4.3rem;
  transform: translateX(-50%);
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  color: #fff;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.3s ease;
}
.opener-hero__arrow--hidden {
  opacity: 0;
  pointer-events: none;
}
.opener-hero__arrow-glyph {
  /* The exported glyph points left; the frame rotates it to point down. */
  transform: rotate(-90deg);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.5));
}
/* On a paper ground the arrow is ink, and needs no shadow to be seen. */
.opener-hero__arrow--ink .opener-hero__arrow-glyph {
  filter: none;
}
.opener-hero__arrow--ink:focus-visible {
  outline-color: currentColor;
}
.opener-hero__arrow:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
  border-radius: 999px;
}

/* The motion notice: under the top bar's right end, by the "?" it points
   to; across the cover's top on a phone. On the cover it is over no text
   and none of the figure pane. */
.opener-hero__notice {
  position: absolute;
  top: calc(var(--reader-topbar-h, 4rem) + 0.75rem);
  right: 1.125rem;
  z-index: 1;
}
@media (max-width: 640px) {
  .opener-hero .opener-hero__notice {
    left: 0.5rem;
    right: 0.5rem;
    max-width: none;
  }
}
</style>
