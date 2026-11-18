import { describe, expect, it } from "vitest";
import { mountSection } from "@/test/mountSection";
import ReviewNotesPanel from "../ReviewNotesPanel.vue";
import FeedbackSection from "../FeedbackSection.vue";
import { groupReviewNotes } from "@/helper/reviewNotes.mjs";
import {
  REVIEW_MODULES,
  REVIEW_NOTES,
  REVIEW_SECTIONS,
} from "@/stories/reviewNoteFixtures.js";

const groups = groupReviewNotes(REVIEW_NOTES, REVIEW_MODULES, REVIEW_SECTIONS);
const chapters = REVIEW_MODULES.map((m) => ({ slug: m.slug, title: m.title }));

describe("ReviewNotesPanel (OPENBRAIN-203)", () => {
  it("lists notes by chapter and section with their place, link, change and reply", () => {
    const w = mountSection(ReviewNotesPanel, {
      groups,
      chapters,
      filteredCount: 3,
      openCount: 2,
    });
    expect(w.findAll("h3").map((h) => h.text())).toEqual([
      "Foundations of Neuroscience",
      "The Retina",
    ]);
    expect(w.findAll("h4").map((h) => h.text())).toEqual([
      "Galen and the animal spirits",
      "Introduction",
      "Photoreceptors",
    ]);
    expect(w.text()).toContain("3 notes · 2 open in all");
    const figure = w.find(`[data-review-note="${REVIEW_NOTES[1].id}"]`);
    expect(figure.text()).toContain("Fig 07 · Galen silences a squealing pig");
    expect(figure.text()).toContain("Maura · Designer");
    expect(figure.text()).toContain("1280×800 · two-column");
    expect(figure.find("a").attributes("href")).toBe(
      "/chapter/1/foundations-of-neuroscience#galen"
    );
    expect(figure.find("textarea").element.value).toBe(
      "Flipping it in the next export."
    );
    const content = w.find(`[data-review-note="${REVIEW_NOTES[0].id}"]`);
    expect(content.text()).toContain("Rods outnumber cones about 10 to 1");
    expect(content.text()).toContain("Rods outnumber cones about 20 to 1");
  });

  it("saves only a changed note, once per press, and shows that note's error", async () => {
    const id = REVIEW_NOTES[0].id;
    const w = mountSection(ReviewNotesPanel, {
      groups,
      chapters,
      saveErrors: { [id]: "The note couldn't be saved. Please try again." },
    });
    const note = w.find(`[data-review-note="${id}"]`);
    const save = note.findAll("button").find((b) => b.text() === "Save");
    expect(save.attributes("disabled")).toBeDefined();
    expect(note.find('[role="alert"]').text()).toContain("couldn't be saved");

    await note.find("form select").setValue("question");
    await note.find("textarea").setValue("Which source gives 20 to 1?");
    expect(save.attributes("disabled")).toBeUndefined();
    await save.trigger("click");
    expect(w.emitted("save")).toEqual([
      [{ id, status: "question", reply: "Which source gives 20 to 1?" }],
    ]);

    await w.setProps({ savingIds: [id] });
    expect(save.text()).toBe("Saving…");
    expect(save.attributes("disabled")).toBeDefined();
  });

  it("emits filter changes and refresh, and shows its states", async () => {
    const w = mountSection(ReviewNotesPanel, { chapters });
    expect(w.text()).toContain("No review notes match these filters");
    const [chapter, type, status] = w.findAll(".review-filters select");
    await chapter.setValue("the-retina");
    await type.setValue("bug");
    await status.setValue("done");
    expect(w.emitted("filter-change")).toEqual([
      [{ chapter: "the-retina", type: "all", status: "open" }],
      [{ chapter: "all", type: "bug", status: "open" }],
      [{ chapter: "all", type: "all", status: "done" }],
    ]);
    await w.find("button").trigger("click");
    expect(w.emitted("fetch")).toHaveLength(1);

    await w.setProps({ loading: true });
    expect(w.text()).toContain("Loading review notes");
    await w.setProps({
      loading: false,
      missingTable: true,
      error: "Review notes need a database update",
    });
    expect(w.text()).toContain("Database update needed");
    expect(w.text()).not.toContain("Try again");
    await w.setProps({ accessDenied: true });
    expect(w.text()).toContain("Access denied");
    expect(w.find("select").exists()).toBe(false);
  });

  it("treats a note's text as text", () => {
    const w = mountSection(ReviewNotesPanel, {
      groups: groupReviewNotes(
        [
          {
            ...REVIEW_NOTES[2],
            note: "<img src=x onerror=alert(1)>",
            anchor: { label: "<b>bold</b>" },
          },
        ],
        REVIEW_MODULES,
        REVIEW_SECTIONS
      ),
    });
    expect(w.find("img").exists()).toBe(false);
    expect(w.find("b").exists()).toBe(false);
    expect(w.text()).toContain("<img src=x onerror=alert(1)>");
  });
});

describe("FeedbackSection view switch", () => {
  it("switches between reader messages and the review slot", async () => {
    const w = mountSection(FeedbackSection, { view: "messages" }, {});
    expect(w.text()).toContain("Reader feedback");
    const review = w
      .findAll('[role="radio"]')
      .find((b) => b.text() === "Review notes");
    await review.trigger("click");
    expect(w.emitted("view-change")).toEqual([["review"]]);

    const r = mountSection(FeedbackSection, { view: "review" });
    expect(r.find("h2, h1").text()).toContain("Review notes");
    expect(r.text()).not.toContain("AI summaries are unavailable");
  });
});
