import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardMedia } from "@/composables/useDashboardMedia";

describe("useDashboardMedia", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetchMedia loads items and appends media_type filter when set", async () => {
        authedRequest.mockResolvedValue([
            { id: "a1", media_type: "lottie", title: "X" },
        ]);
        const { mediaItems, mediaFilter, fetchMedia } = useDashboardMedia();
        mediaFilter.value = "lottie";
        await fetchMedia();
        expect(authedRequest).toHaveBeenCalledWith(
            "animations?select=*&order=media_type,title&media_type=eq.lottie",
        );
        expect(mediaItems.value).toHaveLength(1);
    });

    it("filteredMedia matches title/animation_key/description by search", () => {
        const { mediaItems, mediaSearch, filteredMedia } = useDashboardMedia();
        mediaItems.value = [
            { id: "1", title: "Retina", animation_key: "anim1" },
            { id: "2", title: "Cortex", animation_key: "anim2" },
        ];
        mediaSearch.value = "retina";
        expect(filteredMedia.value).toHaveLength(1);
        expect(filteredMedia.value[0].id).toBe("1");
    });

    it("mediaByType groups filtered items into known buckets", () => {
        const { mediaItems, mediaByType } = useDashboardMedia();
        mediaItems.value = [
            { id: "1", media_type: "lottie" },
            { id: "2", media_type: "video" },
            { id: "3", media_type: "lottie" },
        ];
        expect(mediaByType.value.lottie).toHaveLength(2);
        expect(mediaByType.value.video).toHaveLength(1);
    });

    it("formatFileSize renders B/KB/MB and Unknown", () => {
        const { formatFileSize } = useDashboardMedia();
        expect(formatFileSize(0)).toBe("Unknown");
        expect(formatFileSize(512)).toBe("512 B");
        expect(formatFileSize(2048)).toBe("2.0 KB");
        expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
    });

    it("deleteMedia DELETEs then refetches and clears selection", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        authedRequest.mockResolvedValue([]);
        const { selectedMedia, deleteMedia } = useDashboardMedia();
        selectedMedia.value = { id: "a1" };
        await deleteMedia("a1");
        expect(authedRequest).toHaveBeenCalledWith("animations?id=eq.a1", {
            method: "DELETE",
        });
        expect(selectedMedia.value).toBe(null);
    });
});
