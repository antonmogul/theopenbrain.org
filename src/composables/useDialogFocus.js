import { nextTick, onBeforeUnmount, watch } from "vue";

/**
 * Focus for a dialog built on BaseModal, which moves no focus of its own:
 * when it opens, focus goes to `first()`; when it closes, back to whatever
 * had focus before it opened (the opener). `forget()` skips that return,
 * for a dialog that closes by sending focus somewhere on purpose.
 *
 * A dialog opened from a menu item gets the menu's button as its opener: the
 * item that had focus is gone once the dialog has rendered, and the menu puts
 * focus back on its button before then, so a lost opener is read again
 * after the render.
 *
 * @param {() => boolean} isOpen  the dialog's open state
 * @param {() => HTMLElement | null | undefined} first  the element to focus
 */
export function useDialogFocus(isOpen, first) {
  let opener = null;
  const usable = (el) =>
    el && el !== document.body && el.isConnected && el.focus ? el : null;
  const restore = () => {
    if (opener?.isConnected) opener.focus();
    opener = null;
  };
  watch(
    isOpen,
    async (open) => {
      if (!open) return restore();
      opener = usable(document.activeElement);
      await nextTick();
      if (!isOpen()) return;
      if (!opener?.isConnected) opener = usable(document.activeElement);
      first()?.focus();
    },
    { immediate: true }
  );
  onBeforeUnmount(() => isOpen() && restore());
  return {
    forget: () => {
      opener = null;
    },
  };
}
