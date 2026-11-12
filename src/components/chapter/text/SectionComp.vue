<template>
  <!-- A breakout box goes full screen (OPENBRAIN-91): BreakoutBox is the
       frame, and this component renders the box's text into it. -->
  <BreakoutBox
    v-if="section.kind === 'box' && !boxBody"
    :section="section"
    :label="label"
    :paired-explores="pairedExploreIds.size > 0"
  >
    <SectionComp
      :section="section"
      :index="index"
      :label="label"
      :is-creator="isCreator"
      box-body
    />
    <!-- Read sideways, a widget that ends the box (the Penfield binder)
         follows the track instead of riding on it (OPENBRAIN-187). -->
    <template #after>
      <SectionComp
        :section="section"
        :index="index"
        :label="label"
        :is-creator="isCreator"
        box-body
        box-tail
      />
    </template>
  </BreakoutBox>
  <!-- section (a div in a box: the reader gives every <section> a full
       screen's height, which left short boxes mostly empty). reader-section
       gives a chapter section its space after (OPENBRAIN-131, index.css). -->
  <component
    :is="boxBody ? 'div' : 'section'"
    v-else
    :id="boxBody ? undefined : section.id"
    :data-section-slug="boxBody ? undefined : section.slug"
    class="overflow-y-visible"
    :class="{ 'reader-section': !boxBody }"
  >
    <!-- section titel -->
    <!-- Trigger markers are dev chrome (?markers=1), see OPENBRAIN-31 -->
    <div v-if="showMarkers && transitionId" class="marker-start" />
    <div
      v-if="transitionId && !boxTail"
      :id="'trigger' + transitionId"
      class="animationTrigger animationScrollAnchor block noHighlight section-transition-spacer transition left-0 w-full h-[200vh]"
    ></div>
    <div v-if="showMarkers && transitionId" class="marker-end" />

    <h2
      v-if="!boxBody"
      class="TN border border-black bg-white rounded-full absolute -translate-x-[5.40625rem] -translate-y-[0.5rem] w-28 h-28 flex items-center justify-center"
    >
      {{ label || index + 1 }}
    </h2>
    <!-- Breakout boxes (sections slugged box-*) are lettered, not numbered,
         and announce themselves so they read as asides to the main thread. -->

    <!-- Section title - editable for creators -->
    <EditableBlock
      v-if="isCreator && !boxTail"
      :content="section.title"
      :paragraph-id="`section-title-${section.id}`"
      :is-creator="isCreator"
      tag="h2"
      :class-name="
        store.imgActive
          ? 'opacity-0 T duration-500 z-40 subChapter'
          : 'T duration-500 z-40 subChapter'
      "
      @save="handleSectionTitleSave"
    />
    <!-- In a box the title is the box's title card (BreakoutBox). -->
    <h2
      v-else-if="!boxBody"
      :class="store.imgActive ? 'opacity-0' : ''"
      class="T duration-500 z-40 subChapter"
    >
      {{ section.title }}
    </h2>

    <StartEndIcon v-if="!boxTail" :paragraph="section" art="start" />
    <IllustrationInline
      v-if="!boxTail && inlineFigureFor(section)"
      :animation-id="section.animation.id"
    />
    <!-- The References section, from the references table once it has
         rows: each entry links to its source (OPENBRAIN-92). -->
    <ReferenceList
      v-if="tableReferences.length"
      :references="tableReferences"
    />
    <div
      v-else
      :id="
        section?.animation?.name && !boxTail
          ? 'triggerAnimation' + section?.animation?.name
          : ''
      "
      :class="[
        section?.animation?.name ? 'animationTrigger block noHighlight' : '',
        {
          'section-paragraphs--paired': !rail && pairedExploreIds.size > 0,
          'bx-rail-row': rail,
        },
      ]"
      :data-figure-hold="section?.animation?.hold"
      :data-figure-room="section?.animation?.room"
    >
      <!-- A box read sideways is cut into parts (helper/exploreRail.js),
           each a RailPart that draws the part's figures first; anywhere
           else this is one group of every paragraph, unwrapped. -->
      <component
        :is="group.part ? RailPart : Unwrapped"
        v-for="group in groups"
        :key="group.key"
        v-bind="group.part || undefined"
      >
        <template v-for="paragraph in group.paragraphs" :key="paragraph.id">
          <StartEndIcon :paragraph="paragraph" art="start" />
          <!-- Preserve ordinary paragraph spans: consecutive inline widgets use
             their sibling structure to remove touching margins. Only paired
             Explore cards need block wrappers as grid items. -->
          <component
            :is="!rail && pairedExploreIds.has(paragraph.id) ? 'div' : 'span'"
            :id="
              paragraph?.animation &&
              'triggerAnimation' + paragraph?.animation?.name
            "
            :class="[
              paragraph?.animation?.name
                ? 'animationTrigger block noHighlight'
                : '',
              {
                'explore-pair-item':
                  !rail && pairedExploreIds.has(paragraph.id),
              },
            ]"
            :data-figure-hold="paragraph?.animation?.hold"
            :data-figure-room="paragraph?.animation?.room"
            v-if="
              paragraph?.type != 'breakVideo' &&
              paragraph.type != 'breakSection'
            "
          >
            <!-- An "Explore more" paragraph (content.explore, OPENBRAIN-142)
               folds its text, figure and images behind an ExploreCard;
               every other paragraph renders unwrapped (Unwrapped is a
               fragment), so the markup below is written once. -->
            <component
              :is="paragraph.explore && !rail ? ExploreCard : Unwrapped"
              v-bind="
                paragraph.explore && !rail
                  ? {
                      explore: paragraph.explore,
                      paragraphId: paragraph.id,
                      paired: pairedExploreIds.has(paragraph.id),
                      figureId: inlineFigureFor(paragraph)
                        ? paragraph.animation.id
                        : '',
                    }
                  : undefined
              "
            >
              <!-- A card's figure is the card's to place, so it shows once
                 (ExploreCard, OPENBRAIN-187). -->
              <template v-if="paragraph.explore && !rail" #figure>
                <IllustrationInline
                  v-if="inlineFigureFor(paragraph)"
                  :key="'inline' + paragraph.id"
                  :animation-id="paragraph.animation.id"
                />
              </template>
              <!-- Interactive widget placed in the prose (OPENBRAIN-21).
                 data-timeline-id: the chapter timeline finds widgets and
                 breaks by it (they render no paragraph id; OPENBRAIN-128). -->
              <WidgetBreakout
                v-if="paragraph.type === 'widget'"
                :placement="paragraph.widget"
                :data-timeline-id="paragraph.id"
              />
              <!-- section paragraph - editable for creators -->
              <EditableBlock
                v-else-if="!paragraph.subSection && isCreator"
                :content="paragraph.text"
                :paragraph-id="paragraph.id"
                :is-creator="isCreator"
                tag="p"
                class-name="P"
                @save="handleParagraphSave"
                can-figure
              />
              <div
                v-else-if="!paragraph.subSection"
                :key="paragraph.id"
                :id="paragraph.id"
                :data-paragraph-id="paragraph.id"
                class="P"
                v-html="paragraph.text"
              />
              <SubSection
                v-else
                :key="paragraph"
                :paragraph="paragraph"
                :index="index + 1"
                :is-creator="isCreator"
                @save="handleParagraphSave"
              />
              <InlineImages
                :paragraph="paragraph"
                :key="'images' + paragraph.id"
                v-if="paragraph.img"
              />
              <VideoEmbed v-if="paragraph.video" :video="paragraph.video" />
              <FullScreenIllustration
                :key="paragraph.id"
                v-if="paragraph.animationFull"
                :paragraph="paragraph"
              />
              <!-- In a rail part the figures lead the part (RailPart). -->
              <IllustrationInline
                v-if="!rail && !paragraph.explore && inlineFigureFor(paragraph)"
                :key="'inline' + paragraph.id"
                :animation-id="paragraph.animation.id"
              />
            </component>
          </component>
          <!-- section Break -->
          <BreakImages
            :key="'breakVideo ' + paragraph.id"
            v-else-if="paragraph.type === 'breakVideo'"
            :title="paragraph.title"
            :text="paragraph.text"
            :slug="paragraph.videoSlug || 'placeholder'"
            :data-timeline-id="paragraph.id"
          />
          <BreakSection
            :key="'breakSection' + paragraph.id"
            v-else-if="paragraph.type === 'breakSection'"
            :content="paragraph"
            :data-timeline-id="paragraph.id"
          />
          <StartEndIcon :paragraph="paragraph" art="end" />
          <!-- A breakout box placed right after this paragraph (OPENBRAIN-70) -->
          <div
            v-for="box in boxesAfter(paragraph.id)"
            :key="box.id"
            class="anchored-box"
          >
            <SectionComp
              :section="box"
              :index="0"
              :label="sectionLabels?.[box.id || box.title]"
              :is-creator="isCreator"
            />
          </div>
        </template>
      </component>
    </div>
    <StartEndIcon v-if="!boxTail" :paragraph="section" art="end" />
    <FullScreenIllustration
      :key="section.id"
      v-if="section.animationFull && !boxTail"
      :paragraph="section"
    />
  </component>
</template>

<script setup>
import { computed, inject, defineAsyncComponent, unref } from "vue";
import { explorePairIds } from "@/helper/explorePairs";
import { railLayoutOf } from "@/helper/exploreRail";
// <SectionComp> in the template is this component (an SFC can use itself by
// its file name without importing it): an anchored breakout box renders as a
// nested section.
import { sectionTransitionId } from "@/helper/figureTransitions";
import { markersEnabled } from "@/helper/debugFlags";
import BreakImages from "./BreakImages.vue";

// Scroll-trigger markers render only with ?markers=1 (OPENBRAIN-31).
const showMarkers = markersEnabled();
import FullScreenIllustration from "@/components/chapter/Illus/FullScreenIllustration.vue";
import IllustrationInline from "@/components/chapter/Illus/IllustrationInline.vue";
import { useInlineFigureFor } from "@/composables/useInlineFigures";
import SubSection from "./SubSection.vue";
import { useGeneral } from "@/stores";
import BreakSection from "./BreakSection.vue";
import BreakoutBox from "./BreakoutBox.vue";
import ReferenceList from "./ReferenceList.vue";
import InlineImages from "./InlineImages.vue";
import VideoEmbed from "./VideoEmbed.vue";
import StartEndIcon from "../../UI/StartEndIcon.vue";
// The editor (TipTap, ~400 KB) loads only when a creator edits: readers
// never render it (OPENBRAIN-166).
const EditableBlock = defineAsyncComponent(() => import("./EditableBlock.vue"));
import WidgetBreakout from "./WidgetBreakout.vue";
import ExploreCard from "./ExploreCard.vue";
import RailPart from "./RailPart.vue";

// A paragraph with content.explore renders inside an ExploreCard; the rest
// go through this fragment, so the template keeps one copy of the markup.
const Unwrapped = (_, { slots }) => slots.default?.();

const boxesAfter = inject("boxesAfter", () => []);
const sectionLabels = inject("sectionLabels", null);

const store = useGeneral();

const pairedExploreIds = computed(() => explorePairIds(props.section));

// A box read sideways (OPENBRAIN-163, 187): BreakoutBox provides its mode
// ("track" | "swipe", null when it runs down the page) to the text it
// frames, and this cuts the text into the parts its track shows.
const boxRail = inject("exploreRail", null);
const rail = computed(() => {
  if (!props.boxBody || !unref(boxRail)) return null;
  return railLayoutOf(props.section);
});
const groups = computed(() => {
  const layout = rail.value;
  if (props.boxTail)
    return layout ? [{ key: "tail", paragraphs: layout.tail }] : [];
  if (!layout)
    return [{ key: "all", paragraphs: props.section?.paragraphs || [] }];
  return layout.parts.map((part, index) => {
    const lead = part.paragraphs[0];
    return {
      key: part.id,
      // The tail is not part of the text the track shows.
      paragraphs: part.paragraphs,
      part: {
        part,
        figures: part.figures
          .filter((p) => inlineFigureFor(p))
          .map((p) => p.animation.id),
        image: part.explore ? lead.explore.image || null : null,
        legend: part.explore ? lead.explore.legend || "" : "",
        index,
        count: layout.parts.length,
      },
    };
  });
});

const transitionId = computed(() => sectionTransitionId(props.section));

// Inline below the two-column breakpoint, and inside a floating breakout box
// (it covers the figure pane): OPENBRAIN-91.
// Draw a figure here only where it first appears (below 1024px).
const inlineFigureFor = useInlineFigureFor();

const props = defineProps({
  section: Object,
  index: Number,
  /* Marker text for the round section badge: "1", "2", … for sections,
     "A", "B", … for breakout boxes (TextComp computes both). Falls back to
     index + 1 so older callers keep numbering. */
  label: { type: String, default: "" },
  isCreator: {
    type: Boolean,
    default: false,
  },
  /** Rendering a breakout box's text inside its BreakoutBox frame. */
  boxBody: { type: Boolean, default: false },
  /** With boxBody: only what follows a sideways box's track (its tail). */
  boxTail: { type: Boolean, default: false },
});

defineEmits(["save"]);

// The references table's rows replace the References section's own list
// (OPENBRAIN-92); the section's text stays for creators, who edit it.
const refsCtx = inject("references", null);
const tableReferences = computed(() =>
  props.section?.slug === "references" && !props.isCreator
    ? refsCtx?.references?.value || []
    : []
);

// Get save handler from parent (injected from TextComp)
const saveContent = inject("saveContent", null);

// Saves go straight through the injected saveContent and are returned so
// EditableBlock can show a failure. Nothing is re-emitted upward: the parent
// used to save the same row again (OPENBRAIN-58).
const handleParagraphSave = ({ paragraphId, content }) =>
  saveContent({ paragraphId, content, type: "paragraph" });

const handleSectionTitleSave = ({ content }) =>
  saveContent({
    paragraphId: props.section.id,
    content,
    type: "section-title",
  });
</script>

<style scoped>
@media (min-width: 1024px) {
  .section-paragraphs--paired {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1.5rem;
    align-items: start;
  }
  .section-paragraphs--paired > * {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .section-paragraphs--paired > .explore-pair-item {
    grid-column: auto;
  }
}

/* A breakout box placed inside its section (OPENBRAIN-70 A4); the box
   brings its own spacing (BreakoutBox). */
/* Room between the text and a box, either side (Stuart, 13 Oct): in the
   column the box card has its own margin; full width, it would otherwise
   meet the paragraphs edge to edge. */
.anchored-box {
  margin: 0;
}
@media (min-width: 1024px) {
  .anchored-box {
    margin: 5rem 0;
  }
}
</style>
