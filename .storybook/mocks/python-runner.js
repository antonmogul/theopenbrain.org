/**
 * Deterministic Storybook replacement for the browser Pyodide runner.
 * Interactive stories can exercise their Run flow without downloading a
 * runtime, packages, or assets from a CDN.
 */
export async function initPyodide() {
  return {
    runPythonAsync: async () => "",
    loadPackage: async () => undefined,
    globals: { set: () => undefined },
  };
}

export async function runPython(code = "", testCases = []) {
  void code;

  return {
    output: "Storybook Python preview completed.\n",
    error: null,
    plots: [],
    testResults: testCases.map((test) => ({
      name: test.name,
      passed: true,
      expected: test.expected,
      actual: test.expected,
      error: null,
    })),
    passed: true,
  };
}
