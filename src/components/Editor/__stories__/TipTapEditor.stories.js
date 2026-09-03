import TipTapEditor from "../TipTapEditor.vue";

export default {
  title: "Dashboard/Editor/TipTapEditor",
  component: TipTapEditor,
  parameters: { layout: "padded" },
};

export const RichChapterContent = {
  args: {
    modelValue: `<h2>Retinal circuits</h2><p>Photoreceptors convert light into changes in membrane potential. <strong>Bipolar cells</strong> relay that signal into the inner retina.</p><blockquote><p>Vision begins before the signal reaches the brain.</p></blockquote><ul><li>Rods support dim-light vision</li><li>Cones support colour and acuity</li></ul>`,
    placeholder: "Write a chapter section…",
    editable: true,
  },
};

export const ReadOnly = {
  args: { ...RichChapterContent.args, editable: false },
};
export const Empty = {
  args: {
    modelValue: "",
    placeholder: "Begin with the central idea for this section…",
  },
};
