import { ref, computed, nextTick } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { withAsyncState } from "@/composables/withAsyncState";

/**
 * Creator-dashboard "Media" library section: animations/media data + CRUD.
 *
 * Extracted verbatim from DashboardView.vue (#10 — dashboard section
 * composables). Behavior unchanged; only relocated.
 *
 * Scope note: this owns only the media *library* (browse/filter/select/delete).
 * The media *picker* (attach/detach media to a content block) stays in the view
 * because it is glue between the chapters section (expandedChapterId,
 * fetchChapterContent) and this library — it will move with the chapters
 * section component in the #11 split. The view passes this composable's
 * `fetchMedia`/`mediaItems` to the picker.
 */
export function useDashboardMedia() {
    // ---- state ----
    const mediaItems = ref([]);
    const mediaLoading = ref(false);
    const mediaError = ref(null);
    const mediaFilter = ref("all"); // all, lottie, video, image, youtube
    const mediaSearch = ref("");
    const selectedMedia = ref(null);
    const showMediaUploadModal = ref(false);

    // ---- fetch ----
    async function fetchMedia() {
        await withAsyncState(
            { loading: mediaLoading, error: mediaError },
            "Error fetching media:",
            async () => {
                let endpoint = "animations?select=*&order=media_type,title";

                if (mediaFilter.value !== "all") {
                    endpoint += `&media_type=eq.${mediaFilter.value}`;
                }

                const data = await supabaseRest(endpoint);
                mediaItems.value = data;
            },
        );
    }

    // ---- derived ----
    const filteredMedia = computed(() => {
        if (!mediaSearch.value) return mediaItems.value;
        const search = mediaSearch.value.toLowerCase();
        return mediaItems.value.filter(
            (item) =>
                item.title?.toLowerCase().includes(search) ||
                item.animation_key?.toLowerCase().includes(search) ||
                item.description?.toLowerCase().includes(search),
        );
    });

    const mediaByType = computed(() => {
        const groups = {
            lottie: [],
            video: [],
            image: [],
            youtube: [],
            gsap: [],
            css: [],
        };

        filteredMedia.value.forEach((item) => {
            const type = item.media_type || "other";
            if (groups[type]) {
                groups[type].push(item);
            }
        });

        return groups;
    });

    // ---- actions ----
    async function selectMedia(item) {
        selectedMedia.value = item;

        // Load Lottie preview for lottie items
        if (item.media_type === 'lottie' && item.lottie_file_url) {
            await nextTick();
            const container = document.getElementById('lottie-preview-' + item.id);
            if (container) {
                container.innerHTML = '';
                try {
                    const lottieModule = await import('lottie-web');
                    const lottie = lottieModule.default;
                    lottie.loadAnimation({
                        container,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        path: item.lottie_file_url,
                    });
                } catch (err) {
                    console.error('Failed to load lottie preview:', err);
                    container.innerHTML = '<p style="color: rgb(var(--color-mute)); text-align: center; padding: 2rem;">Failed to load animation</p>';
                }
            }
        }
    }

    async function deleteMedia(mediaId) {
        if (!confirm("Are you sure you want to delete this media asset?")) return;

        try {
            await supabaseRest(`animations?id=eq.${mediaId}`, {
                method: "DELETE",
            });
            selectedMedia.value = null;
            await fetchMedia();
        } catch (err) {
            console.error("Error deleting media:", err);
            alert("Failed to delete media: " + err.message);
        }
    }

    function formatFileSize(bytes) {
        if (!bytes) return "Unknown";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    return {
        // state
        mediaItems,
        mediaLoading,
        mediaError,
        mediaFilter,
        mediaSearch,
        selectedMedia,
        showMediaUploadModal,
        // derived
        filteredMedia,
        mediaByType,
        // actions
        fetchMedia,
        selectMedia,
        deleteMedia,
        formatFileSize,
    };
}
