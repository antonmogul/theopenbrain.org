<script setup>
import {
  computed,
  inject,
  onMounted,
  onBeforeUnmount,
  ref,
  provide,
} from "vue";
import { useRoute } from "vue-router";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { STAGE_LAYER_ID } from "@/helper/stageLayer";
import { toSlug, addH, removeH } from "@/helper/general";
import { markersEnabled } from "@/helper/debugFlags";
import { sectionLabelMap } from "@/composables/useChapterOutline";
import { authorsForModule } from "@/helper/chapterAuthors";

import { useText, useGeneral } from "@/stores";
import { useAuth } from "@/composables/useAuth";
import { saveInlineEdit } from "@/editor/inlineSave";
import { blocksToPlainText } from "@/editor/plainText";
import {
  contentBlocksToHTML,
  figureFor,
} from "@/composables/chapterTransform.mjs";

import Section from "./text/SectionComp.vue";
import Points from "@/components/UI/PointsComp.vue";
import HoverImg from "@/components/chapter/text/HoverImg.vue";
import FurtherReading from "./text/FurtherReading.vue";
import ReferenceList from "./text/ReferenceList.vue";
import EditableBlock from "./text/EditableBlock.vue";

import FootNotes from "./text/FootNotes.vue";

import Perlin from "@/helper/perlin.ts";
import QuizSection from "./text/QuizSection.vue";
import MediaPicker from "@/components/chapterEditor/MediaPicker.vue";

// Seed value is optional, default is 0.
const seed = Math.random();
const noise = new Perlin(seed);

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
// Scroll-trigger markers render only with ?markers=1 (OPENBRAIN-31).
const showMarkers = markersEnabled();
const store = useGeneral();
const textStore = useText();

// Get auth state
const { isCreator, session } = useAuth();

const triggers = ref(null);
const ownedScrollTriggers = [];
const markerListeners = [];
let waitInterval = null;
let triggerSetupTimeout = null;

// The module row (authors, slug) — every chapter is a Supabase chapter now;
// the old `isChapter1` route check is gone (OPENBRAIN-33).
const props = defineProps({
  module: { type: Object, default: null },
});
// A paragraph's figure changed: ChapterView remounts the figure pane so it
// wires a scroll trigger for a paragraph that had none.
const emit = defineEmits(["figure-changed"]);
const authors = computed(() => authorsForModule(props.module));

// The intro's scroll-trigger id derives from its animation config
// (sections.animation_config.name, e.g. "dragon" → triggerAnimationDragon)
// instead of a hardcoded Retina-only span.
const introTriggerId = (section) => {
  const name = section?.animation?.name;
  if (!name) return null;
  return `triggerAnimation${name.charAt(0).toUpperCase()}${name.slice(1)}`;
};

// Use computed property for reactivity - this will update when store changes
const source = computed(() => {
  return textStore.text;
});

/*
 * Section badge labels. Main sections count 1, 2, 3 … ; breakout boxes
 * (sections the transform marked kind: "box", i.e. slugged box-*) letter
 * A, B, C … so the History chapter reads as five sections plus asides rather
 * than fourteen numbered chapters. Keyed by section id (falls back to title
 * for fixture data without ids).
 */
// One source for section numbering/lettering, shared with the opener's TOC
// (useChapterOutline, OPENBRAIN-32) so the prose and the contents agree.
const sectionLabels = computed(() => sectionLabelMap(source.value?.sections));

// The references table's rows, listed at the chapter's end when its list
// isn't a section of its own (OPENBRAIN-92); a References section renders
// them itself (SectionComp).
const refsCtx = inject("references", null);
const endReferences = computed(() => {
  const rows = refsCtx?.references?.value || [];
  if (!rows.length) return [];
  const hasSection = (source.value?.sections || []).some(
    (s) => s.slug === "references"
  );
  return hasSection ? [] : rows;
});

// Boxes anchored to a paragraph render inside their section, right after it
// (OPENBRAIN-70 A4); the rest render in order.
const topSections = computed(() =>
  (source.value?.sections || []).filter((s) => !s.anchored)
);
const anchoredBoxes = computed(() => {
  const map = new Map();
  for (const s of source.value?.sections || []) {
    if (!s.anchored) continue;
    if (!map.has(s.anchorParagraphId)) map.set(s.anchorParagraphId, []);
    map.get(s.anchorParagraphId).push(s);
  }
  return map;
});
provide(
  "boxesAfter",
  (paragraphId) => anchoredBoxes.value.get(paragraphId) || []
);
provide("sectionLabels", sectionLabels);

// ---- Edit mode (OPENBRAIN-58, 64) ----
// Off until a creator switches it on (or opens ?edit=1), so reading a
// chapter can't change it.
const editMode = ref(route.query.edit === "1");
const canEdit = computed(() => isCreator.value && editMode.value);
const lastSavedAt = ref(null);
const saving = ref(false);
const editUndo = ref([]); // [{ label, run }]
const editNote = ref(null); // { message, error }
let editNoteTimer = null;
function note(message, error = false) {
  clearTimeout(editNoteTimer);
  editNote.value = { message, error };
  editNoteTimer = setTimeout(() => (editNote.value = null), 6000);
}
const savedLabel = computed(() =>
  saving.value
    ? "Saving…"
    : lastSavedAt.value
      ? `Saved ${lastSavedAt.value.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "Click any paragraph to edit it"
);
const blockPageHref = computed(() =>
  props.module?.slug ? `/dashboard/chapters/${props.module.slug}` : null
);

// Walk the transformed chapter (intro, sections, subsections, sub-sub…) and
// visit every object that has an id; used for the lock map and local updates.
function eachNode(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => eachNode(n, visit));
    return;
  }
  if (node.id) visit(node);
  for (const key of [
    "intro",
    "sections",
    "paragraphs",
    "subSection",
    "subSubSection",
  ]) {
    if (node[key]) eachNode(node[key], visit);
  }
}

// paragraph id → its stored blocks (chapterTransform keeps them on every
// paragraph and subsection header), so EditableBlock edits them losslessly.
const blocksMap = computed(() => {
  const map = new Map();
  eachNode(source.value, (n) => {
    if (Array.isArray(n.blocks)) map.set(n.id, n.blocks);
  });
  return map;
});
provide("blocksFor", (id) => blocksMap.value.get(id) || null);

const stripTags = (html) => html.replace(/<[^>]*>/g, "");

async function rest(path, init = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  const accessToken = session.value?.access_token;
  if (!accessToken)
    throw new Error("Your session has expired. Sign in again to save.");
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.method && init.method !== "GET"
        ? { Prefer: "return=representation" }
        : {}),
    },
  });
  if (!res.ok)
    throw new Error(`Couldn't save (error ${res.status}). Try again.`);
  return res.json();
}

// The one save path for inline edits: children call it through inject and
// no longer re-emit (which PATCHed the same row two or three times). The
// checks and the merge live in src/editor/inlineSave.js.
const saveContent = async (edit) => {
  saving.value = true;
  try {
    const result = await saveInlineEdit(rest, edit);
    if (edit.blocks) {
      updateLocalBlocks(edit.paragraphId, edit.blocks, edit.type);
      const before = result?.previous;
      if (before)
        editUndo.value = [
          ...editUndo.value.slice(-19),
          {
            label: "Edit",
            run: async () => {
              await rest(`paragraphs?id=eq.${edit.paragraphId}`, {
                method: "PATCH",
                body: JSON.stringify(before),
              });
              updateLocalBlocks(
                edit.paragraphId,
                before.content?.blocks || [],
                edit.type
              );
            },
          },
        ];
    } else {
      updateLocalContent(edit.paragraphId, edit.content, edit.type);
    }
    lastSavedAt.value = new Date();
    note("Saved.");
  } finally {
    saving.value = false;
  }
};

async function undoLastEdit() {
  const last = editUndo.value[editUndo.value.length - 1];
  if (!last) return;
  saving.value = true;
  try {
    await last.run();
    editUndo.value = editUndo.value.slice(0, -1);
    lastSavedAt.value = new Date();
    note("Undone.");
  } catch (err) {
    note(`Couldn't undo: ${err.message}`, true);
  } finally {
    saving.value = false;
  }
}

// After a blocks save: re-render that paragraph from its new blocks.
function updateLocalBlocks(id, blocks, type) {
  if (!source.value) return;
  eachNode(source.value, (n) => {
    if (n.id !== id) return;
    n.blocks = blocks;
    if (type === "subsection-title" && "title" in n)
      n.title = blocksToPlainText(blocks);
    else n.text = contentBlocksToHTML(blocks).text;
  });
}

// Update content in the local store so the edit shows without a reload
// (subsections are arrays, which the old lookup missed).
const updateLocalContent = (id, content, type) => {
  if (!source.value) return;
  if (type === "section-title" || type === "intro-title") {
    const plain = stripTags(content);
    for (const section of source.value.sections || []) {
      if (section.id === id) section.title = plain;
    }
    // The intro keeps its own title in sectionTitle (title is the module
    // name for legacy consumers).
    for (const intro of source.value.intro || []) {
      if (intro.id === id) intro.sectionTitle = plain;
    }
    return;
  }
  eachNode(source.value, (n) => {
    if (n.id !== id) return;
    if (type === "subsection-title" && "title" in n)
      n.title = stripTags(content);
    else n.text = content;
  });
};

// ---- Change figure (OPENBRAIN-65) ----
// "Figure…" on a paragraph opens the media library (image, Lottie, video,
// YouTube; images since OPENBRAIN-70 B1); the pick is PATCHed onto the row
// and shown in place, with Undo.
const FIGURE_TYPES = ["image", "lottie", "video", "youtube", "widget"];
const figureMedia = ref([]);
const figureTarget = ref(null); // paragraph node being changed
const figureCurrentId = computed(() => {
  const key = figureTarget.value?.animation?.id;
  return (
    (key && figureMedia.value.find((m) => m.animation_key === key)?.id) || null
  );
});

async function openFigurePicker(paragraphId) {
  let node = null;
  eachNode(source.value, (n) => n.id === paragraphId && (node = n));
  if (!node) return;
  figureTarget.value = node;
  if (figureMedia.value.length) return;
  try {
    figureMedia.value = await rest(
      `animations?select=id,title,animation_key,media_type,image_file_url,youtube_id&media_type=in.(${FIGURE_TYPES.join(",")})&order=title.asc`
    );
  } catch (err) {
    figureTarget.value = null;
    note(`Couldn't load the media library: ${err.message}`, true);
  }
}

function showFigure(node, row, media) {
  if (media?.animation_key)
    node.animation = figureFor({
      ...row,
      animation_key: media.animation_key,
      animation_title: media.title,
    });
  else delete node.animation;
  emit("figure-changed");
}

async function patchFigure(id, patch) {
  const rows = await rest(`paragraphs?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!rows?.length) throw new Error("The database didn't allow this change.");
  return rows[0];
}

async function setFigure(media) {
  const node = figureTarget.value;
  figureTarget.value = null;
  if (!node) return;
  saving.value = true;
  try {
    const [before] = await rest(
      `paragraphs?id=eq.${node.id}&select=animation_id,animation_trigger`
    );
    if (!before) throw new Error("That paragraph no longer exists.");
    const previousFigure = node.animation
      ? { animation_key: node.animation.id, title: node.animation.title }
      : null;
    const row = await patchFigure(node.id, {
      animation_id: media?.id || null,
      animation_trigger: media ? before.animation_trigger || "auto" : null,
    });
    showFigure(node, row, media);
    editUndo.value = [
      ...editUndo.value.slice(-19),
      {
        label: media ? "Change figure" : "Remove figure",
        run: async () =>
          showFigure(node, await patchFigure(node.id, before), previousFigure),
      },
    ];
    lastSavedAt.value = new Date();
    note(
      media
        ? `Figure set to “${media.title || media.animation_key}”.`
        : "Figure removed."
    );
  } catch (err) {
    note(`Couldn't change the figure: ${err.message}`, true);
  } finally {
    saving.value = false;
  }
}

// Provide save handler to child components
provide("changeFigure", openFigurePicker);
provide("saveContent", saveContent);
provide("isCreator", canEdit);

const posAugeX = ref(0);
const posAugeY = ref(0);
let intervalRandom;

onMounted(() => {
  waitInterval = setInterval(() => {
    const _text = document.getElementById("text");
    if (_text) {
      clearInterval(waitInterval);
      waitInterval = null;
      const illuHighlights = document.getElementsByClassName("animationMarker");

      for (const highlight of illuHighlights) {
        const onMouseOver = (event) => addH(event);
        const onMouseLeave = (event) => removeH(event);
        highlight.addEventListener("mouseover", onMouseOver);
        highlight.addEventListener("mouseleave", onMouseLeave);
        markerListeners.push({ highlight, onMouseOver, onMouseLeave });
      }

      triggerSetupTimeout = setTimeout(() => {
        const sectionTriggers = Array.isArray(triggers.value)
          ? triggers.value
          : triggers.value
            ? [triggers.value]
            : [];

        for (const [index, trigger] of sectionTriggers.entries()) {
          ownedScrollTriggers.push(
            ScrollTrigger.create({
              id: `scrollTriggerText-${route.params.slug || "chapter"}-${index}`,
              trigger: trigger,
              start: "top top",
              end: "bottom top",
              srub: 0,
              markers: false,
              onToggle: (self) => {
                if (
                  self.trigger.id == "the-eye-and-retina-1" &&
                  !self.isActive &&
                  self.direction === -1
                ) {
                  store.currentSubChapter = null;
                }
                if (!self.isActive) return;
                store.currentSubChapter = self.trigger.id;
              },
              onUpdate: (self) => {
                store.progress = self.progress;
              },
            })
          );
        }
        // The reading line shows only while the text crosses mid-screen:
        // not over the dark opener, not past the end (OPENBRAIN-91).
        ownedScrollTriggers.push(
          ScrollTrigger.create({
            trigger: "#text",
            start: "top center",
            end: "bottom center",
            toggleClass: { targets: ".reading-line", className: "is-on" },
          })
        );
        ownedScrollTriggers.push(
          ScrollTrigger.create({
            id: `scrollTriggerAll-${route.params.slug || "chapter"}`,
            trigger: "#scroller",
            start: "-=" + (window.innerHeight / 3) * 2 + " +=0",
            end: "bottom top",
            srub: 0,
            markers: false,
            onUpdate: () => {
              store.activeMenu = false;
              store.superScriptActive = false;
            },
          })
        );
      }, 10);
    }
  }, 10);
  let timer = 0;
  intervalRandom = setInterval(() => {
    timer = timer + 15;
    let speedX = 0.00006;
    let speedY = 0.00005;
    let x = noise.simplex2(timer * speedX, timer * speedX);
    let y = noise.simplex2(timer * speedY, timer * speedY);
    posAugeX.value = x * 20;
    posAugeY.value = y * 15;
  }, 15);
});

onBeforeUnmount(() => {
  if (waitInterval !== null) clearInterval(waitInterval);
  if (triggerSetupTimeout !== null) clearTimeout(triggerSetupTimeout);
  clearInterval(intervalRandom);
  for (const trigger of ownedScrollTriggers.splice(0)) trigger.kill();
  for (const { highlight, onMouseOver, onMouseLeave } of markerListeners.splice(
    0
  )) {
    highlight.removeEventListener("mouseover", onMouseOver);
    highlight.removeEventListener("mouseleave", onMouseLeave);
  }
});
</script>

<template>
  <div
    id="container"
    class="absolute top-start z-40 w-full reader:w-text pointer-events-none font-sans"
  >
    <!-- Edit mode (OPENBRAIN-58, 64): off until a creator turns it on. -->
    <button
      v-if="isCreator && !editMode"
      type="button"
      class="edit-toggle"
      @click="editMode = true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        ></path>
        <path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        ></path>
      </svg>
      Edit chapter
    </button>
    <div
      v-if="isCreator && editMode"
      class="edit-bar"
      role="region"
      aria-label="Editing"
    >
      <span class="edit-bar-title"
        >✎ Editing<template v-if="module?.title">
          · {{ module.title }}</template
        ></span
      >
      <span class="edit-bar-status" :class="{ 'is-saving': saving }">{{
        savedLabel
      }}</span>
      <button
        v-if="editUndo.length"
        type="button"
        class="edit-bar-btn"
        @click="undoLastEdit"
      >
        Undo
      </button>
      <a
        v-if="blockPageHref"
        :href="blockPageHref"
        class="edit-bar-btn"
        title="Add, move and delete blocks, images and widgets"
        >Blocks &amp; widgets ↗</a
      >
      <button
        type="button"
        class="edit-bar-btn edit-bar-done"
        @click="editMode = false"
      >
        Done
      </button>
      <span
        v-if="editNote"
        class="edit-bar-note"
        :class="{ 'is-error': editNote.error }"
        role="status"
        >{{ editNote.message }}</span
      >
    </div>
    <MediaPicker
      v-if="canEdit"
      :open="!!figureTarget"
      :media="figureMedia"
      :types="FIGURE_TYPES"
      :current-id="figureCurrentId"
      title="Choose this paragraph's figure"
      @pick="setFigure"
      @remove="setFigure(null)"
      @close="figureTarget = null"
    />

    <HoverImg />
    <!-- Viewport-centre trigger line: dev chrome behind ?markers=1 (OPENBRAIN-31) -->
    <div v-if="showMarkers" class="marker-center" />
    <!-- The reading line on the divider, where figures switch (OPENBRAIN-91) -->
    <div class="reading-line" aria-hidden="true" />
    <!-- Full-bleed stage layer: inline widget stages teleport here at desktop
         widths because main#text clips its horizontal overflow (OPENBRAIN-37).
         Zero height; each stage is absolutely positioned at its slot's offset. -->
    <div :id="STAGE_LAYER_ID" class="reader-stage-layer" />
    <div id="scroller" class="pointer-events-none w-full">
      <main
        id="text"
        class="text pointer-events-auto w-full text-left pt-[calc(var(--reader-topbar-h)+1.25rem)] ml-text z-30 reader:border-l bg-white border-black tracking-wide duration-300 text-black"
      >
        <!-- intro -->
        <section
          v-for="section in source['intro']"
          :key="section.id"
          :id="section.id"
          class="overflow-y-visible prose-measure"
        >
          <div
            class="TN shadow-md border border-black bg-white rounded-full absolute -translate-x-[5.375rem] -translate-y-[0.5625rem] w-28 h-28 flex items-center justify-center"
          >
            <!--
              Runtime-computed rem for the moving dot. Constants are at the
              16px root base (post-62.5%-removal): 1.5625 = 2.5/1.6 and the
              /32 divisor = /20 × 1.6, so newRem × 16px == oldRem × 10px — the
              dot stays the exact same pixel size. This expression builds the
              rem via string concat, so the Phase-1 ÷1.6 codemod could not match
              it (no `Nrem` literal); it is rebased by hand. See
              docs/font-refactor/PLAN.md §Phase 2.
            -->
            <div
              :style="
                'transform: translate(' +
                posAugeX +
                'px, ' +
                posAugeY / 2 +
                'px);' +
                'height: ' +
                (1.5625 - Math.abs(posAugeX.toFixed(2)) / 32) +
                'rem; width: ' +
                (1.5625 - Math.abs(posAugeX.toFixed(2)) / 32) +
                'rem;'
              "
              class="bg-black h-14 w-14 rounded-full translate-x-2"
            />
          </div>

          <!-- Intro title - editable for creators -->
          <EditableBlock
            v-if="canEdit"
            :content="section.sectionTitle || section.title"
            :paragraph-id="`intro-title-${section.id}`"
            :is-creator="canEdit"
            tag="h1"
            :class-name="
              store.imgActive
                ? 'opacity-0 z-40 text-black opacity-100 capitalize'
                : 'z-40 text-black opacity-100 capitalize'
            "
            @save="
              ({ content }) =>
                saveContent({
                  paragraphId: section.id,
                  content,
                  type: 'intro-title',
                })
            "
          />
          <!-- The chapter title now lives in the opener (OPENBRAIN-32), so
               the intro prints its own section heading ("Introduction"). -->
          <h1
            v-else
            :id="`${section.id}-heading`"
            :class="store.imgActive ? 'opacity-0' : ''"
            class="z-40 text-black opacity-100 capitalize"
          >
            {{ section.sectionTitle || section.title }}
          </h1>

          <!-- Authors: chapter data (modules.authors / slug map), not a
               Retina-only block (OPENBRAIN-33). -->
          <span v-if="authors.length" class="font-mono text-small">
            <template v-for="(author, i) in authors" :key="author.name">
              <p class="font-semibold">{{ author.name }}</p>
              <p :class="i < authors.length - 1 ? 'pb-5' : ''">
                {{ author.affiliation }}
              </p>
            </template>
          </span>
          <br v-if="authors.length" />

          <!-- Intro paragraphs. A section with an intro animation (Retina's
               "dragon") wraps them in that animation's scroll trigger. -->
          <span
            v-if="introTriggerId(section)"
            :id="introTriggerId(section)"
            class="animationTrigger block noHighlight"
          >
            <template
              v-for="paragraph in section.paragraphs"
              :key="paragraph.id"
            >
              <EditableBlock
                v-if="canEdit"
                :content="paragraph.text"
                :paragraph-id="paragraph.id"
                :is-creator="canEdit"
                tag="p"
                class-name="P"
                @save="
                  ({ paragraphId, content }) =>
                    saveContent({ paragraphId, content, type: 'intro' })
                "
              />
              <div
                v-else
                :id="paragraph.id"
                :data-paragraph-id="paragraph.id"
                class="P"
                v-html="paragraph.text"
              />
            </template>
          </span>
          <span v-else class="block noHighlight">
            <template
              v-for="paragraph in section.paragraphs"
              :key="paragraph.id"
            >
              <!-- If paragraph contains a heading, render it without wrapping in <p> -->
              <template v-if="canEdit">
                <EditableBlock
                  v-if="!paragraph.hasHeading"
                  :content="paragraph.text"
                  :paragraph-id="paragraph.id"
                  :is-creator="canEdit"
                  tag="p"
                  class-name="P text-black"
                  @save="
                    ({ paragraphId, content }) =>
                      saveContent({ paragraphId, content, type: 'intro' })
                  "
                />
                <EditableBlock
                  v-else
                  :content="paragraph.text"
                  :paragraph-id="paragraph.id"
                  :is-creator="canEdit"
                  tag="div"
                  class-name=""
                  @save="
                    ({ paragraphId, content }) =>
                      saveContent({ paragraphId, content, type: 'intro' })
                  "
                />
              </template>
              <template v-else>
                <div
                  v-if="paragraph.hasHeading"
                  :id="paragraph.id"
                  :data-paragraph-id="paragraph.id"
                  v-html="paragraph.text"
                />
                <div
                  v-else
                  :id="paragraph.id"
                  :data-paragraph-id="paragraph.id"
                  class="P text-black"
                  v-html="paragraph.text"
                />
              </template>
            </template>
          </span>
        </section>

        <!-- text sections -->
        <div
          v-for="(section, index) in topSections"
          :id="toSlug(section.title)"
          :key="section.id || toSlug(section.title)"
          ref="triggers"
          class="trigger prose-measure"
        >
          <Section
            :section="section"
            :index="index"
            :label="sectionLabels[section.id || section.title]"
            :is-creator="canEdit"
          />
        </div>

        <!-- The chapter's references, from the references table, for a
             chapter whose list isn't a section of its own (the Retina keeps
             it in Footnotes): every entry links to its source (OPENBRAIN-92). -->
        <div
          v-if="endReferences.length"
          id="references"
          class="trigger prose-measure chapter-references"
        >
          <h2 class="T subChapter">References</h2>
          <ReferenceList :references="endReferences" />
        </div>

        <!-- End-of-chapter blocks only cancel the wide desktop column's left
             padding. On mobile/tablet they remain within the centered prose
             shell so they cannot introduce horizontal overflow. -->
        <div class="chapter-end-blocks">
          <QuizSection />
          <!-- End-of-chapter callout slot — ChapterView fills this with
               EndOfChapterCallout. Inside TextComp so absolute positioning
               doesn't pull it to the top of the document. -->
          <slot name="end-of-chapter" />
          <!-- Downloads is off until there are real files: its links were
               2023 placeholders (stock videos on Dropbox) shown under every
               chapter. Further reading and footnotes render only for a
               chapter that has them (today only The Retina); the further-
               reading copy is the Retina's Webvision pointer. -->
          <FurtherReading
            v-if="source['furtherReading']?.paragraphs?.length"
            :content="source['furtherReading']"
          />
          <FootNotes
            v-if="source['footNotes']?.notes?.length"
            :content="source['footNotes']"
          />
        </div>
      </main>
      <Points />
    </div>
  </div>
</template>

<style scoped>
.edit-toggle {
  position: fixed;
  top: calc(var(--reader-topbar-h, 3rem) + 0.75rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.1);
  cursor: pointer;
  pointer-events: auto;
}
.edit-bar {
  position: fixed;
  top: calc(var(--reader-topbar-h, 3rem) + 0.75rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  max-width: calc(100vw - 2rem);
  padding: 0.5rem 0.625rem 0.5rem 1rem;
  border-radius: 999px;
  background: rgb(14 19 19);
  color: rgb(243 239 230);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
  pointer-events: auto;
}
.edit-bar-title {
  font-weight: 600;
}
.edit-bar-status {
  color: rgb(243 239 230 / 0.65);
}
.edit-bar-status.is-saving {
  color: rgb(var(--color-warn));
}
.edit-bar-btn {
  padding: 4px 10px;
  border: 1px solid rgb(243 239 230 / 0.3);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-decoration: none;
  cursor: pointer;
}
.edit-bar-btn:hover,
.edit-bar-btn:focus-visible {
  background: rgb(243 239 230 / 0.12);
  outline: none;
}
.edit-bar-done {
  background: rgb(243 239 230);
  color: rgb(14 19 19);
}
.edit-bar-done:hover,
.edit-bar-done:focus-visible {
  background: rgb(var(--color-warn));
}
.edit-bar-note {
  flex-basis: 100%;
  text-align: center;
  text-transform: none;
  letter-spacing: 0;
  font-family: var(--font-ui);
  font-size: 0.8125rem;
}
.edit-bar-note.is-error {
  color: rgb(var(--color-warn));
}
.edit-toggle:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.top-start {
  /* Start below the chapter opener (hero + title/TOC). ChapterOpener
     publishes its measured height as --opener-h (OPENBRAIN-32); the
     fallback is the old hero-only height. */
  top: var(--opener-h, 100vh);
}

.ml-text {
  /* Full-bleed blocks inside the prose column deliberately break out of it
     with -ml-20 / -translate-x-custom. Individually each is fine; collectively
     they extended the document ~145px and gave every chapter a horizontal
     scrollbar. Clip that overhang at the column instead of letting it grow the
     page.

     `clip`, not `hidden`: `hidden` would make this a scroll container and break
     `position: sticky` on the figure pane and the scroll-linked animations.
     See OPENBRAIN-4. */
  overflow-x: clip;
  width: 100%;
  margin-left: 0;
  padding-left: 0.9375rem;
  padding-right: 0.9375rem;
}

.chapter-end-blocks {
  width: 100%;
  margin-left: 0;
}

.reader-stage-layer {
  /* #container is `absolute` and as tall as the prose column, so stages
     positioned from this layer scroll with the text. Width is the real
     content width (helper/appWidth.js), never 100vw, so a stage can't grow
     the page. Above the fixed figure pane (reader:z-30) within #container's
     z-40 context. */
  position: absolute;
  top: 0;
  left: 0;
  width: var(--app-w, 100vw);
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 45;
}

@media (min-width: 768px) {
  .ml-text {
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}
@media (min-width: 1024px) {
  .ml-text {
    /* Prose column width + right-pinned offset both derive from the shared
       --reader-prose-w token (brand.css) so the figure pane and prose can't
       drift. OPENBRAIN-31: 50/50 — prose = 50vw (capped at 890px), the figure
       pane fills the rest. */
    width: var(--reader-prose-w);
    margin-left: calc(100vw - var(--reader-prose-w));
    margin-right: 0;
    max-width: unset;
    padding-left: var(--reader-gutter-l);
    padding-right: var(--reader-gutter-r);
  }

  .chapter-end-blocks {
    width: calc(100% + var(--reader-gutter-l));
    margin-left: calc(-1 * var(--reader-gutter-l));
  }
}
</style>
