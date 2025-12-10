<script setup>
import { useRoute, useRouter } from "vue-router";
import { useGeneral } from "@/stores";
import { computed, onMounted, ref, watch } from "vue";
import { useModules } from "@/composables/useModules";
import ClosedEye from "@/icons/custom/ClosedEye.vue";

const store = useGeneral();
const route = useRoute();
const router = useRouter();
const { fetchModules } = useModules();

// Fetch all modules for navigation
const allModules = ref([]);
const loadingModules = ref(false);

onMounted(async () => {
  loadingModules.value = true;
  try {
    // Fetch all modules (both draft and published) to show in navigation
    const { data, error } = await fetchModules(null, null);
    if (error) {
      console.error('Error fetching modules:', error);
    }
    if (data && Array.isArray(data)) {
      allModules.value = data.sort((a, b) => a.order_index - b.order_index);
      console.log('MenuChapters: Loaded modules:', allModules.value.length, allModules.value.map(m => `${m.order_index}: ${m.title} (${m.status})`));
    } else {
      console.warn('MenuChapters: No modules data returned');
    }
  } catch (err) {
    console.error('MenuChapters: Error loading modules:', err);
  } finally {
    loadingModules.value = false;
  }
});

const chapterNumber = computed(() => route.params.number);

const closeMenu = () => {
  store.activeMenu = false;
  store.isScrolling = true;
  setTimeout(() => {
    store.isScrolling = false;
  }, 700);
};

const navigateToChapter = (chapterNum, slug) => {
  store.showChaptersMenu = false;
  setTimeout(() => {
    router.push(`/chapter/${chapterNum}/${slug}`);
    closeMenu();
  }, 100);
};

// Close chapters menu when route changes
watch(() => route.params, () => {
  store.showChaptersMenu = false;
});
</script>

<template>
  <div
    v-if="route.name"
    class="fixed h-screen font-light overflow-y-scroll overflow-x-hidden border-violet/90 bg-dark text-white scrollbar top-0 left-0 z-[60] text-baseMono font-mono duration-300 border-r-2 snap-x"
    :class="[
      store.activeMenu && store.showChaptersMenu
        ? route.name === 'chapter'
          ? 'w-[50vw]'
          : 'w-[0]'
        : 'w-0 ',
    ]"
  >
    <!-- Chapters list -->
    <Transition name="menuTo">
      <div
        v-if="route.name && store.activeMenu && store.showChaptersMenu"
        class="mb-52 duration-300 shrink-1 pb-24 h-full overflow-scroll"
      >
        <div class="px-24 pt-12 pb-6">
          <h3 class="text-baseMono mb-8">Chapters</h3>
          
          <div class="flex flex-col gap-3">
            <!-- Chapter 1 - Static -->
            <RouterLink
              :to="'/chapter/1/the-retina'"
              class="hover:text-violet text-baseMono py-3 transition-colors border-b border-light/30"
              :class="chapterNumber === '1' ? 'text-violet font-semibold' : 'text-white/80'"
              @click="navigateToChapter(1, 'the-retina')"
            >
              <span class="pr-4">1.</span> The Retina
            </RouterLink>
            
            <!-- Chapters from Supabase - Dynamic -->
            <template v-if="!loadingModules && allModules.length > 0">
              <RouterLink
                v-for="module in allModules"
                :key="module.id"
                :to="`/chapter/${module.order_index}/${module.slug}`"
                class="hover:text-violet text-baseMono py-3 transition-colors border-b border-light/30"
                :class="chapterNumber === String(module.order_index) ? 'text-violet font-semibold' : 'text-white/80'"
                @click="navigateToChapter(module.order_index, module.slug)"
              >
                <span class="pr-4">{{ module.order_index }}.</span> {{ module.title }}
              </RouterLink>
            </template>
            
            <!-- Loading state -->
            <div v-if="loadingModules" class="text-baseMono text-white/50 py-3 border-b border-light/30">
              Loading chapters...
            </div>
            
            <!-- Debug: Show if no modules found -->
            <div v-if="!loadingModules && allModules.length === 0" class="text-baseMono text-white/50 py-3 border-b border-light/30">
              No additional chapters found
            </div>
          </div>
        </div>
      </div>
    </Transition>
    
    <button
      v-if="store.activeMenu && store.showChaptersMenu"
      @click="store.showChaptersMenu = false"
      class="absolute bg-darker pt-10 pb-4 pointer-events-auto z-[70] h-full w-10 flex justify-center items-start top-0 right-0 duration-300 overflow-hidden hover:bg-darker/80"
      title="Close chapters menu"
    >
      <ClosedEye class="w-7 h-7 fill-white hover:fill-violet transition-colors" />
    </button>
  </div>
</template>

<style scoped>
.listItem {
  display: block;
}

p {
  padding-bottom: 0;
}
</style>
