import { ref, computed } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Creator-dashboard "Users" section: profiles data, paging, filter + role CRUD.
 *
 * Extracted verbatim from DashboardView.vue (#10 — dashboard section
 * composables). Behavior unchanged; only relocated.
 *
 * Cross-section note: `userRoleBreakdown` is *written* here (by fetchUsers) but
 * also *read* by the Analytics section (maxRoleCount bar-chart scaling) and the
 * Users + Analytics stat templates. Ownership follows the writer — it lives
 * here, and the view passes it to the analytics computed. This makes the
 * users→analytics read-dependency explicit ahead of the #11 component split.
 */
export function useDashboardUsers() {
    // ---- state ----
    const users = ref([]);
    const usersLoading = ref(false);
    const usersError = ref(null);
    const usersFilter = ref("all"); // all, creator, professor, student
    const usersSearch = ref("");
    const usersPage = ref(1);
    const usersPerPage = 20;
    const usersTotalCount = ref(0);
    const selectedUser = ref(null);
    // Produced here, consumed by the Analytics section (see note above).
    const userRoleBreakdown = ref({ creators: 0, professors: 0, students: 0 });

    // ---- fetch ----
    async function fetchUsers() {
        usersLoading.value = true;
        usersError.value = null;

        try {
            let endpoint = `profiles?select=*&order=created_at.desc&limit=${usersPerPage}&offset=${(usersPage.value - 1) * usersPerPage}`;

            if (usersFilter.value !== "all") {
                endpoint += `&role=eq.${usersFilter.value}`;
            }

            if (usersSearch.value) {
                endpoint += `&or=(full_name.ilike.*${usersSearch.value}*,email.ilike.*${usersSearch.value}*)`;
            }

            const data = await supabaseRest(endpoint);
            users.value = data;

            // Get total count
            let countEndpoint = "profiles?select=id";
            if (usersFilter.value !== "all") {
                countEndpoint += `&role=eq.${usersFilter.value}`;
            }
            const countData = await supabaseRest(countEndpoint);
            usersTotalCount.value = countData.length;

            // Get role breakdown
            const allProfiles = await supabaseRest("profiles?select=role");
            userRoleBreakdown.value = {
                creators: allProfiles.filter((p) => p.role === "creator").length,
                professors: allProfiles.filter((p) => p.role === "professor")
                    .length,
                students: allProfiles.filter((p) => p.role === "student").length,
            };
        } catch (err) {
            console.error("Error fetching users:", err);
            usersError.value = err.message;
        } finally {
            usersLoading.value = false;
        }
    }

    // ---- derived ----
    const usersTotalPages = computed(() => {
        return Math.ceil(usersTotalCount.value / usersPerPage);
    });

    // ---- paging + actions ----
    function nextUsersPage() {
        if (usersPage.value < usersTotalPages.value) {
            usersPage.value++;
            fetchUsers();
        }
    }

    function prevUsersPage() {
        if (usersPage.value > 1) {
            usersPage.value--;
            fetchUsers();
        }
    }

    function selectUser(user) {
        selectedUser.value = user;
    }

    async function updateUserRole(userId, newRole) {
        try {
            await supabaseRest(`profiles?id=eq.${userId}`, {
                method: "PATCH",
                body: JSON.stringify({ role: newRole }),
            });
            await fetchUsers();
            if (selectedUser.value?.id === userId) {
                selectedUser.value.role = newRole;
            }
        } catch (err) {
            console.error("Error updating user role:", err);
            alert("Failed to update user role: " + err.message);
        }
    }

    return {
        // state
        users,
        usersLoading,
        usersError,
        usersFilter,
        usersSearch,
        usersPage,
        usersPerPage,
        usersTotalCount,
        selectedUser,
        userRoleBreakdown,
        // derived
        usersTotalPages,
        // actions
        fetchUsers,
        nextUsersPage,
        prevUsersPage,
        selectUser,
        updateUserRole,
    };
}
