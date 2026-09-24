<script setup>
/*
 * Creator dashboard "Widgets" section (OPENBRAIN-71): the interactive
 * figures the authors prototyped (src/widgets/catalog.js), which are built
 * into the app, and where each is used in the book: in the text (a widget
 * block), in the figure panel, or still placed by code.
 *
 * Self-contained: loads the catalog lazily (it carries the authors' raw
 * HTML) and its own usage data.
 */
import { computed, onMounted, ref } from "vue";
import {
  SectionHeader,
  BaseCard,
  EmptyState,
  LoadingState,
  ErrorState,
  SearchInput,
  FilterChips,
} from "@/components/dashboard/shared";
import { hasEmbed } from "@/widgets/embeds";
import { useWidgetUsage } from "@/composables/useWidgetUsage";

const widgets = ref([]);
const catalogError = ref("");
const catalogLoading = ref(true);
const {
  usage,
  loading: usageLoading,
  error: usageError,
  load,
} = useWidgetUsage();

async function loadAll() {
  catalogLoading.value = true;
  catalogError.value = "";
  try {
    const { WIDGETS } = await import("@/widgets/catalog");
    // The compact RetINaBox is the same widget as RetINaBox for the book.
    widgets.value = WIDGETS.filter((w) => w.id !== "retinabox-app");
  } catch (err) {
    console.error("WidgetsSection: catalog failed to load", err);
    catalogError.value = "The widget catalog didn't load. Try again.";
  } finally {
    catalogLoading.value = false;
  }
  load();
}
onMounted(loadAll);

const search = ref("");
const filter = ref("all");
const filterOptions = [
  { value: "all", label: "All" },
  { value: "used", label: "In a chapter" },
  { value: "unused", label: "Not used yet" },
  { value: "original", label: "Original only" },
];

const rows = computed(() =>
  widgets.value.map((w) => ({
    ...w,
    builtIn: hasEmbed(w.id),
    places: usage.value.get(w.id) || [],
  }))
);
const shown = computed(() => {
  const q = search.value.trim().toLowerCase();
  return rows.value.filter((w) => {
    if (
      q &&
      ![w.title, w.author, w.chapter, w.desc]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (filter.value === "used") return w.places.length > 0;
    if (filter.value === "unused") return w.places.length === 0;
    if (filter.value === "original") return !w.builtIn;
    return true;
  });
});
const counts = computed(() => ({
  total: rows.value.length,
  used: rows.value.filter((w) => w.places.length).length,
  original: rows.value.filter((w) => !w.builtIn).length,
}));

const WHERE = {
  text: "in the text",
  panel: "in the figure panel",
  code: "placed by code",
};
const editHref = (p) =>
  p.chapterSlug ? `/dashboard/chapters/${p.chapterSlug}` : null;
</script>

<template>
  <section class="section">
    <SectionHeader
      eyebrow="05 · Widgets"
      title="Interactive widgets"
      subtitle="The authors' interactive figures. Add one to a chapter from its chapter page: “+ Widget” in the text, or “Widget in panel” beside a paragraph."
    />

    <LoadingState v-if="catalogLoading" message="Loading widgets…" />
    <ErrorState
      v-else-if="catalogError"
      :message="catalogError"
      @retry="loadAll"
    />
    <template v-else>
      <p class="ws-summary">
        {{ counts.total }} widgets · {{ counts.used }} in a chapter ·
        {{ counts.original }} only as the author's original
        <span v-if="usageLoading"> · checking chapters…</span>
      </p>
      <p v-if="usageError" class="ws-warn" role="alert">{{ usageError }}</p>

      <div class="ws-tools">
        <SearchInput v-model="search" placeholder="Search widgets…" />
        <FilterChips v-model="filter" :options="filterOptions" />
      </div>

      <EmptyState
        v-if="!shown.length"
        title="No widgets match"
        description="Try another search or filter."
      />
      <ul v-else class="ws-grid">
        <li v-for="w in shown" :key="w.id">
          <BaseCard class="ws-card">
            <div class="ws-head">
              <h3 class="ws-title">{{ w.title }}</h3>
              <span
                class="ws-chip"
                :class="w.builtIn ? 'is-built' : 'is-original'"
                >{{ w.builtIn ? "Built in" : "Original only" }}</span
              >
            </div>
            <p class="ws-meta">{{ w.author }} · {{ w.chapter }}</p>
            <p class="ws-desc">{{ w.desc }}</p>

            <div class="ws-used">
              <span class="ws-label">Used in</span>
              <ul v-if="w.places.length" class="ws-places">
                <li v-for="(p, i) in w.places" :key="i">
                  <a v-if="editHref(p)" :href="editHref(p)">{{ p.chapter }}</a>
                  <span v-else>{{ p.chapter }}</span>
                  <template v-if="p.section"> · {{ p.section }}</template>
                  <span class="ws-where"> — {{ WHERE[p.where] }}</span>
                </li>
              </ul>
              <p v-else class="ws-none">
                {{
                  w.builtIn
                    ? "Not in a chapter yet."
                    : "Not in the reader yet: only the author's original HTML exists."
                }}
              </p>
            </div>

            <div class="ws-actions">
              <a
                v-if="w.vuePath"
                :href="w.vuePath"
                target="_blank"
                rel="noopener"
                class="ws-link"
                >Open ↗</a
              >
              <a href="/widgets" target="_blank" rel="noopener" class="ws-link"
                >Compare with the original ↗</a
              >
            </div>
          </BaseCard>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.ws-summary,
.ws-warn {
  margin: 0 0 12px;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  color: rgb(var(--color-mute));
}
.ws-warn {
  color: rgb(var(--color-accent));
}
.ws-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.ws-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ws-card {
  display: grid;
  gap: 8px;
  height: 100%;
  align-content: start;
  font-family: var(--font-ui);
}
.ws-head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}
.ws-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.3;
}
.ws-chip {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.ws-chip.is-built {
  background: rgb(var(--color-complete) / 0.15);
  color: rgb(var(--color-ink));
}
.ws-chip.is-original {
  background: rgb(var(--color-warn) / 0.18);
  color: rgb(var(--color-ink));
}
.ws-meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: rgb(var(--color-mute));
}
.ws-desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}
.ws-used {
  display: grid;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid rgb(var(--color-line));
  font-size: 0.8125rem;
}
.ws-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.ws-places {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ws-places a {
  color: rgb(var(--color-accent));
}
.ws-where,
.ws-none {
  color: rgb(var(--color-mute));
}
.ws-none {
  margin: 0;
}
.ws-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}
.ws-link {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
}
</style>
