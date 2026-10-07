<template>
  <!-- A breakout box goes full screen (OPENBRAIN-91): BreakoutBox is the
       frame, and this component renders the box's text into it. -->
  <BreakoutBox
    v-if="section.kind === 'box' && !boxBody"
    :section="section"
    :label="label"
  >
    <SectionComp
      :section="section"
      :index="index"
      :label="label"
      :is-creator="isCreator"
      box-body
    />
  </BreakoutBox>
  <!-- section (a div in a box: the reader gives every <section> a full
       screen's height, which left short boxes mostly empty) -->
  <component
    :is="boxBody ? 'div' : 'section'"
    v-else
    :id="boxBody ? undefined : section.id"
    class="overflow-y-visible"
  >
    <!-- section titel -->
    <!-- Trigger markers are dev chrome (?markers=1), see OPENBRAIN-31 -->
    <div
      v-if="showMarkers && section['paragraphs'][0]?.animation?.transition"
      class="marker-start"
    />
    <div
      v-if="section['paragraphs'][0]?.animation?.transition"
      :id="
        section['paragraphs'][0]?.animation &&
        'triggerAnimation' +
          section['paragraphs'][0]?.animation?.name +
          'Transition'
      "
      :class="
        section['paragraphs'][0]?.animation?.name + 'Transition'
          ? 'animationTrigger animationScrollAnchor block noHighlight'
          : ''
      "
      class="section-transition-spacer transition left-0 w-full h-[200vh]"
    ></div>
    <div
      v-if="showMarkers && section['paragraphs'][0]?.animation?.transition"
      class="marker-end"
    />

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
      v-if="isCreator"
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

    <StartEndIcon :paragraph="section" art="start" />
    <IllustrationInline
      v-if="inlineFigureFor(section)"
      :animation-id="section.animation.id"
    />
    <!-- The References section, from the references table once it has
         rows: each entry links to its source (OPENBRAIN-92). -->
    <ReferenceList
      v-if="tableReferences.length"
      :references="tableReferences"
    />
    <span
      v-else
      :id="
        section?.animation?.name
          ? 'triggerAnimation' + section?.animation?.name
          : ''
      "
      :class="
        section?.animation?.name ? 'animationTrigger block noHighlight' : ''
      "
    >
      <template v-for="paragraph in section['paragraphs']" :key="paragraph.id">
        <StartEndIcon :paragraph="paragraph" art="start" />
        <span
          :id="
            paragraph?.animation &&
            'triggerAnimation' + paragraph?.animation?.name
          "
          :class="
            paragraph?.animation?.name
              ? 'animationTrigger block noHighlight'
              : ''
          "
          v-if="
            paragraph?.type != 'breakVideo' && paragraph.type != 'breakSection'
          "
        >
          <!-- Interactive widget placed in the prose (OPENBRAIN-21) -->
          <WidgetBreakout
            v-if="paragraph.type === 'widget'"
            :placement="paragraph.widget"
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
          <IllustrationInline
            v-if="inlineFigureFor(paragraph)"
            :key="'inline' + paragraph.id"
            :animation-id="paragraph.animation.id"
          />
        </span>
        <!-- section Break -->
        <BreakImages
          :key="'breakVideo ' + paragraph.id"
          v-else-if="paragraph.type === 'breakVideo'"
          :title="paragraph.title"
          :text="paragraph.text"
          :slug="paragraph.videoSlug || 'placeholder'"
        />
        <BreakSection
          :key="'breakSection' + paragraph.id"
          v-else-if="paragraph.type === 'breakSection'"
          :content="paragraph"
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
    </span>
    <StartEndIcon :paragraph="section" art="end" />
    <FullScreenIllustration
      :key="section.id"
      v-if="section.animationFull"
      :paragraph="section"
    />
  </component>
</template>

<script setup>
import { computed, inject } from "vue";
// <SectionComp> in the template is this component (an SFC can use itself by
// its file name without importing it): an anchored breakout box renders as a
// nested section.
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
import EditableBlock from "./EditableBlock.vue";
import WidgetBreakout from "./WidgetBreakout.vue";

const boxesAfter = inject("boxesAfter", () => []);
const sectionLabels = inject("sectionLabels", null);

const store = useGeneral();

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
/* A breakout box placed inside its section (OPENBRAIN-70 A4); the box
   brings its own spacing (BreakoutBox). */
.anchored-box {
  margin: 0;
}
</style>
