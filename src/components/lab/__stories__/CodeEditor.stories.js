/*
 * Student/Code Labs/CodeEditor — the textarea editor used by labs and the
 * Python playground.
 *
 * `modelValue` is a v-model, so the render keeps a local copy that follows
 * the control and feeds edits back through `update:modelValue`.
 */
import { ref, watch } from "vue";
import { fn } from "storybook/test";
import CodeEditor from "../CodeEditor.vue";

const PYTHON = 'membrane_voltage = -70\nprint(f"Vm: {membrane_voltage} mV")';
const LONG_FILE = [
  "import numpy as np",
  "",
  "dt = 0.1",
  "tau = 10.0",
  "v_rest = -70.0",
  "v_threshold = -55.0",
  "v = v_rest",
  "spikes = []",
  "",
  ...Array.from(
    { length: 30 },
    (_, i) => `# step ${i + 1}: integrate the leaky membrane equation`
  ),
  "",
  "for t in np.arange(0, 100, dt):",
  "    v += dt * (-(v - v_rest) + 20.0) / tau",
  "    if v >= v_threshold:",
  "        spikes.append(t)",
  "        v = v_rest",
  "",
  'print(f"{len(spikes)} spikes")',
].join("\n");

export default {
  title: "Student/Code Labs/CodeEditor",
  component: CodeEditor,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: "text", description: "The code (v-model)." },
    language: {
      control: "select",
      options: ["python", "javascript", "typescript"],
    },
    readonly: { control: "boolean" },
    minHeight: {
      control: "text",
      description: "CSS length for the editor body.",
    },
    "onUpdate:modelValue": { description: "v-model update." },
  },
  args: {
    modelValue: PYTHON,
    language: "python",
    readonly: false,
    minHeight: "260px",
    "onUpdate:modelValue": fn(),
  },
  render: (args) => ({
    components: { CodeEditor },
    setup() {
      const code = ref(args.modelValue);
      watch(
        () => args.modelValue,
        (next) => {
          code.value = next;
        }
      );
      const onUpdate = (next) => {
        code.value = next;
        args["onUpdate:modelValue"]?.(next);
      };
      return { args, code, onUpdate };
    },
    template: `
      <div style="max-width:900px;">
        <CodeEditor
          :model-value="code"
          :language="args.language"
          :readonly="args.readonly"
          :min-height="args.minHeight"
          @update:model-value="onUpdate"
        />
      </div>`,
  }),
};

export const Default = {};

/** Starter code shown but locked, as in a graded lab after submission. */
export const ReadOnly = { args: { readonly: true } };

export const JavaScript = {
  args: {
    language: "javascript",
    modelValue: "const vm = -70;\nconsole.log(`Vm: ${vm} mV`);",
  },
};

/** Forty-odd lines: the gutter grows and the body scrolls. */
export const LongFile = { args: { modelValue: LONG_FILE, minHeight: "320px" } };

/** A short editor for inline snippets. */
export const Compact = { args: { minHeight: "120px" } };
