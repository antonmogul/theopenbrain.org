import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardUsers } from "@/composables/useDashboardUsers";

describe("useDashboardUsers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetchUsers populates users, count, and role breakdown", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint.startsWith("profiles?select=*")) {
                return Promise.resolve([{ id: "u1", role: "student" }]);
            }
            if (endpoint === "profiles?select=id") {
                return Promise.resolve([{ id: "u1" }, { id: "u2" }]);
            }
            if (endpoint === "profiles?select=role") {
                return Promise.resolve([
                    { role: "creator" },
                    { role: "student" },
                    { role: "student" },
                ]);
            }
            return Promise.resolve([]);
        });
        const { users, usersTotalCount, userRoleBreakdown, fetchUsers } =
            useDashboardUsers();
        await fetchUsers();
        expect(users.value).toHaveLength(1);
        expect(usersTotalCount.value).toBe(2);
        expect(userRoleBreakdown.value).toEqual({
            creators: 1,
            professors: 0,
            students: 2,
        });
    });

    it("usersTotalPages computes from count / perPage", () => {
        const { usersTotalCount, usersTotalPages } = useDashboardUsers();
        usersTotalCount.value = 45; // perPage 20
        expect(usersTotalPages.value).toBe(3);
    });

    it("nextUsersPage advances only within bounds", () => {
        authedRequest.mockResolvedValue([]);
        const { usersPage, usersTotalCount, nextUsersPage } = useDashboardUsers();
        usersTotalCount.value = 60; // 3 pages
        nextUsersPage();
        expect(usersPage.value).toBe(2);
    });

    it("prevUsersPage does not go below page 1", () => {
        const { usersPage, prevUsersPage } = useDashboardUsers();
        expect(usersPage.value).toBe(1);
        prevUsersPage();
        expect(usersPage.value).toBe(1);
    });

    it("updateUserRole PATCHes role then refetches", async () => {
        authedRequest.mockResolvedValue([]);
        const { selectedUser, updateUserRole } = useDashboardUsers();
        selectedUser.value = { id: "u1", role: "student" };
        await updateUserRole("u1", "professor");
        expect(authedRequest).toHaveBeenCalledWith("profiles?id=eq.u1", {
            method: "PATCH",
            body: JSON.stringify({ role: "professor" }),
        });
        expect(selectedUser.value.role).toBe("professor");
    });
});
