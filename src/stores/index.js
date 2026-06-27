import { defineStore } from "pinia";
import jsonText from "@/assets/json_backend/text.json";
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

export const useText = defineStore("text", {
  state: () => ({
    text: localStorage.sections ? JSON.parse(localStorage.sections) : jsonText,
    source: jsonText,
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
