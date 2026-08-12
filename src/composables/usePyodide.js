import { ref } from "vue";

const PYODIDE_VERSION = "0.26.4";
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;
const SCRIPT_SRC = `${CDN_BASE}/pyodide.js`;

// Module-level singleton — every component shares one Pyodide instance.
let instancePromise = null;

/**
 * Inject the Pyodide script tag into <head> once. Resolves when the script
 * has loaded and `window.loadPyodide` is available.
 */
function ensureScript() {
  if (window.loadPyodide) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // Guard against a second call while the first script is still loading.
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const check = setInterval(() => {
        if (window.loadPyodide) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      return;
    }

    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = resolve;
    el.onerror = () => reject(new Error("Failed to load Pyodide script"));
    document.head.appendChild(el);
  });
}

/**
 * Load (or return the cached) Pyodide instance.
 */
function getInstance() {
  if (!instancePromise) {
    instancePromise = ensureScript().then(() =>
      window.loadPyodide({ indexURL: `${CDN_BASE}/` })
    );
  }
  return instancePromise;
}

/**
 * Clean a Pyodide traceback so widgets show only the user-relevant portion.
 * Strips internal frames and keeps from the last `File "<exec>"` onward.
 */
function cleanTraceback(e) {
  const lines = String(e.message || e)
    .replace(/\s+$/, "")
    .split("\n");
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].indexOf('File "<exec>"') !== -1) {
      start = i;
      break;
    }
  }
  const shown = start >= 0 ? lines.slice(start) : lines.slice(-3);
  shown[0] = shown[0]
    .replace(/^\s*File "<exec>", /, "")
    .replace(/, in <module>$/, "");
  return shown.join("\n");
}

/**
 * Shared Vue 3 composable for running Python in the browser via Pyodide.
 *
 * Pyodide (~10 MB WASM) is downloaded lazily on the first `runPython()` call,
 * then cached at module level so every component shares one interpreter.
 *
 * @returns {{ status: import('vue').Ref<string>, error: import('vue').Ref<string|null>, runPython: (code: string) => Promise<any>, reset: () => void }}
 */
export function usePyodide() {
  const status = ref("idle");
  const error = ref(null);

  /**
   * Run a string of Python code and return the result.
   * Triggers a lazy Pyodide download on first invocation.
   */
  async function runPython(code) {
    error.value = null;

    try {
      if (!instancePromise) {
        status.value = "loading";
        await getInstance();
        status.value = "ready";
      } else {
        // Instance may still be loading from another component's call.
        if (status.value === "idle") status.value = "loading";
        await instancePromise;
        if (status.value === "loading") status.value = "ready";
      }

      status.value = "running";
      const pyodide = await instancePromise;
      const result = pyodide.runPython(code);
      status.value = "ready";
      return result;
    } catch (e) {
      error.value = cleanTraceback(e);
      status.value = "error";
      return undefined;
    }
  }

  /**
   * Destroy the current Pyodide instance and force a fresh reload on
   * the next `runPython()` call.
   */
  function reset() {
    instancePromise = null;
    error.value = null;
    status.value = "idle";
  }

  return { status, error, runPython, reset };
}
