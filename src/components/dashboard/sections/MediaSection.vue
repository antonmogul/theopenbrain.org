<script setup>
import { ref } from "vue";
import ImageUpload from "@/components/chapterEditor/ImageUpload.vue";
import { imageUrl } from "@/editor/media.mjs";
// Creator-dashboard "Media" library section (#11 split). Presentational: the
// parent owns the useDashboardMedia instance. The media *picker* modal stays in
// the view (it bridges to the chapters section and is opened from
// ChapterBlockEditor), so it is intentionally NOT here.
import {
  SectionHeader,
  BaseCard,
  EmptyState,
  LoadingState,
  ErrorState,
  BaseModal,
  Button,
  SearchInput,
  FilterChips,
} from "@/components/dashboard/shared";

defineProps({
  mediaFilter: { type: String, default: "all" },
  mediaFilterOptions: { type: Array, default: () => [] },
  mediaLoading: { type: Boolean, default: false },
  mediaError: { type: [String, null], default: null },
  filteredMedia: { type: Array, default: () => [] },
  mediaByType: { type: Object, default: () => ({}) },
  formatFileSize: { type: Function, required: true },
  // { places: [{ chapter, where }], states, variants, inUse } | { error } | null
  mediaUsage: { type: [Object, null], default: null },
});

const mediaSearch = defineModel("mediaSearch", { type: String, default: "" });
const selectedMedia = defineModel("selectedMedia", {
  type: [Object, null],
  default: null,
});

const emit = defineEmits(["fetch", "filter", "select", "delete", "uploaded"]);

// Upload an image straight into the library (OPENBRAIN-63).
const showUpload = ref(false);
function onUploaded(e) {
  showUpload.value = false;
  emit("uploaded", e.media);
}
</script>

<template>
  <section class="section">
    <SectionHeader eyebrow="04 · Media" title="Images & assets">
      <template #actions>
        <Button variant="solid" size="sm" @click="showUpload = true"
          >Upload image</Button
        >
      </template>
    </SectionHeader>

    <BaseModal
      :model-value="showUpload"
      title="Upload an image"
      size="md"
      @update:model-value="(v) => (showUpload = v)"
      @close="showUpload = false"
    >
      <ImageUpload
        slug="library"
        :with-caption="false"
        action-label="Upload"
        @uploaded="onUploaded"
      />
    </BaseModal>

    <div class="filters-bar">
      <FilterChips
        :options="mediaFilterOptions"
        :model-value="mediaFilter"
        @update:model-value="$emit('filter', $event)"
      />
      <SearchInput
        v-model="mediaSearch"
        placeholder="Search media…"
        class="search-grow"
      />
    </div>

    <LoadingState v-if="mediaLoading" message="Loading media…" />
    <ErrorState
      v-else-if="mediaError"
      :message="mediaError"
      @retry="$emit('fetch')"
    />
    <EmptyState
      v-else-if="filteredMedia.length === 0"
      title="No media found"
      message="Upload animations, images, and videos to use in your content."
    />

    <div v-else class="stack-lg">
      <div v-if="mediaByType.lottie.length > 0">
        <h3 class="card-title sm">
          Lottie animations ({{ mediaByType.lottie.length }})
        </h3>
        <div class="media-grid mt-3">
          <BaseCard
            v-for="item in mediaByType.lottie"
            :key="item.id"
            padding="none"
            interactive
            class="media-card"
            :class="{ selected: selectedMedia?.id === item.id }"
            role="button"
            tabindex="0"
            @click="$emit('select', item)"
            @keydown.enter.prevent="$emit('select', item)"
            @keydown.space.prevent="$emit('select', item)"
          >
            <div class="media-thumb">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div class="media-info">
              <span class="media-title">{{
                item.title || item.animation_key
              }}</span>
              <span class="media-size">{{
                formatFileSize(item.file_size_bytes)
              }}</span>
            </div>
          </BaseCard>
        </div>
      </div>

      <div v-if="mediaByType.video.length > 0">
        <h3 class="card-title sm">Videos ({{ mediaByType.video.length }})</h3>
        <div class="media-grid mt-3">
          <BaseCard
            v-for="item in mediaByType.video"
            :key="item.id"
            padding="none"
            interactive
            class="media-card"
            :class="{ selected: selectedMedia?.id === item.id }"
            role="button"
            tabindex="0"
            @click="$emit('select', item)"
            @keydown.enter.prevent="$emit('select', item)"
            @keydown.space.prevent="$emit('select', item)"
          >
            <div class="media-thumb">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="2.18"
                  ry="2.18"
                ></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
              </svg>
            </div>
            <div class="media-info">
              <span class="media-title">{{
                item.title || item.animation_key
              }}</span>
              <span class="media-size">{{
                formatFileSize(item.file_size_bytes)
              }}</span>
            </div>
          </BaseCard>
        </div>
      </div>

      <div v-if="mediaByType.image.length > 0">
        <h3 class="card-title sm">Images ({{ mediaByType.image.length }})</h3>
        <div class="media-grid mt-3">
          <BaseCard
            v-for="item in mediaByType.image"
            :key="item.id"
            padding="none"
            interactive
            class="media-card"
            :class="{ selected: selectedMedia?.id === item.id }"
            role="button"
            tabindex="0"
            @click="$emit('select', item)"
            @keydown.enter.prevent="$emit('select', item)"
            @keydown.space.prevent="$emit('select', item)"
          >
            <div class="media-thumb">
              <img
                v-if="item.image_file_url"
                :src="item.image_file_url"
                :alt="item.title"
              />
              <svg
                v-else
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div class="media-info">
              <span class="media-title">{{
                item.title || item.animation_key
              }}</span>
              <span class="media-size">{{
                formatFileSize(item.file_size_bytes)
              }}</span>
            </div>
          </BaseCard>
        </div>
      </div>

      <div v-if="mediaByType.youtube.length > 0">
        <h3 class="card-title sm">
          YouTube ({{ mediaByType.youtube.length }})
        </h3>
        <div class="media-grid mt-3">
          <BaseCard
            v-for="item in mediaByType.youtube"
            :key="item.id"
            padding="none"
            interactive
            class="media-card"
            :class="{ selected: selectedMedia?.id === item.id }"
            role="button"
            tabindex="0"
            @click="$emit('select', item)"
            @keydown.enter.prevent="$emit('select', item)"
            @keydown.space.prevent="$emit('select', item)"
          >
            <div class="media-thumb">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"
                />
              </svg>
            </div>
            <div class="media-info">
              <span class="media-title">{{
                item.title || item.animation_key
              }}</span>
              <span class="media-size">{{ item.youtube_id }}</span>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>

    <!-- Media detail modal -->
    <BaseModal
      :model-value="!!selectedMedia"
      size="full"
      :title="
        selectedMedia ? selectedMedia.title || selectedMedia.animation_key : ''
      "
      @update:model-value="selectedMedia = null"
    >
      <template v-if="selectedMedia">
        <span class="muted-mono"
          >{{ selectedMedia.media_type }} ·
          {{ formatFileSize(selectedMedia.file_size_bytes) }}</span
        >
        <div class="media-modal-preview">
          <div
            v-if="selectedMedia.media_type === 'lottie'"
            :id="'lottie-preview-' + selectedMedia.id"
            class="media-modal-lottie"
          ></div>
          <img
            v-else-if="selectedMedia.media_type === 'image'"
            :src="imageUrl(selectedMedia.image_file_url)"
            :alt="selectedMedia.title || ''"
            class="media-modal-img"
          />
          <video
            v-else-if="selectedMedia.media_type === 'video'"
            :src="selectedMedia.video_file_url"
            controls
            class="media-modal-video"
          ></video>
          <div v-else class="media-modal-placeholder">
            <span>{{ selectedMedia.media_type }}</span>
          </div>
        </div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-key">Animation key</span
            ><span class="kv-val">{{ selectedMedia.animation_key }}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Interaction</span
            ><span class="kv-val">{{
              selectedMedia.interaction_type || "-"
            }}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Component</span
            ><span class="kv-val">{{
              selectedMedia.component_name || "-"
            }}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Priority</span
            ><span class="kv-val">{{
              selectedMedia.load_priority || "normal"
            }}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Domain</span
            ><span class="kv-val">{{
              selectedMedia.scientific_domain || "-"
            }}</span>
          </div>
          <div class="kv-row kv-full usage">
            <span class="kv-key">Used in</span>
            <p v-if="!mediaUsage" class="kv-val muted">Checking…</p>
            <p v-else-if="mediaUsage.error" class="kv-val muted">
              Couldn't check: {{ mediaUsage.error }}
            </p>
            <template v-else>
              <ul v-if="mediaUsage.places.length" class="usage-list">
                <li v-for="(p, i) in mediaUsage.places" :key="i">
                  <strong>{{ p.chapter }}</strong> · {{ p.where }}
                </li>
              </ul>
              <p v-else class="kv-val muted">
                No paragraph or section shows it directly.
                <template v-if="!mediaUsage.inUse">
                  Figures can still load it by its key ({{
                    selectedMedia.animation_key
                  }}) from code, for example as a transition, so check before
                  deleting.
                </template>
              </p>
              <p
                v-if="mediaUsage.states || mediaUsage.variants"
                class="kv-val muted"
              >
                Carries {{ mediaUsage.states }} figure state{{
                  mediaUsage.states === 1 ? "" : "s"
                }}<template v-if="mediaUsage.variants">
                  and {{ mediaUsage.variants }} variant{{
                    mediaUsage.variants === 1 ? "" : "s"
                  }}</template
                >, which would be deleted with it.
              </p>
            </template>
          </div>
          <div v-if="selectedMedia.description" class="kv-row kv-full">
            <span class="kv-key">Description</span>
            <p class="kv-val">{{ selectedMedia.description }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <Button variant="ghost" size="sm" @click="selectedMedia = null"
          >Close</Button
        >
        <Button
          v-if="selectedMedia"
          variant="danger"
          size="sm"
          :disabled="!mediaUsage || !!mediaUsage.error || mediaUsage.inUse"
          :title="
            mediaUsage?.inUse
              ? 'In use: remove it from its figures first.'
              : 'Delete this unused asset'
          "
          @click="$emit('delete', selectedMedia.id)"
          >Delete asset</Button
        >
      </template>
    </BaseModal>
  </section>
</template>

<style scoped>
.usage-list {
  margin: 4px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 2px;
  font-size: 0.8125rem;
}
.usage .muted {
  color: rgb(var(--color-mute));
}
.media-card:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

@import "@/styles/dashboard-sections.css";
</style>
