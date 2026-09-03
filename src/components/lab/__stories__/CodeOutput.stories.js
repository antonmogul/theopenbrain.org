/*
 * Student/Code Labs/CodeOutput — the terminal pane under the editor.
 *
 * Renders whatever the Python runner returned: stdout, an error block, plot
 * images (base64 PNG), or the placeholder before the first run.
 */
import CodeOutput from "../CodeOutput.vue";

/* A 240×120 PNG generated offline: a sine trace on a dark ground. */
const PLOT =
  "iVBORw0KGgoAAAANSUhEUgAAAPAAAAB4CAIAAABD1OhwAAAEPklEQVR42u2dW27bMBREvYwABbpOL6Ib7S7y4cJJHVmmZD5m5p5gvgJH4uEc5uFI4uV6vX58/CIkIxeEJghNCEITgtCEIDRBaEIQmhCEJgShCUFogtCEIDQhCE0IQhOC0AShCUFoQhC6LX9//7kntYk6gEMZDYT+PhGRlf8ErMBYVOjNspP6fgZYgbGc0DtlZ/S9D1iBsZDQL8sO6BvA7oweQkf+gfis1xind0DKCb0PHNZ36pseS0pUFzr1jbyWwWcAtpQYLnQjp2/f7SPPXrEjStQVuu8rrYW2Yzw07HChT8yFad8jXuwL2ItRVOhxr7f7F7fjol1YopbQ58rz6hvAoYtWUeg5X2UHWIExSujTtRn1fXqcALoKPf9rETqpRIT2AKzAGCX0+zD6fccLrVAiQtsA3g6C0DZCixxEXGhZRhFACaF79UTflIjQToAVGEOEFjwUQq8albfQ3edCs+94QBFGhDYDlGUUAZQQWvyACD1/PK5CD5oLtb4tjplRIkL7AQoKrTNv64U2OqyU0CKM40biJ/TQudDp2+7I1iUitCWglNBSs7dYaNODiwgtwih18GVCj+5Doe8KgAiN0Dk/hSYAHj3FSqEDTrF2RS1ftIIlhgu9sO8KgAg9ey6yhV77U0izxGVCh51o1VpauGg1AREaodXPqy705LlY1XfkufRLvMyfjsmSARiwYtWFDj7dEqEpcZnQ82d/yRnj9ZIWOvvbCUKX+qF34Re+jF8AKPHrXQ7+JAcw5o2jqULzpmnGW/vKJf4TusL/aeP/b5dd4gGhi1x4gNAVLo+ZJzSXhnF934SzfwnNxbsABlxiPlVobq+wHoDFTUBfFydxA5z7iqXER6Gzb1HmHuyMFasi9PK5EHyIhN2i1S/xv+uhKzzHKPvhYzyM6lFoHsRmDcjjAicJLTIXao/K9Fq0FiU+3oJV4WnN2Y9YL/7I7Q2hedy8NWDx70ozhJYqW2pDEKNF6wK4cdc3WzYFrNiyJW4LzaZ61oCVvysNF1qw7I4DY19XA6E7biVfYWPqeEAvxqdCs9O6NWDZEscKLVt2F8Z4ocUBNx17+my7N2Es5uL9vlmxaowIHQv45iBNAYcIbTEXNfuOL3HvcbqnkeKFdgEsWGJ/oW9fld03gGqA99G+eOD5CTCjuXgH0LTv+BI7C+1V9rkBewGeLtEO8DbmJqHb8ezm4uiY7VZstRJf77HSPh2OZVcAPOSoe4ndhPYtuwJjnRKbdsFq4YwX2hqwZfz3FxQS+hmqe9kvEdzLfokQAHijaN2n8Bnw989nCL3P6AtYpMQDG28+YP+MddkAZjB2E9p9IoowxgMe2xq5stAZgDuMGXSH9/rOLrsC4CZjDNqZzeuDm67DmAp4RmhCEJoQhCYEoQlCMxEEoQlBaEIQmhCEJghNCEITgtCEIDQhCE0QmhCEJkRFaD74iPn4BKLxg3OzlZawAAAAAElFTkSuQmCC";

export default {
  title: "Student/Code Labs/CodeOutput",
  component: CodeOutput,
  tags: ["autodocs"],
  argTypes: {
    result: {
      control: "object",
      description:
        "{ output, error, plots[] } from the Python runner; null before the first run.",
    },
    loading: { control: "boolean" },
  },
  args: {
    result: { output: "Vm: -70 mV\nNeuron is at rest", error: "", plots: [] },
    loading: false,
  },
  render: (args) => ({
    components: { CodeOutput },
    setup: () => ({ args }),
    template: `<div style="max-width:900px;"><CodeOutput v-bind="args" /></div>`,
  }),
};

/** Clean stdout. */
export const Default = {};

/** A traceback and nothing else. */
export const WithError = {
  args: {
    result: {
      output: "",
      error: 'NameError: name "threshold" is not defined',
      plots: [],
    },
  },
};

/** stdout printed before the failure: both blocks render, error first. */
export const OutputThenError = {
  args: {
    result: {
      output: "Integrating 0–100 ms…",
      error: "ZeroDivisionError: division by zero",
      plots: [],
    },
  },
};

/** Spinner while Pyodide runs. */
export const Loading = { args: { loading: true } };

/** Before the first run. */
export const Empty = { args: { result: null } };

/** Ran fine but printed nothing. */
export const NoOutput = {
  args: { result: { output: "", error: "", plots: [] } },
};

/** A matplotlib figure captured as base64 PNG. */
export const WithPlot = {
  args: { result: { output: "Plotted 1 figure", error: "", plots: [PLOT] } },
};
