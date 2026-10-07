<script setup>
/* A deliberately scoped reader-shaped fixture, not a DB-backed chapter.
 * Real breakouts, gallery, dialogs and source data remain unmodified. */
import { computed, ref } from "vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";
import { WIDGET_PLACEMENTS } from "@/widgets/placements";
import WidgetBreakout from "@/components/chapter/text/WidgetBreakout.vue";
import IllustrationPlaceholder from "@/components/chapter/Illus/IllustrationPlaceholder.vue";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import Phrenology3DView from "../Phrenology3DView.vue";
import fixture from "./historyFixtureData.json";

const props = defineProps({
  subject: { type: String, required: true },
});
const narrow = useMediaQuery(READER_NARROW_QUERY);
const open3d = ref(false);
const placement = computed(() => {
  const record = WIDGET_PLACEMENTS.find(
    (item) => item.widgetId === props.subject
  );
  return record ? { ...record, placementId: record.id } : null;
});
const gallery = {
  id: "animationFoundationsFig6",
  title: "The medieval cell doctrine",
  figureNumber: 6,
  diagramType: "manuscript",
  placeholder: true,
  images: fixture.images,
};
</script>

<template>
  <main class="history-fixture" data-chapter="fund" :data-subject="subject">
    <header class="history-fixture__header">
      <p>THE OPEN BRAIN · HISTORY</p>
      <h1>Foundations of Neuroscience</h1>
      <p class="history-fixture__boundary">
        Local source fixture for browser review. This is a scoped reader
        excerpt, not the published chapter or a check of database content.
      </p>
    </header>
    <div class="history-fixture__columns">
      <aside class="history-fixture__figure" aria-label="History figure pane">
        <IllustrationPlaceholder
          v-if="subject === 'gallery'"
          :animation="gallery"
          :inline="narrow"
        />
        <div v-else class="history-fixture__source">
          <h2>Interactive source appendix</h2>
          <p>
            Open the interactive in the text column to examine the original
            source-backed maps, quotations and illustrations.
          </p>
        </div>
      </aside>
      <article
        class="history-fixture__prose"
        aria-label="History reader excerpt"
      >
        <h2>Where is my mind?</h2>
        <p>
          <template
            v-for="(block, index) in fixture.paragraph.blocks"
            :key="index"
          >
            <span v-if="block.type === 'text'">{{ block.content }}</span>
            <sup v-else-if="block.type === 'citation_ref'"
              >[{{ block.number }}]</sup
            >
            <span v-else-if="block.type === 'figure_placeholder'"
              >Figure {{ block.number }}</span
            >
          </template>
        </p>
        <WidgetBreakout v-if="placement" :placement="placement" />
        <aside
          v-if="subject === 'phrenology-3d'"
          class="history-fixture__source"
        >
          <h3>Phrenology · 3D comparison fixture</h3>
          <p>
            The actual 3D view is hosted in the reader dialog for this test.
            This does not assert a published 3D chapter placement.
          </p>
          <button type="button" @click="open3d = true">
            Open 3D comparison
          </button>
        </aside>
        <footer class="history-fixture__footer">
          <p>{{ fixture.boundary }}</p>
          <button type="button">End of fixture</button>
        </footer>
      </article>
    </div>
    <DemoModal
      :show="open3d"
      title="Phrenology · 3D comparison"
      wide
      @close="open3d = false"
    >
      <Phrenology3DView v-if="open3d" />
    </DemoModal>
  </main>
</template>

<style scoped>
.history-fixture {
  --app-w: 100vw;
  min-height: 140vh;
  color: rgb(var(--color-ink));
  background: rgb(var(--color-paper));
}
.history-fixture__header {
  padding: 1.5rem clamp(1rem, 4vw, 4rem);
  border-bottom: 1px solid rgb(var(--color-line));
}
.history-fixture__header h1 {
  font: 600 clamp(1.5rem, 3vw, 2.5rem) var(--font-body);
  margin: 0.5rem 0;
}
.history-fixture__boundary {
  font: 0.75rem/1.5 var(--font-mono);
  color: rgb(var(--color-mute));
}
.history-fixture__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
}
.history-fixture__figure {
  position: sticky;
  top: 0;
  height: 80vh;
  padding: 1rem;
  min-width: 0;
}
.history-fixture__prose {
  min-width: 0;
  padding: clamp(1rem, 3vw, 3rem);
  border-left: 1px solid rgb(var(--color-line));
  font: 1.1rem/1.7 var(--font-body);
}
.history-fixture__prose h2 {
  margin-bottom: 1.5rem;
  font-size: 1.7rem;
}
.history-fixture__source {
  padding: 1rem;
  border: 1px solid rgb(var(--color-line));
  font: 1rem/1.6 var(--font-ui);
}
.history-fixture button {
  padding: 0.65rem 1rem;
  min-height: 44px;
  border: 1px solid rgb(var(--color-line));
  margin-top: 1rem;
}
.history-fixture__footer {
  margin-top: 4rem;
  padding-bottom: 12rem;
  font: 0.8rem/1.6 var(--font-mono);
}
@media (max-width: 1023px) {
  .history-fixture__columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .history-fixture__figure {
    position: static;
    height: auto;
  }
  .history-fixture__prose {
    border-left: 0;
  }
}
</style>
