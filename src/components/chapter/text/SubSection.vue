<template>
  <!-- subSection -->
  <div
    v-for="(subSections, subIndex) in paragraph.subSection"
    :key="subSections.id"
    :id="subSections.id"
    class="sub"
  >
    <StartEndIcon :paragraph="subSections" art="start" />
    <span
      :id="
        subSections?.animation?.name &&
        'triggerAnimation' + subSections?.animation?.name
      "
      :class="
        subSections?.animation?.name ? 'animationTrigger block noHighlight' : ''
      "
    >
      <!-- subSection title -->
      <span :id="subSections?.title ? toSlug(subSections?.title) : ''" />

      <!-- SubSection title - editable for creators -->
      <EditableBlock
        v-if="isCreator"
        :content="subSections.title"
        :paragraph-id="`subsection-title-${subSections.id}`"
        :is-creator="isCreator"
        tag="h3"
        :class-name="subSections.animationAnchor ? 'subT pt-[100vh] animationScrollAnchor' : 'subT'"
        @save="({ content }) => handleSave({ paragraphId: subSections.id, content, type: 'subsection-title' })"
      />
      <h3
        v-else
        :id="
          subSections.animationAnchor ? 'anchor' + subSections.animation.id : ''
        "
        class="subT"
        :class="
          subSections.animationAnchor ? 'pt-[100vh] animationScrollAnchor' : ''
        "
      >
        {{ subSections.title }}
      </h3>

      <!-- subSection paragraph -->
      <template
        v-for="subParagraph in subSections.paragraphs"
        :key="subParagraph.id"
      >
        <StartEndIcon :paragraph="subParagraph" art="start" />
        <span
          :id="
            subParagraph?.animation?.name &&
            'triggerAnimation' + subParagraph?.animation?.name
          "
          :class="
            subParagraph?.animation?.name
              ? 'animationTrigger block noHighlight'
              : ''
          "
        >
          <template
            v-if="
              subParagraph?.type != 'breakVideo' &&
              subParagraph?.type != 'breakSection'
            "
          >
            <div
              v-if="subParagraph?.animation?.transition"
              class="marker-start"
            />
            <div
              v-if="subParagraph?.animation?.transition"
              :id="
                subParagraph?.animation &&
                'triggerAnimation' +
                  subParagraph?.animation?.name +
                  'Transition'
              "
              :class="
                subParagraph?.animation?.name + 'Transition'
                  ? 'animationTrigger animationScrollAnchor block noHighlight'
                  : ''
              "
              class="transition left-0 w-full h-[50vh] bg-green-"
            />

            <!-- SubSection paragraph - editable for creators -->
            <EditableBlock
              v-if="!subParagraph.subSubSection && !subParagraph.type && isCreator"
              :content="subParagraph.text"
              :paragraph-id="subParagraph.id"
              :is-creator="isCreator"
              tag="p"
              class-name="subP"
              @save="handleSave"
            />
            <div
              v-else-if="!subParagraph.subSubSection && !subParagraph.type"
              :id="subParagraph.id"
              :data-paragraph-id="subParagraph.id"
              :key="subParagraph.id"
              class="subP"
              v-html="subParagraph.text"
            />
            <SubSubSection
              v-else-if="subParagraph.subSubSection && !subParagraph.type"
              :key="subParagraph.title"
              :chapter-index="index"
              :sub-index="subIndex"
              :sub-paragraph="subParagraph"
              :is-creator="isCreator"
              @save="handleSave"
            />
            <InlineImages
              :paragraph="subParagraph"
              :key="'images' + subParagraph.id"
              v-if="subParagraph.img"
            />
            <FullScreenIllustration
              :key="subParagraph.animationFull"
              v-if="subParagraph.animationFull"
              :paragraph="subParagraph"
            />
          </template>
          <StartEndIcon :paragraph="subParagraph" art="end" />
          <!-- subSection Break -->
          <BreakImages
            v-if="subParagraph?.type === 'breakVideo'"
            :key="subParagraph.id"
            :title="subParagraph.title"
            :text="subParagraph.text"
            :slug="subParagraph.videoSlug || 'placeholder'"
          />
          <BreakSection
            v-else-if="subParagraph.type === 'breakSection'"
            :key="subParagraph.title"
            :content="subParagraph"
          />
        </span>
        <StartEndIcon :paragraph="subParagraph" art="end" />
        <FullScreenIllustration
          :key="subSections.animationFull"
          v-if="subSections.animationFull"
          :paragraph="subSections"
        />
      </template>
    </span>
    <StartEndIcon :paragraph="subSections" art="end" />
  </div>
</template>

<script setup>
import { inject } from "vue";
import SubSubSection from "./SubSubSection.vue";
import BreakImages from "./BreakImages.vue";
import BreakSection from "./BreakSection.vue";
import EditableBlock from "./EditableBlock.vue";

import { toSlug } from "@/helper/general.js";
import InlineImages from "./InlineImages.vue";
import FullScreenIllustration from "../Illus/FullScreenIllustration.vue";
import StartEndIcon from "../../UI/StartEndIcon.vue";

const props = defineProps({
  paragraph: Object,
  index: Number,
  isCreator: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["save"]);

// Get save handler from parent
const saveContent = inject("saveContent", null);

const handleSave = async ({ paragraphId, content, type = "paragraph" }) => {
  console.log("SubSection: Saving", paragraphId, type);
  if (saveContent) {
    await saveContent({ paragraphId, content, type });
  }
  emit("save", { paragraphId, content, type });
};
</script>

<style scoped></style>
