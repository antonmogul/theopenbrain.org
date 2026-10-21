<script setup>
/*
 * WidgetFrame — an uploaded widget running in the book (OPENBRAIN-105).
 *
 * A sandboxed iframe (scripts only: no same-origin, so the widget cannot
 * reach the reader's session, cookies or the page) whose document comes
 * from widgetHost.buildWidgetDoc: the book's policy, tokens and bridge
 * around the author's HTML. The frame is as tall as the widget says it is,
 * and it reports what the bridge sees (size, overflow, errors, blocked
 * requests) for the Studio's checks.
 *
 * With `maxHeight` (the figure pane, OPENBRAIN-148) the frame never grows
 * past that height, and tells the widget through the bridge so it can fit
 * its picture, caption and controls into the box instead of overflowing it.
 * A widget that stays taller anyway (uploaded before the kit had `fit`) is
 * shown shrunk to the box, whole, rather than cut off.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  buildWidgetDoc,
  fitHeight,
  fitMessage,
  fitScale,
  themeMessage,
} from "./widgetHost";

const props = defineProps({
  /** The widget's HTML (one self-contained file). */
  html: { type: String, required: true },
  /** Subject ramp for the accent: fund | perc | move | lear | deve. */
  ramp: { type: String, default: "fund" },
  /** Accessible name for the frame. */
  title: { type: String, default: "Interactive figure" },
  /** A fixed width in px (the Studio's previews); default: the container. */
  width: { type: Number, default: null },
  /** Starting height before the widget reports its own. */
  minHeight: { type: Number, default: 240 },
  /**
   * The height the frame must fit in px (the figure pane), or null to grow
   * with the widget (an inline band, a breakout, the Studio).
   */
  maxHeight: { type: Number, default: null },
  /** A full-width stage keeps its width; long content remains scrollable. */
  shrinkToFit: { type: Boolean, default: true },
  /** Open an explanation once through a compatible widget's own controller. */
  initialExplanation: { type: Boolean, default: false },
  eager: { type: Boolean, default: false },
  waitForArtwork: { type: Boolean, default: false },
});
const emit = defineEmits(["report"]);

const frame = ref(null);
const sizing = () => ({
  minHeight: props.minHeight,
  maxHeight: props.maxHeight,
});
const height = ref(fitHeight(0, sizing()));
const report = ref({
  ready: false,
  height: 0,
  scrollWidth: 0,
  viewport: 0,
  errors: [],
  blocked: [],
});

const reduceMotion = () =>
  typeof document !== "undefined" &&
  (document.documentElement.getAttribute("data-reduce-motion") === "1" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// The box's height at creation goes into the document so the widget lays
// out for it from its first paint; later changes arrive as `fit` messages
// (a new srcdoc would reload the widget).
const initialFit = props.maxHeight;
const doc = computed(() =>
  buildWidgetDoc(props.html, {
    ramp: props.ramp,
    reduceMotion: reduceMotion(),
    maxHeight: initialFit,
    initialExplanation: props.initialExplanation,
    waitForArtwork: props.waitForArtwork,
  })
);

/*
 * Shrinking a widget that doesn't fit the box. The decision is made once,
 * from the size the widget reports while its viewport is the box (its
 * first paint, or after the box resized), and then held: a scaled frame is
 * laid out taller than the box, and a widget that fills its viewport would
 * report that taller size and shrink again, without end. The box resizing
 * starts a new decision; a report that doesn't come within a moment (a
 * widget whose content didn't change) is decided from the last one.
 */
const scale = ref(1);
const frameHeight = ref(0); // the layout height while scaled
let deciding = !!(props.maxHeight > 0);
let decideTimer = null;

function decide() {
  clearTimeout(decideTimer);
  decideTimer = null;
  deciding = false;
  const s = props.shrinkToFit
    ? fitScale(report.value.height, props.maxHeight)
    : 1;
  scale.value = s;
  frameHeight.value =
    s < 1 ? Math.round(fitHeight(report.value.height, sizing()) / s) : 0;
}

function redecide() {
  clearTimeout(decideTimer);
  scale.value = 1;
  frameHeight.value = 0;
  deciding = !!(props.maxHeight > 0);
  if (deciding && report.value.height) decideTimer = setTimeout(decide, 300);
}

function sendTheme() {
  frame.value?.contentWindow?.postMessage(
    themeMessage(props.ramp, reduceMotion()),
    "*"
  );
  sendFit();
}

function sendFit() {
  frame.value?.contentWindow?.postMessage(fitMessage(props.maxHeight), "*");
}

function onMessage(e) {
  if (!frame.value || e.source !== frame.value.contentWindow) return;
  const m = e.data;
  if (!m || !m.__ob) return;
  const r = { ...report.value };
  if (m.type === "size") {
    r.height = m.height;
    r.scrollWidth = m.scrollWidth;
    r.viewport = m.viewport;
    height.value = fitHeight(m.height, sizing());
    report.value = r;
    if (deciding) decide();
  } else if (m.type === "ready") {
    r.ready = true;
    sendTheme();
  } else if (m.type === "error") {
    r.errors = [...r.errors, m.message].slice(-20);
  } else if (m.type === "blocked") {
    if (!r.blocked.includes(m.url)) r.blocked = [...r.blocked, m.url];
  } else return;
  report.value = r;
  emit("report", r);
}

// A new file or colour starts a fresh report.
watch(
  () => [props.html, props.ramp],
  () => {
    report.value = {
      ready: false,
      height: 0,
      scrollWidth: 0,
      viewport: 0,
      errors: [],
      blocked: [],
    };
    height.value = fitHeight(0, sizing());
    redecide();
  }
);

// The pane resized: clamp again, tell the widget, and decide afresh.
watch(
  () => props.maxHeight,
  () => {
    height.value = fitHeight(report.value.height, sizing());
    redecide();
    sendFit();
  }
);

onMounted(() => window.addEventListener("message", onMessage));
onBeforeUnmount(() => {
  window.removeEventListener("message", onMessage);
  clearTimeout(decideTimer);
});
</script>

<template>
  <div
    class="widget-box"
    :class="{ 'widget-box--scaled': scale < 1 }"
    :style="{ height: `${height}px`, width: width ? `${width}px` : '100%' }"
    :data-widget-scale="scale < 1 ? scale : undefined"
  >
    <iframe
      ref="frame"
      class="widget-frame"
      :srcdoc="doc"
      sandbox="allow-scripts"
      :title="title"
      :loading="eager ? 'eager' : 'lazy'"
      referrerpolicy="no-referrer"
      :style="{
        height: `${scale < 1 ? frameHeight : height}px`,
        transform: scale < 1 ? `scale(${scale})` : undefined,
      }"
      @load="sendTheme"
    />
  </div>
</template>

<style scoped>
.widget-box {
  display: block;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background: #1c1c1c;
}
.widget-frame {
  display: block;
  width: 100%;
  border: 0;
  background: #1c1c1c;
}
.widget-box--scaled .widget-frame {
  transform-origin: top center;
}
</style>
