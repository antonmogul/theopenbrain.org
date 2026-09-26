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
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { buildWidgetDoc, themeMessage } from "./widgetHost";

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
});
const emit = defineEmits(["report"]);

const frame = ref(null);
const height = ref(props.minHeight);
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

const doc = computed(() =>
  buildWidgetDoc(props.html, { ramp: props.ramp, reduceMotion: reduceMotion() })
);

function sendTheme() {
  frame.value?.contentWindow?.postMessage(
    themeMessage(props.ramp, reduceMotion()),
    "*"
  );
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
    height.value = Math.max(80, Math.min(m.height, 6000));
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
    height.value = props.minHeight;
  }
);

onMounted(() => window.addEventListener("message", onMessage));
onBeforeUnmount(() => window.removeEventListener("message", onMessage));
</script>

<template>
  <iframe
    ref="frame"
    class="widget-frame"
    :srcdoc="doc"
    sandbox="allow-scripts"
    :title="title"
    loading="lazy"
    referrerpolicy="no-referrer"
    :style="{
      height: `${height}px`,
      width: width ? `${width}px` : '100%',
    }"
    @load="sendTheme"
  />
</template>

<style scoped>
.widget-frame {
  display: block;
  max-width: 100%;
  border: 0;
  background: #1c1c1c;
}
</style>
