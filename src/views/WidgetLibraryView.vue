<script setup>
/*
 * WidgetLibraryView — browsable gallery of every interactive widget.
 *
 * Mirrors the sidebar pattern from StyleGuideView: a nav rail on the left
 * lists chapters (each containing widgets), and the content pane shows the
 * selected widget in a live iframe. Authors, professors, and the design
 * team can browse everything in one place without hunting through chapters.
 *
 * Hosting: widgets render via iframe srcdoc. This preserves the author's
 * original HTML/JS verbatim — no risk of breaking scientific maths or
 * interaction by wrapping in Vue. Widgets that also have a Vue SFC rewrite
 * (like SDT) show a "Vue version" link.
 *
 * Route: /widgets (unlisted, direct access only — same as /styleguide).
 */
import { ref, computed, watch, nextTick } from "vue";
import { WIDGETS, widgetsByChapter } from "@/widgets/catalog";

// ── State ──────────────────────────────────────────────────────────────
const chapters = widgetsByChapter();
const activeId = ref(WIDGETS[0]?.id ?? "");
const activeWidget = computed(() =>
  WIDGETS.find((w) => w.id === activeId.value)
);

const iframeRef = ref(null);

// Scroll content pane to top when switching widgets.
watch(activeId, async () => {
  await nextTick();
  document.querySelector(".wl-content")?.scrollTo?.({ top: 0 });
});

function select(id) {
  activeId.value = id;
}

// ── Chapter icon lookup (simple emoji, no artwork needed) ──────────────
const CHAPTER_ICONS = {
  "The Retina": "👁",
  "Visual Cortex (V1)": "🧠",
  "Attention & Working Memory": "🎯",
};

// ── Widget counts ──────────────────────────────────────────────────────
const totalCount = WIDGETS.length;
</script>

<template>
  <div class="wl">
    <!-- Sidebar -->
    <aside class="wl-sidebar">
      <div class="wl-brand">
        <img
          src="/publicAssets/images/logo.svg"
          alt="The Open Brain"
          class="wl-logo"
        />
        <p class="t-label wl-brand-tag">Widget library</p>
        <p class="wl-count t-caption">{{ totalCount }} interactive widgets</p>
      </div>

      <nav class="wl-nav">
        <div
          v-for="group in chapters"
          :key="group.chapter"
          class="wl-nav-group"
        >
          <p class="t-label wl-nav-heading">
            <span class="wl-nav-icon">{{
              CHAPTER_ICONS[group.chapter] ?? "📖"
            }}</span>
            {{ group.chapter }}
          </p>
          <button
            v-for="w in group.widgets"
            :key="w.id"
            class="wl-nav-item"
            :class="{ 'is-active': activeId === w.id }"
            @click="select(w.id)"
          >
            <span class="wl-nav-label">{{ w.title }}</span>
          </button>
        </div>
      </nav>

      <div class="wl-foot">
        <router-link to="/styleguide" class="t-label wl-foot-link">
          → Design system
        </router-link>
        <router-link to="/" class="t-label wl-foot-link">
          ← Back to app
        </router-link>
      </div>
    </aside>

    <!-- Content -->
    <main class="wl-content">
      <template v-if="activeWidget">
        <!-- Widget header -->
        <div class="wl-header">
          <div class="wl-meta-row">
            <span class="wl-chip">{{ activeWidget.chapter }}</span>
            <span class="wl-author t-caption"
              >by {{ activeWidget.author }}</span
            >
            <router-link
              v-if="activeWidget.vuePath"
              :to="activeWidget.vuePath"
              class="wl-vue-link t-caption"
            >
              Vue version →
            </router-link>
          </div>
          <h1 class="wl-title">{{ activeWidget.title }}</h1>
          <p class="wl-desc t-body-sm">{{ activeWidget.desc }}</p>
          <div v-if="activeWidget.deps?.length" class="wl-deps t-caption">
            <span class="wl-deps-label">Dependencies:</span>
            {{ activeWidget.deps.join(", ") }}
          </div>
        </div>

        <!-- Widget iframe -->
        <div class="wl-frame-wrap">
          <iframe
            ref="iframeRef"
            :key="activeWidget.id"
            :srcdoc="activeWidget.srcHtml"
            :style="{ height: activeWidget.height ?? '600px' }"
            class="wl-frame"
            sandbox="allow-scripts allow-same-origin"
            :title="activeWidget.title"
          />
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.wl {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

/* ── Sidebar ────────────────────────────────────────────────────────── */
.wl-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-paper));
  border-right: 1px solid rgb(var(--color-line));
  padding: 1.5rem 0.9375rem;
  overflow-y: auto;
}

.wl-brand {
  margin-bottom: 1.25rem;
}
.wl-logo {
  width: 140px;
  height: auto;
  display: block;
}
.wl-brand-tag {
  color: rgb(var(--color-accent));
  margin-top: 0.625rem;
  font-weight: 600;
}
.wl-count {
  color: rgb(var(--color-mute));
  margin-top: 0.25rem;
}

/* ── Nav ─────────────────────────────────────────────────────────────── */
.wl-nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
}
.wl-nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.wl-nav-heading {
  color: rgb(var(--color-mute));
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.wl-nav-icon {
  font-size: 1rem;
}

.wl-nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.3125rem 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  line-height: 1.4;
}
.wl-nav-item:hover {
  background: rgb(var(--color-bg));
}
.wl-nav-item.is-active {
  background: rgb(var(--color-accent) / 0.12);
  color: rgb(var(--color-accent));
  font-weight: 600;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.wl-foot {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-top: 0.9375rem;
  border-top: 1px solid rgb(var(--color-line));
  margin-top: 0.9375rem;
}
.wl-foot-link {
  color: rgb(var(--color-mute));
  text-decoration: none;
}
.wl-foot-link:hover {
  color: rgb(var(--color-accent));
}

/* ── Content ─────────────────────────────────────────────────────────── */
.wl-content {
  padding: 2rem 2.5rem 5rem;
  max-width: 1200px;
  overflow-y: auto;
}

.wl-header {
  margin-bottom: 1.5rem;
}
.wl-meta-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.wl-chip {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.12);
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
  font-weight: 500;
}
.wl-author {
  color: rgb(var(--color-mute));
}
.wl-vue-link {
  color: rgb(var(--color-accent));
  text-decoration: none;
  font-weight: 500;
}
.wl-vue-link:hover {
  text-decoration: underline;
}

.wl-title {
  font-size: 1.5rem;
  font-weight: 640;
  letter-spacing: -0.015em;
  margin: 0 0 0.375rem;
}
.wl-desc {
  color: rgb(var(--color-mute));
  margin: 0;
  max-width: 680px;
}
.wl-deps {
  margin-top: 0.5rem;
  color: rgb(var(--color-mute));
}
.wl-deps-label {
  font-weight: 500;
  color: rgb(var(--color-ink));
}

/* ── Iframe ──────────────────────────────────────────────────────────── */
.wl-frame-wrap {
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.wl-frame {
  display: block;
  width: 100%;
  border: none;
  background: #fff;
}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .wl {
    grid-template-columns: 1fr;
  }
  .wl-sidebar {
    position: relative;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid rgb(var(--color-line));
  }
  .wl-content {
    padding: 1.5rem 1rem 3rem;
  }
}

/* ── Reduced motion ──────────────────────────────────────────────────── */
[data-reduce-motion="1"] .wl-nav-item {
  transition: none;
}
</style>
