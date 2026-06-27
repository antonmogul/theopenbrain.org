import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { withAsyncState } from "@/composables/withAsyncState";

/**
 * Creator-dashboard "Versions" section: content_versions data + CRUD.
 *
 * Extracted verbatim from DashboardView.vue (#10 — dashboard section
 * composables). Behavior is unchanged; only relocated. The `profile` ref is
 * passed in so the composable stays self-contained and the single source of
 * auth truth (useAuth) is not re-derived here.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useVersions(profile) {
    // ---- state ----
    const versions = ref([]);
    const versionsLoading = ref(false);
    const versionsError = ref(null);
    const showNewVersionModal = ref(false);
    const newVersionForm = ref({
        version_number: "",
        release_notes: "",
    });
    const editingVersion = ref(null);

    // ---- fetch ----
    async function fetchVersions() {
        await withAsyncState(
            { loading: versionsLoading, error: versionsError },
            "Error fetching versions:",
            async () => {
                const data = await supabaseRest(
                    "content_versions?select=*&order=created_at.desc",
                );

                // Get module counts for each version
                const versionsWithCounts = await Promise.all(
                    data.map(async (version) => {
                        const modules = await supabaseRest(
                            `modules?content_version_id=eq.${version.id}&select=id`,
                        );
                        return {
                            ...version,
                            moduleCount: modules.length,
                        };
                    }),
                );

                versions.value = versionsWithCounts;
            },
        );
    }

    // ---- CRUD ----
    async function createVersion() {
        if (!newVersionForm.value.version_number) return;

        try {
            await supabaseRest("content_versions", {
                method: "POST",
                body: JSON.stringify({
                    version_number: newVersionForm.value.version_number,
                    release_notes: newVersionForm.value.release_notes,
                    status: "draft",
                    created_by: profile.value?.id,
                }),
            });

            showNewVersionModal.value = false;
            newVersionForm.value = { version_number: "", release_notes: "" };
            await fetchVersions();
        } catch (err) {
            console.error("Error creating version:", err);
            alert("Failed to create version: " + err.message);
        }
    }

    async function updateVersionStatus(versionId, status) {
        try {
            const updates = { status };
            if (status === "published") {
                updates.published_at = new Date().toISOString();
            }

            await supabaseRest(`content_versions?id=eq.${versionId}`, {
                method: "PATCH",
                body: JSON.stringify(updates),
            });

            await fetchVersions();
        } catch (err) {
            console.error("Error updating version:", err);
            alert("Failed to update version: " + err.message);
        }
    }

    async function deleteVersion(versionId) {
        if (!confirm("Are you sure you want to delete this version?")) return;

        try {
            await supabaseRest(`content_versions?id=eq.${versionId}`, {
                method: "DELETE",
            });
            await fetchVersions();
        } catch (err) {
            console.error("Error deleting version:", err);
            alert("Failed to delete version: " + err.message);
        }
    }

    return {
        // state
        versions,
        versionsLoading,
        versionsError,
        showNewVersionModal,
        newVersionForm,
        editingVersion,
        // actions
        fetchVersions,
        createVersion,
        updateVersionStatus,
        deleteVersion,
    };
}
