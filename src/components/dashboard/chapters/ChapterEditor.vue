<script setup>
/**
 * ChapterEditor Component
 *
 * Editor layout with block list, content preview, and TipTap editor.
 */

import { ref, computed, watch } from 'vue';
import { useChaptersStore, blocksToHtml } from '@/stores/dashboard/chapters';
import { storeToRefs } from 'pinia';
import BlockList from './BlockList.vue';
import ContentPreview from './ContentPreview.vue';
import TipTapEditor from '@/components/Editor/TipTapEditor.vue';

const props = defineProps({
  chapterId: {
    type: String,
    required: true,
  },
});

const chaptersStore = useChaptersStore();
const {
  flatBlocks,
  selectedBlock,
  saving,
  saveStatus,
  draggedBlockId,
  dragOverBlockId,
  highlightedBlockId,
  chapterStats,
  expandedChapter,
} = storeToRefs(chaptersStore);

const editorContent = ref('');
const contentPreviewRef = ref(null);

// View mode: 'list' | 'preview' | 'split'
const viewMode = ref('split');

// Watch selected block and update editor content
watch(selectedBlock, (block) => {
  if (block) {
    const jsonBlocks = block.content?.blocks || [];
    editorContent.value = blocksToHtml(jsonBlocks);
  } else {
    editorContent.value = '';
  }
});

// Block selection
function handleBlockSelect(block) {
  chaptersStore.selectBlock(block);
}

// Drag and drop handlers
function handleDragStart(e, block) {
  draggedBlockId.value = block.id;
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e, block) {
  if (draggedBlockId.value && draggedBlockId.value !== block.id) {
    dragOverBlockId.value = block.id;
  }
}

function handleDragLeave() {
  dragOverBlockId.value = null;
}

async function handleDrop(e, targetBlock) {
  const draggedBlock = flatBlocks.value.find(b => b.id === draggedBlockId.value);
  if (draggedBlock) {
    await chaptersStore.reorderBlocks(draggedBlock, targetBlock);
  }
  draggedBlockId.value = null;
  dragOverBlockId.value = null;
}

function handleDragEnd() {
  draggedBlockId.value = null;
  dragOverBlockId.value = null;
}

// Save content
async function handleSave() {
  if (selectedBlock.value && editorContent.value) {
    await chaptersStore.saveBlock(editorContent.value);
  }
}

// Block visibility for scroll sync
function handleBlockVisible(blockId) {
  highlightedBlockId.value = blockId;
}

// Cancel editing
function handleCancel() {
  chaptersStore.clearSelection();
}
</script>

<template>
  <div class="border-t border-gray-200">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <!-- Stats -->
      <div v-if="chapterStats" class="flex items-center gap-4 text-sm text-gray-600">
        <span>{{ chapterStats.sections }} sections</span>
        <span>{{ chapterStats.paragraphs }} paragraphs</span>
        <span>{{ chapterStats.words.toLocaleString() }} words</span>
        <span>{{ chapterStats.readingTime }} min read</span>
      </div>

      <!-- View mode toggle -->
      <div class="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
        <button
          @click="viewMode = 'list'"
          :class="[
            'px-3 py-1 text-sm rounded',
            viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          List
        </button>
        <button
          @click="viewMode = 'split'"
          :class="[
            'px-3 py-1 text-sm rounded',
            viewMode === 'split' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          Split
        </button>
        <button
          @click="viewMode = 'preview'"
          :class="[
            'px-3 py-1 text-sm rounded',
            viewMode === 'preview' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          Preview
        </button>
      </div>
    </div>

    <!-- Main content area -->
    <div class="flex h-[600px]">
      <!-- Block list -->
      <div
        v-if="viewMode === 'list' || viewMode === 'split'"
        :class="[
          'border-r border-gray-200 overflow-y-auto',
          viewMode === 'split' ? 'w-1/3' : 'w-full',
        ]"
      >
        <BlockList
          :blocks="flatBlocks"
          :selected-block-id="selectedBlock?.id"
          :highlighted-block-id="highlightedBlockId"
          :dragged-block-id="draggedBlockId"
          :drag-over-block-id="dragOverBlockId"
          @select="handleBlockSelect"
          @drag-start="handleDragStart"
          @drag-over="handleDragOver"
          @drag-leave="handleDragLeave"
          @drop="handleDrop"
          @drag-end="handleDragEnd"
        />
      </div>

      <!-- Content preview / Editor -->
      <div
        v-if="viewMode === 'preview' || viewMode === 'split'"
        :class="[
          'flex-1 flex flex-col',
          viewMode === 'split' ? 'w-2/3' : 'w-full',
        ]"
      >
        <!-- Editor panel (when block selected) -->
        <template v-if="selectedBlock">
          <div class="flex-1 flex flex-col">
            <!-- Editor header -->
            <div class="flex items-center justify-between px-4 py-2 bg-indigo-50 border-b border-indigo-100">
              <div class="text-sm">
                <span class="text-indigo-700 font-medium">Editing:</span>
                <span class="text-indigo-600 ml-1">{{ selectedBlock.preview }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="saveStatus" :class="['text-sm', saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600']">
                  {{ saveStatus }}
                </span>
                <button
                  @click="handleCancel"
                  class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  @click="handleSave"
                  :disabled="saving"
                  class="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </div>

            <!-- TipTap editor -->
            <div class="flex-1 overflow-y-auto">
              <TipTapEditor
                v-model="editorContent"
                class="h-full"
                @save="handleSave"
              />
            </div>
          </div>
        </template>

        <!-- Content preview (when no block selected) -->
        <template v-else>
          <ContentPreview
            ref="contentPreviewRef"
            :blocks="flatBlocks"
            :selected-block-id="selectedBlock?.id"
            @block-visible="handleBlockVisible"
          />
        </template>
      </div>
    </div>
  </div>
</template>
