import { describe, it, expect } from "vitest";
import { mountSection } from "@/test/mountSection";
import UsersSection from "@/components/dashboard/sections/UsersSection.vue";

describe("UsersSection (render smoke)", () => {
    const base = {
        users: [],
        usersLoading: false,
        usersError: null,
        usersFilter: "all",
        usersFilterOptions: [{ value: "all", label: "All" }],
        usersSearch: "",
        usersPage: 1,
        usersTotalPages: 1,
        usersTotalCount: 0,
        userRoleBreakdown: { creators: 1, professors: 2, students: 3 },
        roleSelectOptions: [{ value: "student", label: "Student" }],
        selectedUser: null,
    };

    it("renders role breakdown stat values", () => {
        const w = mountSection(UsersSection, base);
        expect(w.exists()).toBe(true);
        expect(w.text()).toContain("Creators");
        expect(w.text()).toContain("Professors");
    });

    it("emits filter when a role stat is clicked", async () => {
        const w = mountSection(UsersSection, base);
        // first .stat-click is Creators
        const stat = w.find(".stat-click");
        await stat.trigger("click");
        expect(w.emitted("filter")[0]).toEqual(["creator"]);
    });

    it("renders a user row per user", () => {
        const w = mountSection(UsersSection, {
            ...base,
            users: [{ id: "u1", full_name: "Ada", email: "ada@x.com", role: "student" }],
        });
        expect(w.text()).toContain("Ada");
        expect(w.text()).toContain("ada@x.com");
    });
});
