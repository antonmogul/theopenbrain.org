import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useVersions } from "@/composables/useVersions";

describe("useVersions", () => {
    let profile;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "creator-1" });
    });

    it("fetchVersions loads versions and attaches module counts", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "content_versions?select=*&order=created_at.desc") {
                return Promise.resolve([{ id: "v1", version_number: "1.0" }]);
            }
            if (endpoint === "modules?content_version_id=eq.v1&select=id") {
                return Promise.resolve([{ id: "m1" }, { id: "m2" }]);
            }
            return Promise.resolve([]);
        });

        const { versions, versionsLoading, fetchVersions } = useVersions(profile);
        expect(versionsLoading.value).toBe(false);

        await fetchVersions();

        expect(versions.value).toHaveLength(1);
        expect(versions.value[0].moduleCount).toBe(2);
        expect(versionsLoading.value).toBe(false);
    });

    it("fetchVersions sets versionsError on failure and resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { versionsError, versionsLoading, fetchVersions } =
            useVersions(profile);

        await fetchVersions();

        expect(versionsError.value).toBe("boom");
        expect(versionsLoading.value).toBe(false);
    });

    it("createVersion posts created_by from profile, resets form, refetches", async () => {
        authedRequest.mockResolvedValue([]);
        const { newVersionForm, showNewVersionModal, createVersion } =
            useVersions(profile);
        newVersionForm.value.version_number = "2.0";
        newVersionForm.value.release_notes = "notes";

        await createVersion();

        // The POST carries created_by from the passed-in profile ref.
        const postCall = authedRequest.mock.calls.find(
            (c) => c[0] === "content_versions",
        );
        expect(postCall, "POST to content_versions").toBeTruthy();
        const body = JSON.parse(postCall[1].body);
        expect(body.created_by).toBe("creator-1");
        expect(body.status).toBe("draft");
        // On success: modal closes, form resets.
        expect(showNewVersionModal.value).toBe(false);
        expect(newVersionForm.value.version_number).toBe("");
    });

    it("createVersion is a no-op when version_number is empty", async () => {
        const { createVersion } = useVersions(profile);
        await createVersion();
        expect(authedRequest).not.toHaveBeenCalled();
    });

    it("updateVersionStatus PATCHes published_at when publishing", async () => {
        authedRequest.mockResolvedValue([]);
        const { updateVersionStatus } = useVersions(profile);

        await updateVersionStatus("v1", "published");

        const patchCall = authedRequest.mock.calls.find(
            (c) => c[0] === "content_versions?id=eq.v1",
        );
        expect(patchCall[1].method).toBe("PATCH");
        const body = JSON.parse(patchCall[1].body);
        expect(body.status).toBe("published");
        expect(body.published_at).toBeTruthy();
    });
});
