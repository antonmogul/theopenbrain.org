import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import fixture from "../data/history/sourceContentRepairs.json";
import { historySourceRepairSql } from "../helper/historySourceRepair.mjs";
import {
  contentBlocksToHTML,
  transformModuleToChapterFormat,
} from "../composables/chapterTransform.mjs";
import FurtherReading from "../components/chapter/text/FurtherReading.vue";

function prose(content) {
  const el = document.createElement("div");
  el.innerHTML = contentBlocksToHTML(content.blocks).text;
  for (const sup of el.querySelectorAll("sup")) {
    if (
      /^\d+$/.test(sup.dataset.ref || "") ||
      /^\d+(?:\s*,\s*\d+)*$/.test(sup.textContent)
    )
      sup.remove();
  }
  return el.textContent;
}
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .trim();
}
function markedProse(content) {
  const el = document.createElement("div");
  el.innerHTML = contentBlocksToHTML(content.blocks).text;
  for (const sup of el.querySelectorAll("sup")) {
    const number = sup.dataset.ref || sup.textContent;
    if (/^\d+$/.test(number)) sup.replaceWith(` CITE_${number} `);
  }
  return el.textContent;
}
function citationNumbers(content) {
  const el = document.createElement("div");
  el.innerHTML = contentBlocksToHTML(content.blocks).text;
  return [...el.querySelectorAll("sup")]
    .map((node) => node.dataset.ref || node.textContent)
    .filter((number) => /^\d+$/.test(number))
    .map(Number);
}
function afterContent(row) {
  return (
    fixture.paragraphUpdates.find(
      (u) =>
        u.sectionSlug === row.sectionSlug && u.orderIndex === row.orderIndex
    )?.after.content || row.seedContent
  );
}

describe("audited History source content", () => {
  it("keeps the committed SQL exactly reproducible from source snapshots", () => {
    const sql = readFileSync(
      "supabase/migrations/20261005000000_history_source_content_repairs.sql",
      "utf8"
    );
    expect(sql).toBe(historySourceRepairSql(fixture));
    expect(sql).not.toMatch(
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i
    );
    expect(sql).toContain("pg_constraint");
    expect(sql).toContain("for update of p");
    expect(sql).not.toMatch(/delete[\s\S]{0,80}cascade/i);
    expect(sql).not.toMatch(/update public\.animations/);
  });

  it("matches all 81 source body rows and ordered citations after narrow corrections", () => {
    expect(fixture.bodyParity).toHaveLength(81);
    for (const row of fixture.bodyParity) {
      let expected = row.sourceText;
      if (row.editorialException)
        expected = expected.replace(
          "skulls form these sites",
          "skulls from these sites"
        );
      expect(
        normalize(prose(afterContent(row))),
        `${row.sectionSlug}/${row.orderIndex}`
      ).toBe(normalize(expected));
      expect(
        citationNumbers(afterContent(row)),
        `${row.sectionSlug}/${row.orderIndex} citations`
      ).toEqual(row.sourceCitationNumbers);
      let marked = row.sourceWithCitationMarkers;
      if (row.editorialException)
        marked = marked.replace(
          "skulls form these sites",
          "skulls from these sites"
        );
      expect(
        normalize(markedProse(afterContent(row))),
        `${row.sectionSlug}/${row.orderIndex} citation positions`
      ).toBe(normalize(marked));
    }
  });

  it("restores nine omitted citations in seven paragraphs without rewriting prose", () => {
    const updates = fixture.paragraphUpdates.filter(
      (u) => u.sectionSlug === "where-is-my-mind"
    );
    expect(updates).toHaveLength(7);
    let added = 0;
    for (const update of updates) {
      expect(prose(update.after.content)).toBe(prose(update.before.content));
      added +=
        citationNumbers(update.after.content).length -
        citationNumbers(update.before.content).length;
    }
    expect(added).toBe(9);
  });

  it("recognizes existing quote citations 31/72/77 and adds tooltip hooks without duplicating them", () => {
    const updates = fixture.paragraphUpdates.filter((u) =>
      u.reason.startsWith("Citation already")
    );
    expect(updates).toHaveLength(3);
    for (const update of updates) {
      expect(citationNumbers(update.after.content)).toEqual(
        citationNumbers(update.before.content)
      );
      expect(prose(update.after.content)).toBe(prose(update.before.content));
      expect(contentBlocksToHTML(update.after.content.blocks).text).toContain(
        `data-ref="${update.sourceCitationNumbers[0]}"`
      );
    }
  });

  it("restores all 121 bibliography items, including the split Katz reference, without dropping other entries", () => {
    const update = fixture.paragraphUpdates.find(
      (u) => u.sectionSlug === "references"
    );
    const items = update.after.content.blocks[0].items;
    expect(items).toHaveLength(121);
    expect(fixture.referenceParity).toHaveLength(121);
    for (const row of fixture.referenceParity) {
      const el = document.createElement("div");
      el.innerHTML = items[row.number - 1];
      expect(normalize(el.textContent), `reference ${row.number}`).toBe(
        normalize(row.sourceText)
      );
    }
    expect(fixture.referenceUpdates[0].after.raw_text).toBe(items[78]);
    expect(fixture.referenceUpdates[0].after.year).toBe(2007);
  });

  it("contains exactly three proven title fragments and two truncated title corrections", () => {
    expect(fixture.fragments.map((f) => f.before.content_text)).toEqual([
      "hippocampus minor",
      "Rafferty and Roberts Bartholow",
      "chemoaffinity",
    ]);
    expect(fixture.titles.filter((t) => t.before !== t.after)).toHaveLength(2);
    expect(
      fixture.titles.every((t) =>
        t.after.endsWith(
          fixture.fragments.find((f) => f.sectionSlug === t.sectionSlug).before
            .content_text
        )
      )
    ).toBe(true);
  });

  it("preserves the 28 already-imported manuscript captions and their credits", () => {
    const files = [
      "20260924010000_foundations_manuscript_figures.sql",
      "20260922000000_foundations_fig2_trepanation_frames.sql",
    ];
    let checked = 0;
    for (const file of files) {
      const source = readFileSync(`supabase/migrations/${file}`, "utf8");
      for (const update of source.split("update public.animations").slice(1)) {
        const key = update.match(/where animation_key = '([^']+)'/)[1];
        const number = key.replace("animationFoundationsFig", "");
        const caption = update.match(/'caption', \$fig\$([\s\S]*?)\$fig\$/)[1];
        const candidates = fixture.figureInventory
          .flatMap((group) => group.captions)
          .filter((text) => text.startsWith(`Figure ${number}.`))
          .filter((text) => number !== "K" || text.includes("four humors"));
        expect(candidates).toHaveLength(1);
        expect(normalize(caption)).toBe(
          normalize(candidates[0].replace(/^Figure [\dA-Z]+\.\s*/, ""))
        );
        checked++;
      }
    }
    expect(checked).toBe(28);
  });

  it("retains all 33 source captions across 29 image-bearing groups plus the separate Hippocrates caption", () => {
    expect(fixture.figureInventory).toHaveLength(30);
    expect(
      fixture.figureInventory.filter((group) => group.images.length)
    ).toHaveLength(29);
    expect(
      fixture.figureInventory.flatMap((group) => group.captions)
    ).toHaveLength(33);
    expect(fixture.figures).toHaveLength(3);
    for (const figure of fixture.figures) {
      const bytes = readFileSync(`public${figure.imageFileUrl}`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        figure.sourceImage.sha256
      );
      expect(figure.config.caption).toBe(figure.sourceCaption);
      expect(figure.config.images[0].alt.length).toBeGreaterThan(30);
      expect(figure.imageFileUrl).not.toContain("appendix");
      expect(figure.animationKey).not.toBe("animationFoundationsFigK");
    }
    expect(
      fixture.figures.find((f) => f.animationKey.includes("Hippocrates"))
        .sourceCaption
    ).toContain("British Museum. Source: The Wellcome Collection");
    expect(
      fixture.figures
        .filter((f) => f.animationKey.includes("Penfield"))
        .every((f) =>
          f.sourceCaption.includes("Leblanc, Journal of Neurosurgery, 2021")
        )
    ).toBe(true);
  });
});

describe("chapter-specific Further reading", () => {
  it("transforms and renders the History source sentence and all three citations", () => {
    const fr = fixture.furtherReading;
    const data = transformModuleToChapterFormat({
      title: "History",
      sections: [
        { id: "intro", slug: "introduction", order_index: 0, paragraphs: [] },
        {
          id: "fr",
          slug: fr.sectionSlug,
          title: fr.title,
          order_index: 99,
          paragraphs: [{ id: "fr-p", order_index: 0, ...fr.paragraph }],
        },
      ],
    });
    const wrapper = mount(FurtherReading, {
      props: { content: data.furtherReading },
    });
    expect(wrapper.text()).toContain(
      "For a broader overview of the history of neuroscience, see these resources."
    );
    expect(wrapper.findAll("a").map((a) => a.attributes("href"))).toEqual([
      "#ref-29",
      "#ref-8",
      "#ref-2",
    ]);
    expect(wrapper.text()).not.toContain("retinal");
    expect(wrapper.text()).not.toContain("Webvision");
    wrapper.unmount();
  });
  it("preserves an explicitly supplied Retina Webvision link", () => {
    const wrapper = mount(FurtherReading, {
      props: {
        content: {
          title: "Further reading",
          paragraphs: [
            {
              title: "Universities",
              links: [
                {
                  text: "Webvision of med Utah",
                  url: "https://webvision.med.utah.edu/",
                },
              ],
            },
          ],
        },
      },
    });
    expect(wrapper.find("a").attributes("href")).toBe(
      "https://webvision.med.utah.edu/"
    );
    expect(wrapper.find("a").attributes("rel")).toBe("noopener noreferrer");
    wrapper.unmount();
  });
  it("does not invent Retina content for another chapter or accept executable link URLs", () => {
    const wrapper = mount(FurtherReading, {
      props: {
        content: {
          title: "Resources",
          paragraphs: [
            {
              title: "Author resources",
              links: [{ text: "Invalid link", url: "javascript:alert(1)" }],
            },
          ],
        },
      },
    });
    expect(wrapper.findAll("a")).toHaveLength(0);
    expect(wrapper.text()).toContain("Invalid link");
    expect(wrapper.text()).not.toContain("Webvision");
    wrapper.unmount();
    const empty = mount(FurtherReading, {
      props: { content: { paragraphs: [] } },
    });
    expect(empty.find("section").exists()).toBe(false);
    empty.unmount();
  });
});
