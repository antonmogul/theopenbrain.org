/*
 * Chapter/Opener/ReactiveCover — the pointer-scrubbed Lottie the opener lays
 * over the still cover (OPENBRAIN-146). The Matisse eyes are the 2023 Retina opener,
 * recycled for History too until Sonia and Maura's graphic arrives. Move the
 * pointer across the canvas: the frame follows x. Storybook serves the file
 * through a staticDirs entry; `Missing` points at a file that isn't there
 * and so renders nothing (the opener keeps its still).
 */
import { ref } from "vue";
import ReactiveCover from "../ReactiveCover.vue";
import { normalizeReactiveCover } from "@/helper/chapterCover";

const EYE = normalizeReactiveCover({
  lottie: "/publicAssets/animations/covers/matisse-eyes.json",
  axis: "x",
  fit: "slice",
});

export default {
  title: "Chapter/Opener/ReactiveCover",
  component: ReactiveCover,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { spec: EYE },
  render: (args) => ({
    components: { ReactiveCover },
    setup() {
      const state = ref("loading");
      return { args, state };
    },
    template: `
      <div style="position:relative;height:100vh;background:#1c1c1c url(/publicAssets/images/00-matisse-bg.jpg) center 20%/cover no-repeat" :data-reactive-cover="state">
        <ReactiveCover v-bind="args" @state="state = $event" />
        <p style="position:absolute;left:1rem;bottom:1rem;margin:0;color:#fff;font:12px/1 monospace">{{ state }}</p>
      </div>`,
  }),
};

/* Sweep the pointer across the stage so the eye lands on a late frame. */
const sweep = async ({ canvasElement }) => {
  const stage = canvasElement.querySelector(".reactive-cover");
  if (!stage) return;
  for (const t of [0.1, 0.5, 0.9]) {
    stage.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: Math.round(window.innerWidth * t),
        clientY: Math.round(window.innerHeight / 2),
      })
    );
    await new Promise((r) => setTimeout(r, 120));
  }
};

export const Eye = { play: sweep };

export const SweepOnly = {
  name: "Idle sweep (no pointer)",
  args: { spec: { ...EYE, idle: 6 } },
};

export const Missing = {
  args: {
    spec: { ...EYE, lottie: "/publicAssets/animations/covers/nope.json" },
  },
};
