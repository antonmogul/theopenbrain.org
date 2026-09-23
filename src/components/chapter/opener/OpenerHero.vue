<script setup>
/*
 * Chapter opener — hero (OPENBRAIN-32, Figma attn/introduction 1495:34229).
 *
 * A full-bleed cover the height of one viewport, a thin down-arrow centred
 * near the bottom, and the reader's small utility controls bottom-right.
 * As the reader scrolls the first viewport the cover blurs and darkens
 * slightly (skipped under reduce-motion). The chapter title is NOT printed
 * here any more: it lives in the dark title/TOC block that follows.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useReaderSidebar } from "@/composables/useReaderSidebar";

const props = defineProps({
  cover: { type: String, required: true },
  /* Used only for the image's accessible name. */
  title: { type: String, default: "" },
  /* Where the down-arrow scrolls to (an element id, without "#"). */
  scrollTarget: { type: String, default: "chapter-toc" },
});

const { open: openSidebarTab } = useReaderSidebar();

const scrollProgress = ref(0); // 0 at top → 1 after one viewport scrolled
const reduceMotion = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-reduce-motion") === "1";

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

const coverStyle = computed(() => ({
  backgroundImage: `url(${props.cover})`,
  filter: reduceMotion()
    ? "none"
    : `blur(${(scrollProgress.value * 8).toFixed(2)}px)`,
}));
const scrimOpacity = computed(() =>
  reduceMotion() ? 0 : (scrollProgress.value * 0.25).toFixed(3)
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
  el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });
}

/* The frame's utility row. "?" opens the reader's Info panel; the three
   notebook actions have no working target in the reader yet (the legacy
   JSON export/import UI has no owner), so they render disabled with a
   reason rather than pretending. */
const tools = [
  { key: "help", label: "?", title: "About this chapter", enabled: true },
  { key: "clear", label: "Clear", title: "Not available yet", enabled: false },
  {
    key: "export",
    label: "Export",
    title: "Not available yet",
    enabled: false,
  },
  {
    key: "import",
    label: "Import",
    title: "Not available yet",
    enabled: false,
  },
];
// Only the working tools are shown: three disabled buttons read as broken
// to a reader (beta, 2026-09-24). Flip `enabled` to bring one back.
const shownTools = tools.filter((t) => t.enabled);
function onTool(tool) {
  if (tool.key === "help") openSidebarTab("info");
}
</script>

<template>
  <section class="opener-hero" aria-label="Chapter cover">
    <div
      class="opener-hero__cover"
      role="img"
      :aria-label="title ? `Cover image for ${title}` : 'Chapter cover image'"
      :style="coverStyle"
    />
    <div class="opener-hero__scrim" :style="{ opacity: scrimOpacity }" />

    <button
      type="button"
      class="opener-hero__arrow"
      :class="{ 'opener-hero__arrow--hidden': arrowHidden }"
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

    <div class="opener-hero__tools" role="group" aria-label="Chapter tools">
      <button
        v-for="tool in shownTools"
        :key="tool.key"
        type="button"
        class="opener-hero__tool"
        :class="{ 'opener-hero__tool--help': tool.key === 'help' }"
        :disabled="!tool.enabled"
        :title="tool.title"
        @click="onTool(tool)"
      >
        {{ tool.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.opener-hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: rgb(var(--color-dark-surface));
}
.opener-hero__cover {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-position: center 20%;
  background-size: cover;
  will-change: filter;
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
.opener-hero__arrow:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
  border-radius: 999px;
}

/* Utility row bottom-right: small mono pills, as in the frame. */
.opener-hero__tools {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  display: flex;
  gap: 0.375rem;
}
.opener-hero__tool {
  font-family: var(--font-mono);
  font-size: var(--type-label-size);
  letter-spacing: var(--type-label-ls);
  text-transform: uppercase;
  line-height: 1;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.85);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  cursor: pointer;
}
.opener-hero__tool--help {
  width: 1.75rem;
  padding-left: 0;
  padding-right: 0;
  text-align: center;
}
.opener-hero__tool:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.opener-hero__tool:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 2px;
}
</style>
