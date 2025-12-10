<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const { isCreator, loading, userRole } = useAuth();

// Placeholder for future TipTap editor
const editorReady = ref(false);

onMounted(() => {
  // TipTap will be initialized here
  editorReady.value = true;
});
</script>

<template>
  <main class="min-h-screen bg-darker text-white pt-24 px-12">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-[60vh]">
      <div class="text-xl text-light">Loading...</div>
    </div>

    <!-- Not a Creator -->
    <div v-else-if="!isCreator" class="flex flex-col items-center justify-center h-[60vh] gap-6">
      <h1 class="text-4xl font-semibold">Access Denied</h1>
      <p class="text-light text-lg">
        The content editor is only available to users with the Creator role.
      </p>
      <p class="text-light">
        Your current role:
        <span class="text-violet font-mono uppercase">{{ userRole || "none" }}</span>
      </p>
      <button
        @click="router.push('/dashboard')"
        class="uppercase bg-violet text-white font-mono px-8 py-3 rounded-full hover:bg-white hover:text-black transition-colors"
      >
        Go to Dashboard
      </button>
    </div>

    <!-- Editor (Creator Only) -->
    <div v-else class="max-w-6xl mx-auto">
      <header class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-4xl font-semibold mb-2">Content Editor</h1>
          <p class="text-light">Create and edit chapter content</p>
        </div>
        <button
          @click="router.push('/dashboard')"
          class="uppercase bg-transparent border border-light text-light font-mono px-6 py-2 rounded-full hover:bg-white hover:text-black hover:border-white transition-colors"
        >
          Back to Dashboard
        </button>
      </header>

      <!-- Placeholder for TipTap Editor -->
      <div class="editor-placeholder">
        <div class="border border-dashed border-light/30 rounded-lg p-12 text-center">
          <h2 class="text-2xl font-semibold mb-4 text-light">TipTap Editor Coming Soon</h2>
          <p class="text-light/70 max-w-xl mx-auto mb-8">
            This is where the rich text editor will be integrated.
            The TipTap editor will allow you to create and edit educational content
            with support for headings, paragraphs, lists, images, and more.
          </p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto text-sm">
            <div class="feature-tag">Rich Text</div>
            <div class="feature-tag">Images</div>
            <div class="feature-tag">Code Blocks</div>
            <div class="feature-tag">Tables</div>
            <div class="feature-tag">Headings</div>
            <div class="feature-tag">Lists</div>
            <div class="feature-tag">Links</div>
            <div class="feature-tag">Markdown</div>
          </div>
        </div>
      </div>

      <!-- Chapter Selection (Placeholder) -->
      <section class="mt-12">
        <h2 class="text-2xl font-semibold mb-6">Select Content to Edit</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="content-card">
            <h3 class="font-semibold mb-2">Chapter 1: The Retina</h3>
            <p class="text-light text-sm mb-4">Introduction to retinal structure and function</p>
            <span class="status-badge">Published</span>
          </div>
          <div class="content-card">
            <h3 class="font-semibold mb-2">Chapter 2: Retinal Cells</h3>
            <p class="text-light text-sm mb-4">Types of cells in the retina</p>
            <span class="status-badge">Published</span>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.feature-tag {
  background: rgba(151, 71, 255, 0.1);
  border: 1px solid rgba(151, 71, 255, 0.3);
  color: rgb(151, 71, 255);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-family: "IBM Plex Mono", monospace;
  text-transform: uppercase;
}

.content-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
}

.content-card:hover {
  border-color: rgba(151, 71, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.status-badge {
  display: inline-block;
  background: rgba(34, 197, 94, 0.2);
  color: rgb(34, 197, 94);
  font-size: 0.75rem;
  font-family: "IBM Plex Mono", monospace;
  text-transform: uppercase;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
</style>
