import { defineStore } from "pinia";
import { useAnimation } from "./animation";
import { useCom } from "./comments";

export { useAnimation, useCom };

export const useGeneral = defineStore("main", {
  state: () => ({
    activeMenu: false,
    activeAbout: false,
    expandedChapterId: null,
    hasBeenVisited:
      localStorage.hasBeenVisited &&
      Math.abs(localStorage?.hasBeenVisited - Date.now()) /
        (24 * 60 * 60 * 1000) <
        1
        ? true
        : false,
    superScriptActive: false,
    animationActive: false,
    legendIsActive: false,
    startIsActive: true,
    activeMenuIndex: null,
    activeSidebar: false,
    imgActive: false,
    currentSubChapter: null,
    progress: 0,
    isScrolling: false,
    isNextBack: false,
    savedPosition: undefined,
  }),
  getters: {},
  actions: {
    unSetMenu() {
      this.activeMenu = false;
    },
    changeMenuIndex(index) {
      if (this.activeMenuIndex === index) {
        this.activeMenuIndex = null;
      } else {
        this.activeMenuIndex = index;
      }
    },
    toggle(_target) {
      this[_target] = !this[_target];
    },
  },
});

/*
 * The chapter tree the reader renders. Starts empty: ChapterView replaces it
 * wholesale with the Supabase-transformed chapter via updateText("*", …).
 * The Chapter 1 JSON used to be the initial value (112 KB in the bundle for
 * a state that was always overwritten) — OPENBRAIN-33 dropped it; the file
 * remains only as the importer script's source.
 */
function readCachedText() {
  try {
    const raw = localStorage.getItem("sections");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useText = defineStore("text", {
  state: () => ({
    text: readCachedText(),
    currentId: null,
  }),
  getters: {},
  actions: {
    updateText(part, textNew) {
      if (part != "*") {
        this.text[part] = textNew;
        let _newLoaclText = JSON.stringify(this.text);
        localStorage.setItem("sections", _newLoaclText);
      } else {
        // Use $patch to ensure proper reactivity in Pinia
        this.$patch((state) => {
          state.text = textNew;
        });
        // Also update localStorage when replacing all text (switching chapters)
        localStorage.setItem("sections", JSON.stringify(textNew));
      }
    },
  },
});
