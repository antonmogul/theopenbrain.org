<template>
  <div
    v-if="activeHover"
    ref="img"
    class="hover-picture fixed w-full max-w-[400px] z-[70] bg-black p-4 text-white flex flex-col gap-4"
  >
    <div class="w-full">
      <img
        class="w-full"
        :src="activeHover.src"
        :alt="activeHover.alt || ''"
        @load="positionImage"
      />
    </div>
    <p
      v-if="activeHover.text"
      class="w-full max-w-measure-narrow -mt-[3px] text-small"
    >
      {{ activeHover.text }}
    </p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMouse } from "@vueuse/core";
import { imageUrl } from "@/editor/media.mjs";

const { x, y } = useMouse();
const img = ref(null);
function positionImage() {
  if (!img.value) return;
  const rect = img.value.getBoundingClientRect();
  img.value.style.left =
    Math.max(
      8,
      Math.min(
        x.value - window.scrollX + 16,
        window.innerWidth - rect.width - 8
      )
    ) + "px";
  img.value.style.top =
    Math.max(
      8,
      Math.min(
        y.value - window.scrollY + 16,
        window.innerHeight - rect.height - 8
      )
    ) + "px";
}
watch([x, y, img], positionImage, { flush: "post" });
// { src, text } for the hovered link, or null. A link carries its own
// picture (data-hover-src / data-hover-text, set in the CMS: OPENBRAIN-70 D1);
// older ones name a picture by id (/publicAssets/hoverImges/<id>.jpg, text
// from the block). One delegated listener, so links rendered or edited
// after mount work too.
const activeHover = ref(null);
function hoverFor(el) {
  if (el.dataset.hoverSrc)
    return {
      src: imageUrl(el.dataset.hoverSrc),
      text: el.dataset.hoverText || "",
      alt: el.dataset.hoverAlt || el.textContent || "",
    };
  if (!el.id) return null;
  return {
    src: `/publicAssets/hoverImges/${el.id}.jpg`,
    text: "",
  };
}
function onOver(event) {
  const el = event.target?.closest?.(".hoverImg");
  if (el) activeHover.value = hoverFor(el);
}
function onOut(event) {
  const el = event.target?.closest?.(".hoverImg");
  if (el && !el.contains(event.relatedTarget)) activeHover.value = null;
}
onMounted(() => {
  document.addEventListener("mouseover", onOver);
  document.addEventListener("mouseout", onOut);
  document.addEventListener("focusin", onOver);
  document.addEventListener("focusout", onOut);
  document.addEventListener("click", onOver);
});
onBeforeUnmount(() => {
  document.removeEventListener("mouseover", onOver);
  document.removeEventListener("mouseout", onOut);
  document.removeEventListener("focusin", onOver);
  document.removeEventListener("focusout", onOut);
  document.removeEventListener("click", onOver);
});
</script>

<style scoped>
.hover-picture {
  max-width: min(400px, calc(100vw - 16px));
  max-height: calc(100svh - 16px);
  overflow-y: auto;
  pointer-events: none;
}
</style>
