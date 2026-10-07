<template>
  <div
    :class="store.superScriptActive ? 'translate-y-0' : 'translate-y-[100vh]'"
    class="fixed max-h-[95vh] z-40 bottom-0 w-full left-0 p-24 pb-16 pt-10 bg-white border-t border-black duration-300 font-mono text-medium"
  >
    <button
      @click="toggle()"
      class="fixed z-50 -top-5 left-text -ml-5 cursor-pointer rotate-45"
    >
      <PlusIcon class="icon cursor-pointer" />
    </button>
    <ol class="pr-16 w-full bg-white overflow-x-scroll h-full">
      <li
        v-for="(note, index) in text['footNotes'].notes"
        :key="note.number"
        v-show="activeSup.includes((index + 1).toString())"
        class="flex gap-4 pb-4 justify-start"
      >
        <p class="w-16 text-left">{{ index + 1 }}</p>
        <p class="max-w-measure" v-html="note.text" />
      </li>
    </ol>
  </div>
</template>

<script setup>
import { useText, useGeneral } from "@/stores";
import { onMounted, watch, ref, onBeforeUnmount } from "vue";
import PlusIcon from "@/icons/custom/PlusIcon.vue";
const textStore = useText();
const text = textStore.text;
const store = useGeneral();

const activeSup = ref([]);

const toggle = (event) => {
  if (!store.superScriptActive) {
    // Only the Retina's legacy footnote markers (<sup data-sup>) open this
    // sheet. Citation superscripts (<sup class="citation-ref">) have their
    // own tooltip; they used to throw here and break it (OPENBRAIN-90).
    const sup = event?.target?.closest?.("sup[data-sup]");
    if (!sup) return;
    activeSup.value = sup.dataset.sup.split(" ");
    store.superScriptActive = true;
  } else {
    activeSup.value = [];
    store.superScriptActive = false;
  }
};

// One listener for the page, not one per <sup> at mount: the chapter's text
// arrives after this mounts, so the old per-sup listeners never attached
// and the Retina's footnotes didn't open (OPENBRAIN-90).
const onDocumentClick = (event) => {
  if (event.target?.closest?.("sup[data-sup]")) toggle(event);
};
// Capture phase: the reader's text handlers stop some clicks from bubbling.
onMounted(() => document.addEventListener("click", onDocumentClick, true));
onBeforeUnmount(() =>
  document.removeEventListener("click", onDocumentClick, true)
);
</script>

<style scoped></style>
