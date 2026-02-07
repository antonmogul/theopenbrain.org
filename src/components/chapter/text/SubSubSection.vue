<template>
  <div
    :id="subParagraph.animation ? 'trigger' + subParagraph.animation?.id : ''"
    :class="subParagraph.animation ? 'animationTrigger' : ''"
  >
    <StartEndIcon :paragraph="subParagraph" art="start" />
    <template
      v-for="subSubSection in subParagraph.subSubSection"
      :key="subSubSection.title"
    >
      <StartEndIcon :paragraph="subSubSection" art="start" />
      <div
        class="subSub test"
        :id="
          subSubSection.animation ? 'trigger' + subSubSection.animation?.id : ''
        "
        :class="subSubSection.animation ? 'animationTrigger' : ''"
      >
        <template
          v-if="
            !subSubSection.paragraphs &&
            subSubSection.type != 'breakVideo' &&
            subSubSection.type != 'breakSection'
          "
        >
          <!-- Inline editing for sub-sub-section text -->
          <EditableBlock
            v-if="isCreator"
            :content="subSubSection.text"
            :paragraph-id="subSubSection.id"
            :is-creator="isCreator"
            tag="p"
            class-name="subSubP pt-0"
            @save="handleSave"
          />
          <p
            v-else
            :id="subSubSection.id"
            :data-paragraph-id="subSubSection.id"
            class="subSubP pt-0"
            v-html="subSubSection.text"
          />
        </template>
        <template v-else>
          <template
            v-for="subSubParagraph in subSubSection.paragraphs"
            :key="subSubParagraph.id"
          >
            <StartEndIcon :paragraph="subSubParagraph" art="start" />
            <div
              :id="
                subSubParagraph.animation
                  ? 'trigger' + subSubParagraph.animation?.id
                  : ''
              "
              :class="subSubParagraph.animation ? 'animationTrigger' : ''"
            >
              <!-- Inline editing for sub-sub-paragraph text -->
              <EditableBlock
                v-if="
                  isCreator &&
                  subSubParagraph.type != 'breakVideo' &&
                  subSubSection.type != 'breakSection'
                "
                :content="subSubParagraph.text"
                :paragraph-id="subSubParagraph.id"
                :is-creator="isCreator"
                tag="p"
                class-name="subSubParP"
                @save="handleSave"
              />
              <p
                v-else-if="
                  subSubParagraph.type != 'breakVideo' &&
                  subSubSection.type != 'breakSection'
                "
                :id="subSubParagraph.id"
                :data-paragraph-id="subSubParagraph.id"
                :key="subSubParagraph.title"
                class="subSubParP"
                v-html="subSubParagraph.text"
              />
              <BreakImages
                v-else-if="subSubSection?.type === 'breakVideo'"
                :key="subSubParagraph.text"
                :title="subSubParagraph.title"
                :text="subSubParagraph.text"
                :slug="subSubParagraph.videoSlug || 'placeholder'"
              />
              <BreakSection
                v-else-if="subSubParagraph?.type === 'breakSection'"
                :key="subSubParagraph"
                :content="subSubParagraph"
              />
              <InlineImages
                :paragraph="subSubParagraph"
                v-if="subSubParagraph.img"
              />
              <FullScreenIllustration
                :key="subSubParagraph.id"
                v-if="subSubParagraph.animationFull"
                :paragraph="subSubParagraph"
              />
            </div>
            <StartEndIcon :paragraph="subSubParagraph" art="end" />
          </template>
        </template>
        <InlineImages :paragraph="subSubSection" v-if="subSubSection.img" />
        <BreakImages
          v-if="subSubSection.type === 'breakVideo'"
          :title="subSubSection.title"
          :text="subSubSection.text"
          :slug="subSubSection.videoSlug || 'placeholder'"
        />
        <BreakSection
          v-if="subSubSection.type === 'breakSection'"
          :content="subSubSection"
        />
        <FullScreenIllustration
          :key="subSubSection.id"
          v-if="subSubSection.animationFull"
          :paragraph="subSubSection"
        />
      </div>
      <StartEndIcon :paragraph="subSubSection" art="end" />
    </template>
    <StartEndIcon :paragraph="subParagraph" art="end" />
  </div>
</template>

<script setup>
import { inject } from "vue";
import StartEndIcon from "../../UI/StartEndIcon.vue";
import FullScreenIllustration from "../Illus/FullScreenIllustration.vue";
import BreakImages from "./BreakImages.vue";
import BreakSection from "./BreakSection.vue";
import BreakText from "./BreakText.vue";
import InlineImages from "./InlineImages.vue";
import EditableBlock from "./EditableBlock.vue";

const props = defineProps({
  subParagraph: Object,
  chapterIndex: Number,
  subIndex: Number,
  isCreator: {
    type: Boolean,
    default: false,
  },
});

// Inject save handler from parent
const saveContent = inject("saveContent", null);

// Handle save from editable block
const handleSave = async ({ paragraphId, content }) => {
  if (saveContent) {
    await saveContent({
      paragraphId,
      content,
      type: "subSubParagraph",
    });
  }
};
</script>

<style lang="scss" scoped></style>
