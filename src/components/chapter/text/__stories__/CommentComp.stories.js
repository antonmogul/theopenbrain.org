/*
 * Chapter/Text/CommentComp — the legacy full-screen note overlay. It has no
 * props: it reads the active highlight id and note from the comments Pinia
 * store and quotes the marked text back from the DOM (#highlight-<id>), so
 * the story seeds both and exposes them as story-only controls.
 */
import { onMounted, ref } from "vue";
import { useCom } from "@/stores/comments";
import CommentComp from "../CommentComp.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/CommentComp",
  component: CommentComp,
  parameters: { layout: "fullscreen" },
  args: {
    highlightText: "Rods support dim-light vision",
    comment: "Review dark adaptation.",
  },
  argTypes: {
    highlightText: {
      control: "text",
      description:
        "Story-only: the <mark> the overlay quotes back (read from the DOM by id).",
    },
    comment: {
      control: "text",
      description:
        "Story-only: the note already stored for the active highlight. Empty shows the dismiss (+) icon instead of the check.",
    },
  },
  render: chapterFrame(CommentComp, {
    setup(args) {
      const comments = useCom();
      const ready = ref(false);
      comments.$patch({
        activeCom: "photoreceptors-1",
        comments: { "photoreceptors-1": args.comment },
      });
      onMounted(() => {
        ready.value = true;
      });
      return { ready };
    },
    template: `<div style="min-height:620px;"><mark id="highlight-photoreceptors-1" style="position:absolute;left:-9999px;">{{ args.highlightText }}</mark><StoryComponent v-if="ready" /></div>`,
  }),
};

export const Default = {};

/** Nothing written yet — the empty textarea and the dismiss icon. */
export const EmptyNote = { args: { comment: "" } };
