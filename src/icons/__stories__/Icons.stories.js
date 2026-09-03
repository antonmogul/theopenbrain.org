import BiCheckCircle from "../BiCheckCircle.vue";
import BiUpload from "../BiUpload.vue";
import MaterialSymbolsPlayArrow from "../MaterialSymbolsPlayArrow.vue";
import MaterialSymbolsRepeat from "../MaterialSymbolsRepeat.vue";
import TeenyiconsEyeClosedOutline from "../TeenyiconsEyeClosedOutline.vue";
import TeenyiconsEyeOutline from "../TeenyiconsEyeOutline.vue";
import Brain from "../custom/Brain.vue";
import CloseArrowIcon from "../custom/CloseArrowIcon.vue";
import CloseIcon from "../custom/CloseIcon.vue";
import ClosedEye from "../custom/ClosedEye.vue";
import DownArrow from "../custom/DownArrow.vue";
import FIcon from "../custom/FIcon.vue";
import FileIcon from "../custom/FileIcon.vue";
import FileIconHover from "../custom/FileIconHover.vue";
import FilesIcon from "../custom/FilesIcon.vue";
import FilesIconHover from "../custom/FilesIconHover.vue";
import FlipIcon from "../custom/FlipIcon.vue";
import IIcon from "../custom/IIcon.vue";
import LegendIcion1 from "../custom/LegendIcion1.vue";
import LegendIcion2 from "../custom/LegendIcion2.vue";
import NextIcon from "../custom/NextIcon.vue";
import OpenArrowIcon from "../custom/OpenArrowIcon.vue";
import OpenEye from "../custom/OpenEye.vue";
import PauseIcon from "../custom/PauseIcon.vue";
import PlayIcon from "../custom/PlayIcon.vue";
import PlusIcon from "../custom/PlusIcon.vue";
import ReplayIcon from "../custom/ReplayIcon.vue";
import Speed1Icon from "../custom/Speed1Icon.vue";
import Speed2Icon from "../custom/Speed2Icon.vue";
import UserIcon from "../custom/UserIcon.vue";

const icons = [
  ["BiCheckCircle", BiCheckCircle],
  ["BiUpload", BiUpload],
  ["MaterialSymbolsPlayArrow", MaterialSymbolsPlayArrow],
  ["MaterialSymbolsRepeat", MaterialSymbolsRepeat],
  ["TeenyiconsEyeClosedOutline", TeenyiconsEyeClosedOutline],
  ["TeenyiconsEyeOutline", TeenyiconsEyeOutline],
  ["Brain", Brain],
  ["CloseArrowIcon", CloseArrowIcon],
  ["CloseIcon", CloseIcon],
  ["ClosedEye", ClosedEye],
  ["DownArrow", DownArrow],
  ["FIcon", FIcon],
  ["FileIcon", FileIcon],
  ["FileIconHover", FileIconHover],
  ["FilesIcon", FilesIcon],
  ["FilesIconHover", FilesIconHover],
  ["FlipIcon", FlipIcon],
  ["IIcon", IIcon],
  ["LegendIcion1", LegendIcion1],
  ["LegendIcion2", LegendIcion2],
  ["NextIcon", NextIcon],
  ["OpenArrowIcon", OpenArrowIcon],
  ["OpenEye", OpenEye],
  ["PauseIcon", PauseIcon],
  ["PlayIcon", PlayIcon],
  ["PlusIcon", PlusIcon],
  ["ReplayIcon", ReplayIcon],
  ["Speed1Icon", Speed1Icon],
  ["Speed2Icon", Speed2Icon],
  ["UserIcon", UserIcon],
].map(([name, component]) => ({ name, component }));

export default {
  title: "Foundations/Icons/Complete Gallery",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The complete legacy and current icon set. Grouped coverage keeps near-identical SVG primitives comparable in one visual regression surface.",
      },
    },
  },
};

export const AllIcons = {
  render: () => ({
    components: Object.fromEntries(
      icons.map(({ name, component }) => [name, component])
    ),
    setup: () => ({ icons }),
    template: `
      <main class="min-h-screen bg-bg p-8 text-ink">
        <header class="mb-8 max-w-2xl">
          <p class="font-mono text-xs uppercase tracking-[0.18em] text-mute">Foundations / icons</p>
          <h1 class="mt-2 text-3xl font-semibold">Complete icon gallery</h1>
          <p class="mt-3 text-sm text-mute">{{ icons.length }} SVG components, shown on the same 56px optical canvas.</p>
        </header>
        <section class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-8">
          <article
            v-for="icon in icons"
            :key="icon.name"
            class="flex min-h-32 flex-col items-center justify-between rounded-lg border border-line bg-paper p-4"
          >
            <div class="flex h-14 w-14 items-center justify-center text-ink [&_svg]:max-h-12 [&_svg]:max-w-12">
              <component :is="icon.component" />
            </div>
            <code class="mt-4 break-all text-center text-[11px] text-mute">{{ icon.name }}</code>
          </article>
        </section>
      </main>
    `,
  }),
};

export const OnDarkField = {
  render: () => ({
    components: Object.fromEntries(
      icons.map(({ name, component }) => [name, component])
    ),
    setup: () => ({ icons }),
    template: `
      <main class="min-h-screen bg-ink p-8 text-paper">
        <section class="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-10">
          <div v-for="icon in icons" :key="icon.name" class="flex h-20 items-center justify-center [&_svg]:max-h-10 [&_svg]:max-w-10">
            <component :is="icon.component" />
          </div>
        </section>
      </main>
    `,
  }),
};
