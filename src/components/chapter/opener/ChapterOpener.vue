<script setup>
/*
 * Chapter opener (OPENBRAIN-32): the dark block every chapter starts with —
 * a full-viewport cover, then the chapter title and numbered table of
 * contents. The dark stops at the end of the TOC; the light 50/50 reading
 * body follows.
 *
 * Replaces EyeStart. It sits absolutely at the top of the reader like the
 * old hero did, so the text column (TextComp .top-start) needs to know how
 * tall it is: the measured height is published as --opener-h on <html>,
 * which .top-start consumes (fallback 100vh = the old hero-only height).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import OpenerHero from "./OpenerHero.vue";
import OpenerToc from "./OpenerToc.vue";
import { buildOutline } from "@/composables/useChapterOutline";
import { coverForModule } from "@/helper/chapterCover";

const props = defineProps({
  /* The module row (title, description, slug, ramp, cover_image_url). */
  module: { type: Object, default: null },
  /* The transformed chapter the reader holds ({ intro, sections }). */
  text: { type: Object, default: null },
});

const title = computed(
  () => props.module?.title || props.text?.intro?.[0]?.title || ""
);
const subtitle = computed(() => props.module?.description || "");
const cover = computed(() => coverForModule(props.module));
const outline = computed(() => buildOutline(props.text));

gsap.registerPlugin(ScrollTrigger);

const rootEl = ref(null);
let observer = null;
let publishedHeight = null;

function publishHeight() {
  if (!rootEl.value) return;
  const h = Math.round(rootEl.value.getBoundingClientRect().height);
  if (h === publishedHeight) return;
  publishedHeight = h;
  document.documentElement.style.setProperty("--opener-h", `${h}px`);
  // The text column moves by the height delta, so every ScrollTrigger the
  // figure pane and the prose registered against the old geometry must
  // re-measure — otherwise figures fire off by the TOC height.
  ScrollTrigger.refresh();
}

onMounted(() => {
  publishHeight();
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(publishHeight);
    observer.observe(rootEl.value);
  }
  window.addEventListener("resize", publishHeight);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", publishHeight);
  publishedHeight = null;
  document.documentElement.style.removeProperty("--opener-h");
});
// The outline arrives after the module (two fetches); re-measure when it lands.
watch(outline, () => requestAnimationFrame(publishHeight));
</script>

<template>
  <div ref="rootEl" class="chapter-opener" data-chapter-opener>
    <OpenerHero :cover="cover" :title="title" scroll-target="chapter-toc" />
    <OpenerToc
      id="chapter-toc"
      :title="title"
      :subtitle="subtitle"
      :outline="outline"
    />
  </div>
</template>

<style scoped>
.chapter-opener {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  /* Above the fixed figure pane (z-30), below the fixed top bar. */
  z-index: 35;
}
</style>
