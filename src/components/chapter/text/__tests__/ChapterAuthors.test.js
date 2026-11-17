import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ChapterAuthors from "../ChapterAuthors.vue";
import { authorCardsForModule } from "@/helper/chapterAuthors";

/*
 * Stuart, 11 Nov (OPENBRAIN-197): "For chapter authors, add a circle to the
 * left of the name/affiliation with the face. And when clicked on, should
 * take you to the author's lab site. I'll get Maura to work on face images."
 */
const AUTHORS = authorCardsForModule({
  slug: "foundations-of-neuroscience",
  authors: [
    {
      name: "Naguib Mechawar",
      affiliation: "Douglas Mental Health University Institute",
    },
    {
      name: "Stuart Trenholm",
      affiliation: "Montreal Neurological Institute, McGill University",
      photo: "/publicAssets/images/authors/stuart-trenholm.webp",
    },
    { name: "A. Guest", affiliation: "Somewhere" },
  ],
});
const mountAuthors = () =>
  mount(ChapterAuthors, { props: { authors: AUTHORS } });

describe("ChapterAuthors", () => {
  it("renders each author as one link to their lab site, in a new tab", () => {
    const rows = mountAuthors().findAll('[data-testid="chapter-author"]');
    expect(rows).toHaveLength(3);
    const [naguib, stuart] = rows;
    expect(naguib.element.tagName).toBe("A");
    expect(naguib.attributes("href")).toBe(
      "https://douglas.research.mcgill.ca/naguib-mechawar"
    );
    expect(naguib.attributes("target")).toBe("_blank");
    expect(naguib.attributes("rel")).toBe("noopener noreferrer");
    expect(stuart.attributes("href")).toBe("https://www.trenholmlab.com");
    // The circle is inside the link: pressing the face goes there too.
    expect(naguib.find(".chapter-author__face").exists()).toBe(true);
    // The name says where the link goes; the face is decoration.
    expect(naguib.get(".chapter-author__name").text()).toBe(
      "Naguib Mechawar, lab site (opens in a new tab)"
    );
    expect(naguib.get(".chapter-author__face").attributes("aria-hidden")).toBe(
      "true"
    );
    expect(naguib.get(".chapter-author__affiliation").text()).toBe(
      "Douglas Mental Health University Institute"
    );
  });

  it("shows initials in the circle until there is a photo", () => {
    const [naguib, stuart] = mountAuthors().findAll(
      '[data-testid="chapter-author"]'
    );
    expect(naguib.find("img").exists()).toBe(false);
    expect(naguib.get(".chapter-author__initials").text()).toBe("NM");
    const photo = stuart.get("img");
    expect(photo.attributes("src")).toBe(
      "/publicAssets/images/authors/stuart-trenholm.webp"
    );
    expect(photo.attributes("alt")).toBe("");
    expect(stuart.find(".chapter-author__initials").exists()).toBe(false);
  });

  it("falls back to initials when the photo does not load", async () => {
    const stuart = mountAuthors().findAll('[data-testid="chapter-author"]')[1];
    await stuart.get("img").trigger("error");
    expect(stuart.find("img").exists()).toBe(false);
    expect(stuart.get(".chapter-author__initials").text()).toBe("ST");
  });

  it("an author without a site is text, not a link", () => {
    const guest = mountAuthors().findAll('[data-testid="chapter-author"]')[2];
    expect(guest.element.tagName).toBe("DIV");
    expect(guest.attributes("href")).toBeUndefined();
    expect(guest.get(".chapter-author__name").text()).toBe("A. Guest");
    expect(guest.get(".chapter-author__initials").text()).toBe("AG");
  });

  it("renders nothing for a chapter without authors", () => {
    const wrapper = mount(ChapterAuthors, { props: { authors: [] } });
    expect(wrapper.find('[data-testid="chapter-authors"]').exists()).toBe(
      false
    );
  });
});
