import { ref } from "vue";
import CodeEditor from "../CodeEditor.vue";
import CodeOutput from "../CodeOutput.vue";
import TestResults from "../TestResults.vue";

export default {
  title: "Student/Code Labs",
  decorators: [
    () => ({
      template: '<div style="max-width:900px;padding:24px"><story /></div>',
    }),
  ],
};

export const Editor = {
  render: () => ({
    components: { CodeEditor },
    setup() {
      return {
        code: ref(
          'membrane_voltage = -70\nprint(f"Vm: {membrane_voltage} mV")'
        ),
      };
    },
    template:
      '<CodeEditor v-model="code" language="python" min-height="260px" />',
  }),
};

export const SuccessfulOutput = {
  render: () => ({
    components: { CodeOutput },
    data: () => ({
      result: { output: "Vm: -70 mV\nNeuron is at rest", error: "", plots: [] },
    }),
    template: '<CodeOutput :result="result" />',
  }),
};

export const MixedTestResults = {
  render: () => ({
    components: { TestResults },
    data: () => ({
      results: [
        { name: "resting potential is negative", passed: true },
        {
          name: "spike threshold is crossed",
          passed: false,
          message: "Expected -55 mV",
        },
      ],
    }),
    template: '<TestResults :results="results" :passed="false" />',
  }),
};
