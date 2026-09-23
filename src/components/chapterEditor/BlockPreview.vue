<script setup>
/*
 * BlockPreview — one paragraph row drawn for the chapter block page
 * (OPENBRAIN-60). Text uses the reader's own HTML (contentBlocksToHTML), so
 * citations, figure refs, hover-image spans and bold look as they do in the
 * book; widgets mount through the reader's WidgetBreakout, so they run; the
 * paragraph's figure (animation_id) shows as a card with its title.
 */
import { computed, defineAsyncComponent } from "vue";
import { contentBlocksToHTML } from "@/composables/chapterTransform.mjs";
import { blockSegments, BLOCK_LABELS } from "@/editor/segments";
import { imageUrl } from "@/editor/media.mjs";

const WidgetBreakout = defineAsyncComponent(
  () => import("@/components/chapter/text/WidgetBreakout.vue")
);

const props = defineProps({
  paragraph: { type: Object, required: true },
  /** Map of animation id → media row, for the figure card. */
  mediaById: { type: Object, default: () => new Map() },
});

const blocks = computed(() => props.paragraph.content?.blocks || []);
const segments = computed(() => blockSegments(blocks.value));
const isHeader = computed(() => !!props.paragraph.is_subsection_header);
const figure = computed(() =>
  props.paragraph.animation_id
    ? props.mediaById.get(props.paragraph.animation_id) || {
        title: "Figure",
        media_type: "",
      }
    : null
);

const inlineHtml = (seg) => contentBlocksToHTML(seg.blocks).text;
const headingLevel = (level) => Math.min(Math.max(level || 3, 2), 6);
const headingTag = (level) => `h${headingLevel(level)}`;
const plain = (html) => String(html || "").replace(/<[^>]*>/g, "");
</script>

<template>
  <div class="bp" :class="{ 'bp--header': isHeader }">
    <!-- Subsection header rows: the reader takes the title from content_text -->
    <component
      :is="headingTag((paragraph.subsection_level || 1) + 2)"
      v-if="isHeader"
      class="bp-subhead"
      >{{ paragraph.content_text }}</component
    >

    <template v-else>
      <template v-for="(seg, i) in segments" :key="i">
        <p
          v-if="seg.kind === 'inline'"
          class="bp-prose"
          v-html="inlineHtml(seg)"
        />

        <div
          v-else-if="seg.kind === 'heading'"
          class="bp-heading"
          :class="`is-h${headingLevel(seg.block.level)}`"
          role="heading"
          :aria-level="headingLevel(seg.block.level)"
          v-html="seg.block.content"
        />

        <component
          :is="seg.block.ordered ? 'ol' : 'ul'"
          v-else-if="seg.kind === 'list'"
          class="bp-list"
        >
          <li
            v-for="(item, j) in seg.block.items || []"
            :key="j"
            v-html="item"
          />
        </component>

        <blockquote
          v-else-if="seg.kind === 'blockquote'"
          class="bp-quote"
          v-html="seg.block.content"
        />

        <figure v-else-if="seg.kind === 'image'" class="bp-image">
          <img
            :src="imageUrl(seg.block.src)"
            :alt="seg.block.alt || ''"
            loading="lazy"
          />
          <figcaption v-if="seg.block.caption" v-html="seg.block.caption" />
        </figure>

        <div v-else-if="seg.kind === 'widget'" class="bp-widget">
          <WidgetBreakout :placement="seg.block" />
        </div>

        <div v-else class="bp-card">
          <span class="bp-card-kind">{{
            BLOCK_LABELS[seg.kind] || seg.kind
          }}</span>
          <span v-if="seg.kind === 'footnote'" class="bp-card-body"
            ><b>{{ seg.block.number }}.</b> {{ plain(seg.block.content) }}</span
          >
          <span v-else-if="seg.block.title" class="bp-card-body">{{
            seg.block.title
          }}</span>
        </div>
      </template>
      <p v-if="!segments.length" class="bp-empty">Empty paragraph</p>
    </template>

    <div v-if="figure" class="bp-figure">
      <span class="bp-figure-kind"
        >Figure · {{ figure.media_type || "media" }}</span
      >
      <span class="bp-figure-title">{{ figure.title }}</span>
      <span v-if="paragraph.animation_trigger" class="bp-figure-trigger"
        >shows
        {{
          paragraph.animation_trigger === "scroll"
            ? "on scroll"
            : "when reached"
        }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.bp {
  display: grid;
  gap: 0.75rem;
}
.bp-prose,
.bp-list,
.bp-quote {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.65;
  color: rgb(var(--color-ink));
}
.bp-prose :deep(.citation-ref),
.bp-prose :deep(sup) {
  font-size: 0.7em;
  color: rgb(var(--color-accent));
  margin-left: 1px;
}
.bp-prose :deep(.figure-ref) {
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 0 4px;
  border-radius: 3px;
  background: rgb(var(--color-accent) / 0.1);
  color: rgb(var(--color-accent));
}
.bp-prose :deep(.hoverImg) {
  border-bottom: 1px dotted rgb(var(--color-mute));
}
.bp-heading,
.bp-subhead {
  margin: 0;
  font-family: var(--font-ui);
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--color-ink));
}
.bp-heading.is-h2,
.bp-heading.is-h3,
h3.bp-subhead {
  font-size: 1.25rem;
}
.bp-heading.is-h4,
.bp-heading.is-h5,
.bp-heading.is-h6,
h4.bp-subhead {
  font-size: 1.0625rem;
}
.bp-quote {
  padding-left: 1rem;
  border-left: 3px solid rgb(var(--color-line));
  font-style: italic;
}
.bp-list {
  padding-left: 1.25rem;
}
.bp-image {
  margin: 0;
  display: grid;
  gap: 0.5rem;
}
.bp-image img {
  max-width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: 6px;
  background: rgb(var(--color-bg));
}
.bp-image figcaption {
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  color: rgb(var(--color-mute));
}
.bp-widget {
  min-width: 0;
}
.bp-card,
.bp-figure {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 10px 12px;
  border: 1px dashed rgb(var(--color-line));
  border-radius: 6px;
  background: rgb(var(--color-bg));
  font-family: var(--font-ui);
  font-size: 0.875rem;
}
.bp-figure {
  border-style: solid;
  border-color: rgb(var(--color-accent) / 0.35);
  background: rgb(var(--color-accent) / 0.05);
}
.bp-card-kind,
.bp-figure-kind {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.bp-figure-kind {
  color: rgb(var(--color-accent));
}
.bp-figure-title {
  font-weight: 500;
}
.bp-figure-trigger {
  color: rgb(var(--color-mute));
  font-size: 0.8125rem;
}
.bp-card-body {
  color: rgb(var(--color-ink));
}
.bp-empty {
  margin: 0;
  color: rgb(var(--color-mute));
  font-style: italic;
}
</style>
