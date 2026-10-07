/*
 * DeckImageField (OPENBRAIN-129 review): the preview tries a new address
 * after a failed one; an upload that finishes after its slide's form is gone
 * still lands on that slide; and an imageSrc field gives its id to the
 * address input only.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const { uploadDeckImage } = vi.hoisted(() => ({ uploadDeckImage: vi.fn() }));
vi.mock("@/services/api/storage", async (importOriginal) => ({
  ...(await importOriginal()),
  uploadDeckImage,
}));

import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { fieldId } from "@/data/decks/validate.js";
import DeckImageField from "../DeckImageField.vue";
import { DECK_UPDATE_ENTRY } from "../fieldPaths.js";

const DECK = "0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f";
const heroImage = LAYOUT_SCHEMAS.hero.fields.image;
const screenSrc = LAYOUT_SCHEMAS.phones.fields.screens.of.src;

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.clearAllMocks();
});

const mountImage = (props, provide = {}) => {
  wrapper = mount(DeckImageField, {
    props: {
      descriptor: heroImage,
      path: "props.image",
      slideId: "intro",
      problems: [],
      deckId: DECK,
      ...props,
    },
    global: { provide },
    attachTo: document.body,
  });
  return wrapper;
};
const file = { name: "stuart_trenholm.jpg", type: "image/jpeg", size: 1000 };

describe("DeckImageField", () => {
  it("tries a new address after one that failed to load", async () => {
    const w = mountImage({ value: { src: "/bad.png", alt: "" } });
    await w.get(".deck-image-field__preview img").trigger("error");
    expect(w.find(".deck-image-field__preview img").exists()).toBe(false);
    expect(w.text()).toContain("This image doesn't load");

    await w.setProps({ value: { src: "/publicAssets/good.png", alt: "" } });
    expect(w.get(".deck-image-field__preview img").attributes("src")).toBe(
      "/publicAssets/good.png"
    );
    // The address that failed is remembered: it isn't fetched again.
    await w.setProps({ value: { src: "/bad.png", alt: "x" } });
    expect(w.find(".deck-image-field__preview img").exists()).toBe(false);
  });

  // The editor as the field sees it: its writes, the slide on screen and
  // each slide's entry.
  const editorWith = ({ selected = "team", entries = {} } = {}) => ({
    updateEntry: vi.fn(),
    selectedId: () => selected,
    entryOf: (id) => entries[id] ?? { id, props: {} },
  });
  // `meanwhile` runs after the field has gone and before the upload ends.
  async function startUpload(props, editor, meanwhile) {
    let finish;
    uploadDeckImage.mockReturnValue(new Promise((r) => (finish = r)));
    const w = mountImage(props, { [DECK_UPDATE_ENTRY]: editor });
    const input = w.get('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    // The field unmounts mid-upload.
    w.unmount();
    wrapper = null;
    await meanwhile?.();
    finish({ src: "https://x.supabase.co/storage/v1/object/public/a.jpg" });
    await flushPromises();
  }

  it("writes an upload by slide id when the form is gone before it finishes", async () => {
    const editor = editorWith({ selected: "team" });
    await startUpload({ value: { src: "", alt: "" } }, editor);
    expect(uploadDeckImage).toHaveBeenCalledWith(file, { deckId: DECK });
    expect(editor.updateEntry.mock.calls).toEqual([
      [
        "intro",
        "props.image.src",
        "https://x.supabase.co/storage/v1/object/public/a.jpg",
      ],
      ["intro", "props.image.figure", undefined],
      ["intro", "props.image.alt", "stuart trenholm"],
    ]);
  });

  it("drops it when the field went with its slide still on screen", async () => {
    // The list item (or the layout) went: its place now belongs to another.
    const editor = editorWith({ selected: "intro" });
    await startUpload({ value: { src: "", alt: "" } }, editor);
    expect(editor.updateEntry).not.toHaveBeenCalled();
  });

  it("writes it when the creator is back on its slide before it finishes", async () => {
    // Away to another slide and back: a new field shows the same address.
    const editor = editorWith({ selected: "intro" });
    await startUpload({ value: { src: "", alt: "" } }, editor, () => {
      mountImage(
        { value: { src: "", alt: "" } },
        { [DECK_UPDATE_ENTRY]: editor }
      );
    });
    expect(editor.updateEntry.mock.calls[0]).toEqual([
      "intro",
      "props.image.src",
      "https://x.supabase.co/storage/v1/object/public/a.jpg",
    ]);
  });

  it("drops it when the slide changed layout or got another image meanwhile", async () => {
    const entry = { id: "intro", layout: "hero", props: { image: {} } };
    const editor = editorWith({ selected: "team", entries: { intro: entry } });
    await startUpload({ value: { src: "", alt: "" } }, editor, () => {
      entry.layout = "text";
    });
    expect(editor.updateEntry).not.toHaveBeenCalled();

    entry.layout = "hero";
    await startUpload({ value: { src: "", alt: "" } }, editor, () => {
      entry.props.image = { src: "/publicAssets/typed-meanwhile.png" };
    });
    expect(editor.updateEntry).not.toHaveBeenCalled();
  });

  it("drops it when another list item now sits at its path", async () => {
    const path = "props.screens.0.src";
    const mine = { heading: "Reader", src: "", alt: "" };
    const editor = editorWith({
      selected: "t11-phones-other",
      entries: {
        "t11-phones": {
          id: "t11-phones",
          props: { screens: [{ heading: "Someone else", src: "", alt: "" }] },
        },
      },
    });
    await startUpload(
      {
        descriptor: screenSrc,
        path,
        slideId: "t11-phones",
        value: "",
        context: mine,
      },
      editor
    );
    expect(editor.updateEntry).not.toHaveBeenCalled();

    // Still the same item: written there.
    const same = editorWith({
      selected: "other",
      entries: {
        "t11-phones": { id: "t11-phones", props: { screens: [mine] } },
      },
    });
    await startUpload(
      {
        descriptor: screenSrc,
        path,
        slideId: "t11-phones",
        value: "",
        context: mine,
      },
      same
    );
    expect(same.updateEntry.mock.calls[0]).toEqual([
      "t11-phones",
      path,
      "https://x.supabase.co/storage/v1/object/public/a.jpg",
    ]);
  });

  it("emits as usual while the field is still there", async () => {
    uploadDeckImage.mockResolvedValue({ src: "/u.jpg" });
    const editor = editorWith();
    const w = mountImage(
      { value: { src: "", alt: "Kept" } },
      { [DECK_UPDATE_ENTRY]: editor }
    );
    const input = w.get('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await flushPromises();
    expect(editor.updateEntry).not.toHaveBeenCalled();
    expect(w.emitted("update").at(-1)).toEqual([
      "props.image",
      { src: "/u.jpg", alt: "Kept" },
    ]);
  });

  it("gives an imageSrc field's id to its address input only", () => {
    const path = "props.screens.0.src";
    mountImage({
      descriptor: screenSrc,
      path,
      slideId: "t11-phones",
      value: "",
      context: { heading: "A", src: "" },
    });
    const id = fieldId("t11-phones", path);
    expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
    const el = document.getElementById(id);
    expect(el.tagName).toBe("INPUT");
    expect(el.type).toBe("url");
  });
});
