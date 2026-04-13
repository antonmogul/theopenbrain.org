<script setup>
import menu from "@/assets/json_backend/menu.json";
import { useRoute, useRouter } from "vue-router";
import { useGeneral, useText } from "@/stores";
import { toSlug } from "@/helper/general.js";
import { computed, onMounted, ref, watch } from "vue";

const store = useGeneral();
const textStore = useText();
const route = useRoute();
const router = useRouter();

const chapterNumber = computed(() => route.params.number);
const chapterSlug = computed(() => route.params.slug);

// ── Fetch modules from Supabase ──
const allModules = ref([]);
const loadingModules = ref(false);

onMounted(async () => {
    loadingModules.value = true;
    try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key =
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
            `${url}/rest/v1/modules?select=id,title,slug,order_index,status&order=order_index.asc`,
            {
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (response.ok) {
            const data = await response.json();
            allModules.value = data || [];
        }
    } catch (err) {
        console.error("MenuNav: Failed to fetch modules:", err);
    } finally {
        loadingModules.value = false;
    }

    // Auto-expand the current chapter on mount
    autoExpandCurrentChapter();
});

// ── Chapter list: Ch1 hardcoded + Supabase modules ──
const allChapters = computed(() => {
    const ch1 = { id: "ch1", number: 1, title: "The Retina", slug: "the-retina" };
    const supaChapters = allModules.value.map((m) => ({
        id: m.id,
        number: m.order_index,
        title: m.title,
        slug: m.slug,
    }));
    return [ch1, ...supaChapters];
});

// ── Sections for a given chapter ──
function getSections(chapter) {
    if (chapter.number === 1) {
        return menu.Part2?.parts || [];
    }
    // For non-current chapters we don't have section data
    if (String(chapter.number) !== String(chapterNumber.value)) {
        return null; // signals "navigate to see sections"
    }
    // Current chapter 2+: map from textStore
    const sections = textStore.text?.sections || [];
    return sections.map((s) => ({
        title: s.title,
        id: s.id,
    }));
}

// ── Accordion expand/collapse ──
function toggleExpand(chapter) {
    if (store.expandedChapterId === chapter.id) {
        store.expandedChapterId = null;
    } else {
        store.expandedChapterId = chapter.id;
    }
}

function isExpanded(chapter) {
    return store.expandedChapterId === chapter.id;
}

// ── Auto-expand current chapter on route change ──
function autoExpandCurrentChapter() {
    const ch = allChapters.value.find(
        (c) => String(c.number) === String(chapterNumber.value),
    );
    if (ch) {
        store.expandedChapterId = ch.id;
    }
}

watch(() => route.params.number, autoExpandCurrentChapter);

// ── Navigation ──
function navigateToChapter(chapter) {
    router.push(`/chapter/${chapter.number}/${chapter.slug}`);
    closeMenu();
}

function scrollToSection(sectionId) {
    const el = document.querySelector("#" + sectionId);
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    closeMenu();
}

function scrollToIntro() {
    const id =
        chapterNumber.value === "1"
            ? "the-eye-and-retina-intro"
            : textStore.text?.intro?.[0]?.id || "intro";
    scrollToSection(id);
}

function closeMenu() {
    store.activeMenu = false;
    store.isScrolling = true;
    setTimeout(() => {
        store.isScrolling = false;
    }, 700);
}

function isCurrentChapter(chapter) {
    return String(chapter.number) === String(chapterNumber.value);
}

function isSectionActive(slug) {
    return slug === store.currentSubChapter;
}
</script>

<template>
    <div
        v-if="route.name"
        class="fixed h-screen font-light overflow-y-scroll overflow-x-hidden border-violet/90 bg-dark text-white scrollbar top-0 left-0 z-50 font-mono duration-300 border-r-2 snap-x"
        :class="[
            store.activeMenu
                ? route.name === 'chapter'
                    ? 'w-full md:max-w-[480px] xl:w-[50vw] xl:max-w-none'
                    : 'w-[0]'
                : 'w-0',
        ]"
    >
        <Transition name="menuTo">
            <div
                v-if="route.name && store.activeMenu"
                class="duration-300 shrink-1 pb-52"
            >
                <!-- Header -->
                <div class="px-12 pt-12 pb-6 border-b border-light/70">
                    <div class="text-[11px] uppercase tracking-widest text-white/40 font-normal">CHAPTERS</div>
                </div>

                <!-- Loading -->
                <div v-if="loadingModules" class="px-12 py-6 text-[13px] text-white/50">
                    Loading chapters...
                </div>

                <!-- Chapter list -->
                <div v-else>
                    <div
                        v-for="chapter in allChapters"
                        :key="chapter.id"
                    >
                        <!-- ── Level 1: Chapter title row ── -->
                        <div
                            class="flex items-center border-b border-light/20"
                        >
                            <button
                                class="flex-1 text-left py-5 pl-12 pr-2 text-[15px] font-semibold transition-colors cursor-pointer"
                                :class="
                                    isCurrentChapter(chapter)
                                        ? 'text-violet'
                                        : 'text-white/90 hover:text-violet'
                                "
                                @click="navigateToChapter(chapter)"
                            >
                                <span class="text-[15px] text-white/40 pr-3 font-normal"
                                    >{{ chapter.number }}.</span
                                >{{ chapter.title }}
                            </button>

                            <button
                                class="px-5 py-5 text-white/40 hover:text-violet cursor-pointer transition-all duration-200"
                                @click="toggleExpand(chapter)"
                            >
                                <svg
                                    class="w-4 h-4 transition-transform duration-200"
                                    :class="{ 'rotate-180': isExpanded(chapter) }"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>
                        </div>

                        <!-- ── Accordion: sections nested under chapter ── -->
                        <Transition name="accordion">
                            <div
                                v-if="isExpanded(chapter)"
                                class="accordion-body border-b border-light/20"
                            >
                                <!-- Left border to show nesting -->
                                <div class="ml-10 border-l-2 border-violet/30">

                                    <!-- Intro -->
                                    <template v-if="isCurrentChapter(chapter)">
                                        <div
                                            class="section-item py-3 pl-6 pr-8 text-[13px] text-white/60 hover:text-violet cursor-pointer transition-colors"
                                            @click="scrollToIntro()"
                                        >
                                            Intro
                                        </div>
                                    </template>

                                    <!-- "Navigate to see sections" for non-current ch2+ -->
                                    <template v-if="getSections(chapter) === null">
                                        <div class="py-3 pl-6 pr-8 text-white/30 italic text-[12px]">
                                            Navigate to chapter to see sections
                                        </div>
                                    </template>

                                    <template v-else>
                                        <!-- ── Level 2: Sections ── -->

                                        <!-- Ch1 sections from menu.json -->
                                        <template v-if="chapter.number === 1">
                                            <div
                                                v-for="(part, idx) in getSections(chapter)"
                                                :key="part.title"
                                            >
                                                <div
                                                    class="section-item flex items-baseline py-3 pl-6 pr-8 text-[13px] cursor-pointer transition-colors"
                                                    :class="
                                                        isSectionActive(toSlug(part.title))
                                                            ? 'text-white bg-violet/90'
                                                            : 'text-white/70 hover:text-violet'
                                                    "
                                                    @click="scrollToSection(toSlug(part.title))"
                                                >
                                                    <span class="text-[12px] text-white/35 pr-3 shrink-0">{{ idx + 1 }}.</span>
                                                    <span class="font-medium">{{ part.title }}</span>
                                                </div>

                                                <!-- ── Level 3: Subsections ── -->
                                                <div v-if="part.parts" class="ml-6 border-l border-white/10">
                                                    <div
                                                        v-for="subPart in part.parts"
                                                        :key="subPart"
                                                        class="py-2 pl-5 pr-8 text-[12px] text-white/45 hover:text-violet cursor-pointer transition-colors"
                                                        @click="scrollToSection(toSlug(subPart))"
                                                    >
                                                        <span class="text-white/25 pr-2">&#8226;</span>
                                                        {{ subPart }}
                                                    </div>
                                                </div>
                                            </div>
                                        </template>

                                        <!-- Ch2+ sections from textStore -->
                                        <template v-else>
                                            <div
                                                v-for="(section, idx) in getSections(chapter)"
                                                :key="section.id"
                                                class="section-item flex items-baseline py-3 pl-6 pr-8 text-[13px] cursor-pointer transition-colors"
                                                :class="
                                                    isSectionActive(toSlug(section.title))
                                                        ? 'text-white bg-violet/90'
                                                        : 'text-white/70 hover:text-violet'
                                                "
                                                @click="scrollToSection(toSlug(section.title))"
                                            >
                                                <span class="text-[12px] text-white/35 pr-3 shrink-0">{{ idx + 1 }}.</span>
                                                <span class="font-medium">{{ section.title }}</span>
                                            </div>
                                        </template>
                                    </template>

                                    <!-- Footnotes -->
                                    <template v-if="isCurrentChapter(chapter)">
                                        <div
                                            class="section-item py-3 pl-6 pr-8 text-[13px] text-white/60 hover:text-violet cursor-pointer transition-colors"
                                            :class="
                                                isSectionActive('Footnotes')
                                                    ? 'text-white bg-violet/90'
                                                    : ''
                                            "
                                            @click="scrollToSection('footnotes')"
                                        >
                                            Footnotes
                                        </div>
                                    </template>

                                </div>
                            </div>
                        </Transition>
                    </div>
                </div>
            </div>
        </Transition>

    </div>

    <!-- Backdrop overlay (outside sidebar so it doesn't block scroll/clicks) -->
    <div
        v-if="store.activeMenu && route.name === 'chapter'"
        class="fixed inset-0 z-40 cursor-pointer"
        @click="closeMenu()"
    />
</template>

<style scoped>
/* Accordion transition */
.accordion-enter-active,
.accordion-leave-active {
    transition: max-height 0.3s ease, opacity 0.3s ease;
    overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
    max-height: 0;
    opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
    max-height: 2000px;
    opacity: 1;
}

.accordion-body {
    overflow: hidden;
}
</style>
