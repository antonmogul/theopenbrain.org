/*
 * Chapter/ReaderShell/TimelineScrubber — the chapter timeline on a phone
 * (OPENBRAIN-137), drawn from the real Retina (timelineFixture.js). Drag the
 * waveform under the playhead; hold still to see the preview card; let go to
 * jump (the story records it in Actions and moves the reading position).
 * On a real phone a tap on the dock opens this sheet.
 */
import { ref } from "vue";
import { fn } from "storybook/test";
import TimelineScrubber from "../TimelineScrubber.vue";
import {
  RETINA_TITLE,
  positionAt,
  retinaLayers,
  retinaModel,
} from "./timelineFixture";

const model = retinaModel();

export default {
  title: "Chapter/ReaderShell/TimelineScrubber",
  component: TimelineScrubber,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
    docs: { story: { inline: false, height: "640px" } },
  },
  globals: { chapter: "perc" },
  args: { progress: 42, signedIn: true, onJump: fn(), onClose: fn() },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 100 } },
    signedIn: { control: "boolean" },
  },
  render: (args) => ({
    components: { TimelineScrubber },
    setup() {
      const position = ref(positionAt(model, args.progress));
      const layers = args.signedIn ? retinaLayers(model) : null;
      const onJump = (i, how) => {
        args.onJump(i, how);
        position.value = i;
      };
      return { args, model, position, layers, onJump, title: RETINA_TITLE };
    },
    template: `<div style="max-width:390px;height:640px;position:relative;margin:0 auto;transform:translateZ(0);overflow:hidden">
      <TimelineScrubber :model="model" :position="position" :layers="layers"
        :chapter-title="title" @jump="onJump" @close="args.onClose" />
    </div>`,
  }),
};

export const Phone = {};
export const AtTheStart = { args: { progress: 0, signedIn: false } };
