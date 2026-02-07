/**
 * Python Runner Service - Executes Python code in the browser using Pyodide
 * Phase 7: Interactive Python Code Labs
 */

let pyodideInstance = null;
let loadingPromise = null;

/**
 * Initialize Pyodide with required packages for neuroscience labs
 * Uses singleton pattern to avoid multiple loads
 */
export async function initPyodide() {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const { loadPyodide } = await import("pyodide");

    pyodideInstance = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
    });

    // Pre-load packages commonly used in neuroscience labs
    await pyodideInstance.loadPackage(["numpy", "matplotlib"]);

    // Set up matplotlib for non-interactive backend and create helper function
    await pyodideInstance.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64

def get_plot_base64():
    """Save current figure to base64 encoded PNG string"""
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    return img_base64
`);

    return pyodideInstance;
  })();

  return loadingPromise;
}

/**
 * Run Python code and optionally execute test cases
 * @param {string} code - The Python code to execute
 * @param {Array} testCases - Optional array of test cases to run
 * @returns {Object} Results object with output, error, plots, testResults, passed
 */
export async function runPython(code, testCases = []) {
  const pyodide = await initPyodide();

  const results = {
    output: "",
    error: null,
    plots: [],
    testResults: [],
    passed: false,
  };

  try {
    // Redirect stdout/stderr to capture print output
    await pyodide.runPythonAsync(`
import sys
from io import StringIO

_original_stdout = sys.stdout
_original_stderr = sys.stderr
sys.stdout = _captured_stdout = StringIO()
sys.stderr = _captured_stderr = StringIO()
`);

    // Run user code
    await pyodide.runPythonAsync(code);

    // Get captured output
    results.output = await pyodide.runPythonAsync(`
_captured_stdout.getvalue() + _captured_stderr.getvalue()
`);

    // Check for matplotlib figures and capture them
    const hasFigures = await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
len(plt.get_fignums()) > 0
`);

    if (hasFigures) {
      const plotBase64 = await pyodide.runPythonAsync(`
get_plot_base64()
`);
      results.plots.push(plotBase64);

      // Close figures to clean up
      await pyodide.runPythonAsync(`plt.close('all')`);
    }

    // Run test cases if provided
    if (testCases && testCases.length > 0) {
      results.testResults = await runTestCases(pyodide, testCases);
      results.passed = results.testResults.every((test) => test.passed);
    } else {
      results.passed = true;
    }
  } catch (err) {
    results.error = err.message;
    results.passed = false;
  } finally {
    // Reset stdout/stderr to originals
    try {
      await pyodide.runPythonAsync(`
sys.stdout = _original_stdout
sys.stderr = _original_stderr
`);
    } catch {
      // Ignore cleanup errors
    }
  }

  return results;
}

/**
 * Run test cases against the current Python environment
 * @param {Object} pyodide - The Pyodide instance
 * @param {Array} testCases - Array of test case objects
 * @returns {Array} Array of test result objects
 */
async function runTestCases(pyodide, testCases) {
  const results = [];

  for (const testCase of testCases) {
    const testResult = {
      name: testCase.name,
      passed: false,
      expected: testCase.expected,
      actual: null,
      error: null,
    };

    try {
      // Run the test code which should set __test_result__
      await pyodide.runPythonAsync(testCase.code);

      // Get the test result from globals
      const actual = await pyodide.runPythonAsync(`__test_result__`);
      testResult.actual = actual;

      // Compare to expected value
      testResult.passed = actual === testCase.expected;
    } catch (err) {
      testResult.error = err.message;
      testResult.passed = false;
    }

    results.push(testResult);
  }

  return results;
}

/**
 * Reset the Pyodide environment by clearing user-defined globals
 */
export async function resetPyodide() {
  if (!pyodideInstance) {
    return;
  }

  try {
    await pyodideInstance.runPythonAsync(`
import sys
# Get list of user-defined globals to delete
_to_delete = [name for name in list(globals().keys())
              if not name.startswith('_')
              and name not in ['sys', 'io', 'base64', 'matplotlib', 'plt', 'np', 'numpy', 'get_plot_base64', 'StringIO']]
for name in _to_delete:
    del globals()[name]

# Close any open figures
import matplotlib.pyplot as plt
plt.close('all')
`);
  } catch {
    // Ignore reset errors
  }
}

/**
 * Get loading status for UI feedback
 */
export function isLoading() {
  return loadingPromise !== null && pyodideInstance === null;
}
