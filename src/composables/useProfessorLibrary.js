import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Content Library" section: the published module catalog,
 * lazy per-module section expansion, module multi-selection, and adding selected
 * modules to a course.
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated.
 *
 * `addModulesToCourse` refreshes the courses list after attaching modules (so the
 * per-course module counts update). That list lives in useProfessorCourses, so a
 * `refetchCourses` callback is passed in rather than reaching across composables.
 *
 * @param {() => Promise<void>} refetchCourses - re-fetches the professor's
 *   courses after modules are added (defaults to a no-op for standalone use)
 */
export function useProfessorLibrary(refetchCourses = () => Promise.resolve()) {
    // ---- state ----
    const modules = ref([]);
    const modulesLoading = ref(false);
    const modulesError = ref(null);
    const selectedModules = ref([]);
    const expandedModuleId = ref(null);
    const moduleSections = ref([]);

    // ---- fetch ----
    async function fetchModules() {
        modulesLoading.value = true;
        modulesError.value = null;

        try {
            const data = await supabaseRest(
                "modules?status=eq.published&select=id,title,slug,description,order_index&order=order_index.asc"
            );
            modules.value = data;
        } catch (err) {
            console.error("Error fetching modules:", err);
            modulesError.value = err.message;
        } finally {
            modulesLoading.value = false;
        }
    }

    async function fetchModuleSections(moduleId) {
        try {
            const sections = await supabaseRest(
                `sections?module_id=eq.${moduleId}&select=id,title,slug,order_index&order=order_index.asc`
            );
            moduleSections.value = sections;
        } catch (err) {
            console.error("Error fetching sections:", err);
        }
    }

    // ---- selection ----
    function toggleModuleExpand(moduleId) {
        if (expandedModuleId.value === moduleId) {
            expandedModuleId.value = null;
            moduleSections.value = [];
        } else {
            expandedModuleId.value = moduleId;
            fetchModuleSections(moduleId);
        }
    }

    function toggleModuleSelection(moduleId) {
        const index = selectedModules.value.indexOf(moduleId);
        if (index === -1) {
            selectedModules.value.push(moduleId);
        } else {
            selectedModules.value.splice(index, 1);
        }
    }

    async function addModulesToCourse(courseId) {
        if (selectedModules.value.length === 0) {
            alert("Please select at least one module");
            return;
        }

        try {
            // Get existing course modules to determine order
            const existing = await supabaseRest(
                `course_modules?course_id=eq.${courseId}&select=order_index&order=order_index.desc&limit=1`
            );
            let nextOrder = existing.length > 0 ? existing[0].order_index + 1 : 0;

            for (const moduleId of selectedModules.value) {
                await supabaseRest("course_modules", {
                    method: "POST",
                    body: JSON.stringify({
                        course_id: courseId,
                        module_id: moduleId,
                        order_index: nextOrder++,
                        is_required: true,
                    }),
                });
            }

            selectedModules.value = [];
            await refetchCourses();
            alert("Modules added to course successfully!");
        } catch (err) {
            console.error("Error adding modules:", err);
            alert("Failed to add modules: " + err.message);
        }
    }

    return {
        // state
        modules,
        modulesLoading,
        modulesError,
        selectedModules,
        expandedModuleId,
        moduleSections,
        // fetch
        fetchModules,
        fetchModuleSections,
        // selection
        toggleModuleExpand,
        toggleModuleSelection,
        addModulesToCourse,
    };
}
