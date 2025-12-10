<script setup>
import menu from "@/assets/json_backend/menu.json";
import InteractionButton from "@/components/UI/InteractionButton.vue";
import { useRoute, useRouter } from "vue-router";
import { useGeneral, useText } from "@/stores";
import { toSlug } from "@/helper/general.js";
import { computed, onMounted, ref } from "vue";

const store = useGeneral();
const textStore = useText();
const route = useRoute();
const router = useRouter();

const chapterNumber = computed(() => route.params.number);
const chapterSlug = computed(() => route.params.slug);

// Fetch all modules for navigation
const allModules = ref([]);
const loadingModules = ref(false);

onMounted(async () => {
    loadingModules.value = true;
    try {
        // Direct REST API call to bypass supabase-js client issues
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
        } else {
            console.error("MenuChapter: REST error:", response.status);
        }
    } catch (err) {
        console.error("MenuChapter: Exception:", err);
    } finally {
        loadingModules.value = false;
    }
});

// Get current chapter info
const currentChapter = computed(() => {
    if (chapterNumber.value === "1") {
        return { number: 1, title: "The Retina", slug: "the-retina" };
    }

    // Try to get from modules first
    const module = allModules.value.find((m) => m.slug === chapterSlug.value);
    if (module) {
        return {
            number: module.order_index,
            title: module.title,
            slug: module.slug,
        };
    }

    // Fallback to textStore if modules haven't loaded yet
    const introTitle = textStore.text?.intro?.[0]?.title;
    if (introTitle) {
        return {
            number: parseInt(chapterNumber.value) || 2,
            title: introTitle,
            slug: chapterSlug.value || "unknown",
        };
    }

    return null;
});

// Get previous and next chapters
const previousChapter = computed(() => {
    if (!currentChapter.value) return null;
    const currentIndex = currentChapter.value.number;
    if (currentIndex === 1) return null;

    if (currentIndex === 2) {
        return {
            number: 1,
            title: "The Retina",
            slug: "the-retina",
            path: "/chapter/1/the-retina",
        };
    }

    const prevModule = allModules.value.find(
        (m) => m.order_index === currentIndex - 1,
    );
    if (prevModule) {
        return {
            number: prevModule.order_index,
            title: prevModule.title,
            slug: prevModule.slug,
            path: `/chapter/${prevModule.order_index}/${prevModule.slug}`,
        };
    }
    return null;
});

const nextChapter = computed(() => {
    if (!currentChapter.value) return null;
    const currentIndex = currentChapter.value.number;

    if (currentIndex === 1) {
        const nextModule = allModules.value[0];
        if (nextModule) {
            return {
                number: nextModule.order_index,
                title: nextModule.title,
                slug: nextModule.slug,
                path: `/chapter/${nextModule.order_index}/${nextModule.slug}`,
            };
        }
    } else {
        const nextModule = allModules.value.find(
            (m) => m.order_index === currentIndex + 1,
        );
        if (nextModule) {
            return {
                number: nextModule.order_index,
                title: nextModule.title,
                slug: nextModule.slug,
                path: `/chapter/${nextModule.order_index}/${nextModule.slug}`,
            };
        }
    }
    return null;
});

// Get sections for current chapter
const currentChapterSections = computed(() => {
    if (chapterNumber.value === "1") {
        // Chapter 1 from JSON menu
        return menu.Part2?.parts || [];
    }
    // Chapter 2+ from store
    const sections = textStore.text?.sections || [];
    return sections.map((section, index) => ({
        title: section.title,
        id: section.id,
    }));
});

const toStart = () => {
    store.startIsActive = true;
    setTimeout(() => {
        store.activeMenu = false;
    }, 0);
};

const scrollToMenu = (menu) => {
    const link = document.querySelector("#" + menu);
    link.scrollIntoView({
        behavior: "smooth",
        alignToTop: "false",
        block: "start",
    });
};

const closeMenu = () => {
    store.activeMenu = false;

    store.isScrolling = true;
    setTimeout(() => {
        store.isScrolling = false;
    }, 700);
};
</script>

<template>
    <div
        v-if="route.name"
        class="fixed h-screen font-light overflow-y-scroll overflow-x-hidden border-violet/90 bg-dark text-white scrollbar top-0 left-0 z-50 text-baseMono font-mono duration-300 border-r-2 snap-x"
        :class="[
            store.activeMenu
                ? route.name === 'chapter'
                    ? 'w-[50vw]'
                    : 'w-[0]'
                : 'w-0 ',
        ]"
    >
        <!-- Chapters menu toggle -->
        <Transition name="menuTo">
            <div
                v-if="route.name && store.activeMenu && !store.showChaptersMenu"
                class="px-24 pt-12 pb-6 border-b border-light/70"
            >
                <button
                    @click="store.showChaptersMenu = true"
                    class="hover:text-violet text-baseMono transition-colors cursor-pointer"
                >
                    ← Chapters
                </button>
            </div>
        </Transition>

        <!-- chapter structur -->
        <Transition name="menuTo">
            <ul
                v-if="route.name && store.activeMenu && !store.showChaptersMenu"
                class="mb-52 duration-300 shrink-1 pb-24 h-full overflow-scroll"
            >
                <li class="w-[50vw] shrink-0 cursor-pointer">
                    <ol
                        class="w-full list-decimal py-12 overflow-hidden duration-300"
                    >
                        <div class="pb-6 pr-24">
                            <h3 class="-translate-x-0" @click="toStart()">
                                <span class="pl-20 pr-12">{{
                                    currentChapter?.number ||
                                    chapterNumber ||
                                    "2"
                                }}</span>
                                <RouterLink
                                    :to="
                                        chapterNumber === '1'
                                            ? '/chapter/1/the-retina'
                                            : currentChapter?.slug
                                              ? `/chapter/${currentChapter.number}/${currentChapter.slug}`
                                              : '#'
                                    "
                                >
                                    {{
                                        currentChapter?.title ||
                                        textStore.text?.intro?.[0]?.title ||
                                        "Chapter " + (chapterNumber || "2")
                                    }}
                                </RouterLink>
                            </h3>
                        </div>

                        <!-- Intro section -->
                        <div
                            class="py-4 pl-36 pr-12 border-t border-light/70 font-medium"
                        >
                            <div
                                class="flex pl-8 border-light/70 hover:text-violet"
                                @click="
                                    (scrollToMenu(
                                        chapterNumber === '1'
                                            ? 'the-eye-and-retina-intro'
                                            : textStore.text?.intro?.[0]?.id ||
                                                  'intro',
                                    ),
                                    closeMenu())
                                "
                                :class="
                                    'Footnotes' === store.currentSubChapter
                                        ? 'text-white pointer-events-none bg-violet'
                                        : ''
                                "
                            >
                                <div class="w-full max-w-[850px]">Intro</div>
                            </div>
                        </div>

                        <!-- Sections -->
                        <template v-if="chapterNumber === '1'">
                            <!-- Chapter 1 from JSON menu -->
                            <template
                                v-for="part in menu.Part2?.parts"
                                :key="part.title"
                            >
                                <div
                                    class="flex py-4 pl-36 pr-12 border-t border-light/70 hover:text-violet"
                                    @click="
                                        (scrollToMenu(toSlug(part.title)),
                                        closeMenu())
                                    "
                                    :class="
                                        toSlug(part.title) ===
                                        store.currentSubChapter
                                            ? 'text-white pointer-events-none bg-violet'
                                            : ''
                                    "
                                >
                                    <li
                                        class="w-full max-w-[850px] pl-8 font-medium"
                                    >
                                        {{ part.title }}
                                    </li>
                                </div>
                                <ol v-if="part.parts">
                                    <div
                                        class="block pl-44 pb-3 pt-3 hover:text-violet"
                                        @click="
                                            (scrollToMenu(toSlug(subPart)),
                                            closeMenu())
                                        "
                                        v-for="subPart in part.parts"
                                        :key="subPart"
                                    >
                                        <li class="sub max-w-[850px]">
                                            {{ subPart }}
                                        </li>
                                    </div>
                                </ol>
                            </template>
                        </template>
                        <template v-else>
                            <!-- Chapter 2+ from store -->
                            <template
                                v-for="section in textStore.text?.sections ||
                                []"
                                :key="section.id"
                            >
                                <div
                                    class="flex py-4 pl-36 pr-12 border-t border-light/70 hover:text-violet"
                                    @click="
                                        (scrollToMenu(toSlug(section.title)),
                                        closeMenu())
                                    "
                                    :class="
                                        toSlug(section.title) ===
                                        store.currentSubChapter
                                            ? 'text-white pointer-events-none bg-violet'
                                            : ''
                                    "
                                >
                                    <li
                                        class="w-full max-w-[850px] pl-8 font-medium"
                                    >
                                        {{ section.title }}
                                    </li>
                                </div>
                            </template>
                        </template>

                        <!-- Footnotes -->
                        <div
                            class="flex py-4 pl-36 pr-12 border-t border-light/70 hover:text-violet"
                            @click="(scrollToMenu('footnotes'), closeMenu())"
                            :class="
                                'Footnotes' === store.currentSubChapter
                                    ? 'text-white pointer-events-none bg-violet'
                                    : ''
                            "
                        >
                            <li class="w-full max-w-[850px] pl-8 font-medium">
                                Footnotes
                            </li>
                        </div>
                    </ol>
                </li>
            </ul>
        </Transition>
        <InteractionButton
            v-if="store.activeMenu"
            :text="'close'"
            :target="'Menu'"
            class="absolute bg-darker pt-10 pb-4 pointer-events-auto z-[60] h-full w-10 flex justify-center items-start top-0 right-0 duration-300 overflow-hidden"
        />
        <!-- menu open/close chapter -->
        <InteractionButton
            :text="'open'"
            :target="'Menu'"
            class="fixed bg-darker pt-10 pb-4 pointer-events-auto z-[60] h-full w-10 flex justify-center items-start top-0 duration-300 overflow-hidden"
            :class="
                !store.activeMenu && route.name === 'chapter'
                    ? 'left-10 opacity-100 '
                    : '-left-10 opacity-0'
            "
        />
    </div>
</template>

<style scoped>
.listItem {
    display: block;
}

p {
    padding-bottom: 0;
}

.proper {
    transition-property: heigh width;
}
</style>
