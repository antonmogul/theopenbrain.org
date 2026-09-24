/*
 * Load a figure widget's Lottie into its stage (OPENBRAIN-80, -81).
 *
 * - A later load supersedes an earlier one still in flight, so a figure
 *   never ends up with two animations in one stage.
 * - A failure sets `failed` (the widget says so on its stage) and logs the
 *   figure and URL, rather than leaving an empty stage.
 */
import { ref } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { fetchLottie, prepareLottie } from "../content.js";

/**
 * @param {import('vue').Ref<HTMLElement|null>} stage
 * @param {string} id the figure, for logs
 */
export function useFigureLottie(stage, id) {
  const failed = ref(false);
  let anim = null;
  let token = 0;

  /** Resolves with the animation, or null if it failed or was superseded. */
  async function mount(url, { replace = {}, loop = false } = {}) {
    const mine = ++token;
    anim?.destroy();
    anim = null;
    failed.value = false;
    if (!stage.value) {
      failed.value = true;
      console.warn(`[${id}] no stage to draw ${url} into`);
      return null;
    }
    try {
      const data = prepareLottie(await fetchLottie(url), url, replace);
      const lottie = await loadLottie();
      if (mine !== token || !stage.value) return null;
      anim = lottie.loadAnimation({
        container: stage.value,
        renderer: "svg",
        loop,
        autoplay: false,
        animationData: data,
      });
      anim.setSubframe(true);
      return anim;
    } catch (err) {
      if (mine !== token) return null;
      failed.value = true;
      console.error(`[${id}] the animation didn't load: ${err.message}`, err);
      return null;
    }
  }

  function destroy() {
    token++;
    anim?.destroy();
    anim = null;
  }

  return {
    failed,
    mount,
    destroy,
    get anim() {
      return anim;
    },
  };
}
