/**
 * Code Labs Composable - Manages Python code lab state and execution
 * Phase 7: Interactive Python Code Labs
 */

import { ref, computed } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useCodeLabs() {
  const labs = ref([]);
  const currentLab = ref(null);
  const userCode = ref("");
  const executionResult = ref(null);
  const loading = ref(false);
  const executing = ref(false);
  const error = ref(null);
  const submissions = ref([]);

  const { user, session } = useAuth();

  // Helper for Supabase REST API calls
  async function supabaseRest(endpoint, options = {}) {
    const accessToken = session.value?.access_token;
    if (!accessToken && options.method !== "GET") {
      throw new Error("No access token available");
    }

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...restOptions,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken || supabaseKey}`,
        "Content-Type": "application/json",
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return options.method === "POST" ? [] : { success: true };
    return JSON.parse(text);
  }

  /**
   * Fetch all labs for a module
   */
  async function fetchLabs(moduleId) {
    if (!moduleId) {
      labs.value = [];
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      const data = await supabaseRest(
        `code_labs?module_id=eq.${moduleId}&select=*&order=order_index.asc`
      );

      labs.value = data || [];
    } catch (e) {
      console.error("useCodeLabs: Error fetching labs:", e);
      error.value = e.message;
      labs.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load a specific lab by ID
   */
  async function loadLab(labId) {
    if (!labId) {
      currentLab.value = null;
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      const data = await supabaseRest(`code_labs?id=eq.${labId}&select=*`);

      if (!data || data.length === 0) {
        throw new Error("Lab not found");
      }

      currentLab.value = data[0];
      userCode.value = currentLab.value.starter_code || "";
      executionResult.value = null;

      // Load latest submission if user is logged in
      if (user.value) {
        await loadLatestSubmission(labId);
      }
    } catch (e) {
      console.error("useCodeLabs: Error loading lab:", e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load the user's most recent submission for a lab
   */
  async function loadLatestSubmission(labId) {
    if (!user.value || !labId) return;

    try {
      const data = await supabaseRest(
        `code_submissions?lab_id=eq.${labId}&user_id=eq.${user.value.id}&select=*&order=created_at.desc&limit=1`
      );

      if (data && data.length > 0) {
        // Restore user's saved code
        userCode.value = data[0].code;
      }
    } catch (e) {
      console.error("useCodeLabs: Error loading latest submission:", e);
      // Don't set error - this is a non-critical failure
    }
  }

  /**
   * Execute the current user code
   */
  async function executeCode() {
    if (!currentLab.value || !userCode.value.trim()) {
      return;
    }

    try {
      executing.value = true;
      error.value = null;

      // Dynamic import to avoid loading Pyodide until needed
      const { runPython } = await import("@/services/pythonRunner");

      const testCases = currentLab.value.test_cases || [];
      const result = await runPython(userCode.value, testCases);

      executionResult.value = result;

      // Save submission if user is logged in
      if (user.value) {
        await saveSubmission(result);
      }
    } catch (e) {
      console.error("useCodeLabs: Error executing code:", e);
      executionResult.value = {
        output: "",
        error: e.message,
        plots: [],
        testResults: [],
        passed: false,
      };
    } finally {
      executing.value = false;
    }
  }

  /**
   * Save a code submission to the database
   */
  async function saveSubmission(result) {
    if (!user.value || !currentLab.value) return;

    try {
      const score = calculateScore(result.testResults);

      const submissionData = await supabaseRest("code_submissions", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          lab_id: currentLab.value.id,
          user_id: user.value.id,
          code: userCode.value,
          output: result.output || null,
          error_message: result.error || null,
          test_results: result.testResults || [],
          passed: result.passed,
          score: score,
        }),
      });

      const newSubmission = Array.isArray(submissionData)
        ? submissionData[0]
        : submissionData;

      submissions.value.unshift(newSubmission);
    } catch (e) {
      console.error("useCodeLabs: Error saving submission:", e);
      // Don't set error - this is a non-critical failure
    }
  }

  /**
   * Calculate score based on test results
   */
  function calculateScore(testResults) {
    if (!testResults || testResults.length === 0) {
      return 100; // No tests = full score
    }

    const passedCount = testResults.filter((t) => t.passed).length;
    return Math.round((passedCount / testResults.length) * 100);
  }

  /**
   * Fetch submission history for a lab
   */
  async function fetchSubmissions(labId) {
    if (!user.value || !labId) {
      submissions.value = [];
      return;
    }

    try {
      const data = await supabaseRest(
        `code_submissions?lab_id=eq.${labId}&user_id=eq.${user.value.id}&select=*&order=created_at.desc&limit=10`
      );

      submissions.value = data || [];
    } catch (e) {
      console.error("useCodeLabs: Error fetching submissions:", e);
      submissions.value = [];
    }
  }

  /**
   * Reset code to starter code
   */
  async function resetCode() {
    if (!currentLab.value) return;

    userCode.value = currentLab.value.starter_code || "";
    executionResult.value = null;

    // Reset Pyodide environment
    try {
      const { resetPyodide } = await import("@/services/pythonRunner");
      await resetPyodide();
    } catch (e) {
      console.error("useCodeLabs: Error resetting Pyodide:", e);
    }
  }

  /**
   * Get the solution code if allowed
   */
  function showSolution() {
    if (!currentLab.value) return null;
    if (currentLab.value.show_solution) {
      return currentLab.value.solution_code;
    }
    return null;
  }

  // Computed properties
  const hasTestCases = computed(
    () => currentLab.value?.test_cases?.length > 0
  );

  const passedAllTests = computed(
    () => executionResult.value?.passed === true
  );

  const bestScore = computed(() => {
    if (!submissions.value || submissions.value.length === 0) {
      return null;
    }
    return Math.max(...submissions.value.map((s) => s.score || 0));
  });

  return {
    // State
    labs,
    currentLab,
    userCode,
    executionResult,
    loading,
    executing,
    error,
    submissions,

    // Computed
    hasTestCases,
    passedAllTests,
    bestScore,

    // Methods
    fetchLabs,
    loadLab,
    loadLatestSubmission,
    executeCode,
    saveSubmission,
    fetchSubmissions,
    resetCode,
    showSolution,
    calculateScore,
  };
}
