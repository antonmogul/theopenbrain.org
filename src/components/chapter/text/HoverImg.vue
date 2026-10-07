<template>
  <div
    v-if="activeHover"
    ref="img"
    class="fixed w-full max-w-[400px] z-[70] bg-black p-4 text-white flex flex-col gap-4"
  >
    <div class="w-full">
      <img class="w-full" :src="activeHover.src" alt="" />
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
import infos from "@/assets/json_backend/infosImages.json";
import { imageUrl } from "@/editor/media.mjs";

const { x, y } = useMouse();
const img = ref(null);
watch(x, (x, prevX) => {
  if (!img.value) return;
  const hImg = img.value.getBoundingClientRect().height;
  const offsetX = window.innerWidth / 2 >= 400 ? 400 : window.innerWidth / 2;
  const offsetY =
    y.value - window.scrollY + hImg <= window.innerHeight
      ? 0
      : y.value - window.scrollY + hImg - window.innerHeight + 20;
  img.value.style.top = y.value - window.scrollY - offsetY + "px";
  img.value.style.left = x - offsetX + "px";
});
// { src, text } for the hovered link, or null. A link carries its own
// picture (data-hover-src / data-hover-text, set in the CMS: OPENBRAIN-70 D1);
// older ones name a picture by id (/publicAssets/hoverImges/<id>.jpg, text
// from infosImages.json). One delegated listener, so links rendered or edited
// after mount work too.
const activeHover = ref(null);
function hoverFor(el) {
  if (el.dataset.hoverSrc)
    return {
      src: imageUrl(el.dataset.hoverSrc),
      text: el.dataset.hoverText || "",
    };
  if (!el.id) return null;
  return {
    src: `/publicAssets/hoverImges/${el.id}.jpg`,
    text: infos.images.find((x) => x.title === el.id)?.text || "",
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
});
onBeforeUnmount(() => {
  document.removeEventListener("mouseover", onOver);
  document.removeEventListener("mouseout", onOut);
});
</script>

<style lang="scss" scoped></style>
