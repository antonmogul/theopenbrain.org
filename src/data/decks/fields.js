/**
 * What each slide layout can hold (OPENBRAIN-129): one field schema per
 * layout in src/components/deck/slides/layouts.js. The deck editor builds its
 * form from these, and validate.js normalises and checks deck entries against
 * them. Plain data and small functions; nothing here imports Vue.
 *
 * A descriptor is { type, label, ...options } (spec section 4.2):
 *   semantic        what the text is on the slide (eyebrow, title, body,
 *                   caption, credit, image, name, meta); book decks will map
 *                   chapter content onto it later
 *   required        the component requires it (matches defineProps)
 *   maxChars        a soft limit: over it is a warning, not an error
 *   hint, placeholder
 *   options         enum: [{ value, label }]; icon, roleColor and position
 *                   carry theirs too
 *   default         enum: the component's default value
 *   min, max        list and strings length (hard: what the grid can hold);
 *                   int: the range (hard: outside it is an error, and
 *                   normalising clamps to it so a slide always renders)
 *   designCount     list: the count the layout is drawn for (a warning)
 *   uniqueBy        list of objects: the key that must not repeat (it keys
 *                   the component's v-for); strings: `unique: true`
 *   itemLabel       (item, i) => string, the title of a list item's card
 *   of              list: { [key]: descriptor } per item
 *   fields          group / optional: { [key]: descriptor }
 *   off             optional: what "off" stores, 'null' or 'omit'
 *   defaults        optional: the values set when it is switched on
 *   altKey, placeholderKey   imageSrc: sibling keys edited with the image
 *   placeholderField image: show the placeholder input (default true)
 *   smart           text types: smart punctuation on blur (default true)
 *   multiline       strings: each item is a textarea
 *   warnEmpty       image / imageSrc / mediaUrl: warn when empty that the
 *                   placeholder will show (default true; off for a poster)
 *   showWhen        (containing object) => boolean: hidden fields have no
 *                   effect on the slide
 *
 * Each layout: { label, group: 'Funding'|'Templates', tone: 'dark'|'paper',
 * description, fields, rules? }. `rules` are layout-specific warnings,
 * (props) => [{ path, code, message }] with paths relative to props.
 *
 * Invariant (src/data/decks/__tests__/fields.test.js): the keys of `fields`
 * are the component's props, and `required` matches the component's.
 */
import { summaryFromCounts } from "./text.js";

/** The glyphs DeckIcon draws (DashboardNavIcon's, plus globe and code). */
export const ICON_NAMES = Object.freeze([
  "grid",
  "book",
  "layers",
  "image",
  "widget",
  "quiz",
  "flashcard",
  "highlight",
  "notes",
  "chart",
  "users",
  "folder",
  "clipboard",
  "graduation",
  "share",
  "settings",
  "globe",
  "code",
]);

/** The four role colours (.deck-role--* in deck.css). */
export const ROLE_OPTIONS = Object.freeze([
  { value: "creator", label: "Creator" },
  { value: "professor", label: "Professor" },
  { value: "student", label: "Student" },
  { value: "public", label: "Public" },
]);

/** Headshot crop (object-position). */
export const POSITION_OPTIONS = Object.freeze([
  { value: "center top", label: "Top" },
  { value: "center", label: "Centre" },
  { value: "center bottom", label: "Bottom" },
]);

const ICON_OPTIONS = ICON_NAMES.map((name) => ({
  value: name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
}));

// ── descriptor constructors ────────────────────────────────────────────────
const field =
  (type, preset = {}) =>
  (label, opts = {}) => ({ type, label, ...preset, ...opts });

export const text = field("text");
export const longtext = field("longtext");
export const bool = field("bool");
export const int = field("int");
export const icon = field("icon", { options: ICON_OPTIONS });
export const roleColor = field("roleColor", { options: ROLE_OPTIONS });
export const image = field("image", { placeholderField: true });
export const imageSrc = field("imageSrc");

// A trajectory count: one bar per chapter. The book plans a few dozen; the
// cap keeps a typo (or a paste) from asking the slide for millions of bars,
// which would hang the preview, the rail and /deck.
const CHAPTER_COUNT = { min: 0, max: 200 };
export const position = field("position", { options: POSITION_OPTIONS });
export const mediaUrl = field("mediaUrl");
export const strings = field("strings");
export const enumOf = (label, options, opts = {}) => ({
  type: "enum",
  label,
  options,
  ...opts,
});
export const list = (label, of, opts = {}) => ({
  type: "list",
  label,
  of,
  ...opts,
});
export const group = (label, fields, opts = {}) => ({
  type: "group",
  label,
  fields,
  ...opts,
});
export const optional = (label, fields, opts = {}) => ({
  type: "optional",
  label,
  fields,
  off: "null",
  ...opts,
});

// ── shared fields ──────────────────────────────────────────────────────────
const eyebrow = () =>
  text("Eyebrow", {
    semantic: "eyebrow",
    maxChars: 40,
    hint: "Small line above the title, e.g. “02 · Team”",
  });
const title = (maxChars) =>
  text("Title", { semantic: "title", required: true, maxChars });

const QUOTE_MARKS = /^\s*["“”„«‹'‘’].*["“”»›'‘’]\s*$/s;
const quoteMarksRule = (props) =>
  typeof props.quote === "string" && QUOTE_MARKS.test(props.quote)
    ? [
        {
          path: "quote",
          code: "W_QUOTE_MARKS",
          message: "The slide adds the quote marks; take them out of the text.",
        },
      ]
    : [];

const COUNT_KEYS = ["live", "inProgress", "funded", "unfunded"];

// ── layouts ────────────────────────────────────────────────────────────────
export const LAYOUT_SCHEMAS = {
  hero: {
    label: "Title / closing",
    group: "Funding",
    tone: "dark",
    description:
      "Dark slide with a full-height image on the right: the opening and closing slides.",
    fields: {
      brand: bool("Show the Open Brain mark", {
        hint: "Replaces the eyebrow",
      }),
      eyebrow: { ...eyebrow(), showWhen: (p) => !p?.brand },
      kicker: text("Kicker", {
        semantic: "meta",
        maxChars: 40,
        hint: "Teal line above the title",
      }),
      title: title(48),
      size: enumOf(
        "Title size",
        [
          { value: "display", label: "Display · opening slide" },
          { value: "large", label: "Large" },
        ],
        { default: "large" }
      ),
      lead: longtext("Lead", { semantic: "body", maxChars: 160 }),
      footnote: text("Footnote", {
        semantic: "meta",
        maxChars: 90,
        showWhen: (p) => !p?.person,
      }),
      person: optional(
        "Contact",
        {
          name: text("Name", {
            semantic: "name",
            required: true,
            maxChars: 40,
          }),
          role: text("Role", { semantic: "meta", maxChars: 60 }),
        },
        { off: "null", hint: "Shown at the bottom instead of the footnote" }
      ),
      image: image("Image", { semantic: "image" }),
    },
    rules: [
      (props) =>
        props.size === "display" &&
        typeof props.title === "string" &&
        [...props.title].length > 24
          ? [
              {
                path: "title",
                code: "W_HERO_TITLE",
                message:
                  "A display title over 24 characters may not fit; use the Large size.",
              },
            ]
          : [],
    ],
  },

  team: {
    label: "Team",
    group: "Funding",
    tone: "paper",
    description: "One column per person: headshot, name and role.",
    fields: {
      eyebrow: eyebrow(),
      title: title(40),
      people: list(
        "People",
        {
          name: text("Name", {
            semantic: "name",
            required: true,
            maxChars: 40,
            hint: "Also the headshot’s alt text and placeholder",
          }),
          role: text("Role", { semantic: "meta", maxChars: 60 }),
          photo: imageSrc("Headshot", { semantic: "image" }),
          photoPosition: position("Crop", {
            showWhen: (person) => Boolean(person?.photo),
          }),
        },
        {
          required: true,
          min: 1,
          max: 6,
          uniqueBy: "name",
          itemLabel: (person, i) => person?.name || `Person ${i + 1}`,
        }
      ),
    },
  },

  video: {
    label: "Video",
    group: "Funding",
    tone: "paper",
    description: "A title row over a full-width video.",
    fields: {
      eyebrow: eyebrow(),
      title: title(40),
      aside: text("Aside", {
        semantic: "meta",
        maxChars: 60,
        hint: "Right-aligned line beside the title",
      }),
      src: mediaUrl("Video", {
        hint: "MP4 (H.264) under /publicAssets/… or a Supabase Storage URL",
      }),
      poster: imageSrc("Poster image", { semantic: "image", warnEmpty: false }),
      placeholder: text("Placeholder", {
        maxChars: 40,
        hint: "Shown until the video is set",
        placeholder: "Feature walkthrough video",
      }),
    },
  },

  audience: {
    label: "Audiences",
    group: "Funding",
    tone: "paper",
    description:
      "The kinds of users side by side: a colour block per role over its value and features.",
    fields: {
      eyebrow: eyebrow(),
      title: title(40),
      roles: list(
        "Roles",
        {
          role: roleColor("Colour", { required: true }),
          icon: icon("Icon", { required: true }),
          audience: text("Audience", { semantic: "meta", maxChars: 30 }),
          name: text("Name", {
            semantic: "title",
            required: true,
            maxChars: 20,
          }),
          value: longtext("Value", { semantic: "body", maxChars: 100 }),
          features: strings("Features", {
            semantic: "caption",
            min: 0,
            max: 6,
            unique: true,
            maxChars: 24,
          }),
        },
        {
          required: true,
          min: 1,
          max: 4,
          uniqueBy: "role",
          itemLabel: (role, i) => role?.name || `Role ${i + 1}`,
        }
      ),
    },
  },

  trajectory: {
    label: "Trajectory",
    group: "Funding",
    tone: "paper",
    description:
      "A three-step timeline over one bar per chapter, coloured by status.",
    fields: {
      eyebrow: eyebrow(),
      title: title(40),
      milestones: list(
        "Milestones",
        {
          when: text("When", {
            semantic: "meta",
            required: true,
            maxChars: 12,
          }),
          heading: text("Heading", {
            semantic: "title",
            required: true,
            maxChars: 40,
          }),
          detail: longtext("Detail", { semantic: "body", maxChars: 90 }),
          highlight: bool("Highlight (current step)"),
          later: bool("Muted (future step)"),
        },
        {
          required: true,
          min: 1,
          max: 3,
          designCount: 3,
          uniqueBy: "when",
          itemLabel: (m, i) => m?.when || `Milestone ${i + 1}`,
        }
      ),
      summary: text("Summary", {
        semantic: "body",
        maxChars: 60,
        hint: "The sentence over the chapter strip",
      }),
      chapters: group(
        "Chapters",
        {
          live: int("Live", { required: true, ...CHAPTER_COUNT }),
          inProgress: int("In progress", { required: true, ...CHAPTER_COUNT }),
          funded: int("Funded", { required: true, ...CHAPTER_COUNT }),
          unfunded: int("Unfunded", { required: true, ...CHAPTER_COUNT }),
        },
        { required: true, hint: "One bar per chapter, in this order" }
      ),
      legend: optional(
        "Legend",
        {
          live: text("Live", { maxChars: 24 }),
          inProgress: text("In progress", { maxChars: 24 }),
          funded: text("Funded", { maxChars: 24 }),
          unfunded: text("Unfunded", { maxChars: 24 }),
        },
        {
          off: "omit",
          // All four are stored when on: a partial object would replace the
          // component's default and leave its other labels empty.
          defaults: {
            live: "Live",
            inProgress: "By end of 2026",
            funded: "Funded · 2027",
            unfunded: "Unfunded",
          },
          hint: "Off: the standard labels",
        }
      ),
    },
    rules: [
      (props) => {
        const out = [];
        const c = props.chapters;
        const valid =
          c && COUNT_KEYS.every((k) => Number.isInteger(c[k]) && c[k] >= 0);
        if (valid && COUNT_KEYS.every((k) => c[k] === 0))
          out.push({
            path: "chapters",
            code: "W_EMPTY_STRIP",
            message: "The chapter counts add up to 0, so the strip is empty.",
          });
        if (
          valid &&
          typeof props.summary === "string" &&
          props.summary.trim() &&
          props.summary.trim() !== summaryFromCounts(c)
        )
          out.push({
            path: "summary",
            code: "W_SUMMARY",
            message: `The summary doesn’t match the counts (“${summaryFromCounts(c)}”).`,
          });
        (Array.isArray(props.milestones) ? props.milestones : []).forEach(
          (m, i) => {
            if (m?.highlight === true && m?.later === true)
              out.push({
                path: `milestones.${i}.later`,
                code: "W_HIGHLIGHT_LATER",
                message: `Milestone ${i + 1} is both highlighted and muted.`,
              });
          }
        );
        return out;
      },
    ],
  },

  role: {
    label: "Role detail",
    group: "Funding",
    tone: "paper",
    description:
      "One role in depth: its icon, name and value beside six feature cards.",
    fields: {
      role: roleColor("Colour", { required: true }),
      eyebrow: eyebrow(),
      icon: icon("Icon", { required: true }),
      name: text("Name", { semantic: "title", required: true, maxChars: 20 }),
      value: longtext("Value", { semantic: "body", maxChars: 100 }),
      features: list(
        "Features",
        {
          icon: icon("Icon", { required: true }),
          name: text("Name", {
            semantic: "title",
            required: true,
            maxChars: 28,
          }),
          detail: longtext("Detail", { semantic: "body", maxChars: 70 }),
        },
        {
          required: true,
          min: 1,
          max: 6,
          designCount: 6,
          uniqueBy: "name",
          itemLabel: (f, i) => f?.name || `Feature ${i + 1}`,
        }
      ),
    },
  },

  section: {
    label: "Section divider",
    group: "Templates",
    tone: "dark",
    description: "A dark divider between parts of the deck.",
    fields: {
      eyebrow: eyebrow(),
      number: text("Number", { semantic: "meta", maxChars: 4 }),
      title: title(40),
      lead: longtext("Lead", { semantic: "body", maxChars: 80 }),
    },
  },

  text: {
    label: "Text",
    group: "Templates",
    tone: "paper",
    description: "A text-heavy slide: lead, paragraphs and a sidebar note.",
    fields: {
      eyebrow: eyebrow(),
      title: title(60),
      lead: longtext("Lead", { semantic: "body", maxChars: 120 }),
      paragraphs: strings("Paragraphs", {
        semantic: "body",
        min: 0,
        max: 4,
        maxChars: 260,
        multiline: true,
      }),
      note: optional(
        "Sidebar note",
        {
          label: text("Label", { semantic: "meta", maxChars: 16 }),
          text: longtext("Text", { semantic: "body", maxChars: 80 }),
        },
        { off: "null" }
      ),
    },
  },

  columns: {
    label: "Columns",
    group: "Templates",
    tone: "paper",
    description:
      "Numbered text columns: two or three in a row, four as two by two.",
    fields: {
      eyebrow: eyebrow(),
      title: title(60),
      items: list(
        "Columns",
        {
          heading: text("Heading", {
            semantic: "title",
            required: true,
            maxChars: 24,
          }),
          text: longtext("Text", { semantic: "body", maxChars: 140 }),
        },
        {
          required: true,
          min: 2,
          max: 4,
          itemLabel: (c, i) => c?.heading || `Column ${i + 1}`,
          hint: "Numbered 01–04 on the slide",
        }
      ),
    },
  },

  statement: {
    label: "Statement",
    group: "Templates",
    tone: "paper",
    description: "One statement or quotation that carries the slide.",
    fields: {
      eyebrow: eyebrow(),
      quote: longtext("Statement", {
        semantic: "body",
        required: true,
        maxChars: 120,
        hint: "The slide adds the quote marks",
      }),
      name: text("Name", { semantic: "name", maxChars: 40 }),
      role: text("Role", { semantic: "meta", maxChars: 50 }),
    },
    rules: [quoteMarksRule],
  },

  imageText: {
    label: "Image and text",
    group: "Templates",
    tone: "paper",
    description: "A headline and paragraph beside a full-height image.",
    fields: {
      eyebrow: eyebrow(),
      title: title(50),
      text: longtext("Text", { semantic: "body", maxChars: 140 }),
      credit: text("Credit", { semantic: "credit", maxChars: 40 }),
      image: image("Image", { semantic: "image" }),
    },
  },

  figures: {
    label: "Key figures",
    group: "Templates",
    tone: "paper",
    description:
      "Three key figures; the middle one is in the accent colour. Real, sourced numbers only.",
    fields: {
      eyebrow: eyebrow(),
      title: title(50),
      figures: list(
        "Figures",
        {
          value: text("Value", {
            semantic: "title",
            required: true,
            maxChars: 6,
          }),
          label: text("Label", {
            semantic: "caption",
            required: true,
            maxChars: 30,
          }),
        },
        {
          required: true,
          min: 1,
          max: 3,
          designCount: 3,
          itemLabel: (f, i) => f?.value || `Figure ${i + 1}`,
          hint: "The middle one is in the accent colour",
        }
      ),
      source: text("Source", { semantic: "credit", maxChars: 60 }),
    },
  },

  screen: {
    label: "Screen",
    group: "Templates",
    tone: "paper",
    description: "One product screen in a browser, tablet or phone frame.",
    fields: {
      wide: bool("Full-width browser"),
      device: enumOf(
        "Device",
        [
          { value: "browser", label: "Browser" },
          { value: "phone", label: "Phone" },
          { value: "tablet", label: "Tablet" },
        ],
        { default: "browser", showWhen: (p) => !p?.wide }
      ),
      eyebrow: eyebrow(),
      title: title(50),
      text: longtext("Text", { semantic: "body", maxChars: 120 }),
      // The full-width layout has no room for them.
      details: strings("Details", {
        semantic: "caption",
        min: 0,
        max: 5,
        unique: true,
        maxChars: 40,
        showWhen: (p) => !p?.wide,
      }),
      screen: image("Screen", { semantic: "image" }),
    },
  },

  phones: {
    label: "Phones",
    group: "Templates",
    tone: "paper",
    description: "Up to three phone screens in a row, each with a caption.",
    fields: {
      eyebrow: eyebrow(),
      title: title(50),
      screens: list(
        "Screens",
        {
          heading: text("Heading", {
            semantic: "title",
            required: true,
            maxChars: 24,
          }),
          caption: text("Caption", { semantic: "caption", maxChars: 40 }),
          src: imageSrc("Screen", {
            semantic: "image",
            altKey: "alt",
            placeholderKey: "placeholder",
          }),
        },
        {
          required: true,
          min: 1,
          max: 3,
          itemLabel: (s, i) => s?.heading || `Screen ${i + 1}`,
        }
      ),
    },
  },

  devices: {
    label: "All devices",
    group: "Templates",
    tone: "paper",
    description: "Browser, tablet and phone together.",
    fields: {
      eyebrow: eyebrow(),
      title: title(50),
      screens: group("Screens", {
        browser: image("Browser", {
          semantic: "image",
          placeholderField: false,
        }),
        tablet: image("Tablet", { semantic: "image", placeholderField: false }),
        phone: image("Phone", { semantic: "image", placeholderField: false }),
      }),
    },
  },

  quote: {
    label: "Quote break",
    group: "Templates",
    tone: "dark",
    description: "A large quote over a full-bleed image: a pause in the deck.",
    fields: {
      eyebrow: eyebrow(),
      quote: longtext("Quote", {
        semantic: "body",
        required: true,
        maxChars: 120,
        hint: "The slide adds the quote marks",
      }),
      name: text("Name", { semantic: "name", maxChars: 40 }),
      role: text("Role", { semantic: "meta", maxChars: 50 }),
      credit: text("Credit", { semantic: "credit", maxChars: 40 }),
      image: image("Image", { semantic: "image" }),
    },
    rules: [quoteMarksRule],
  },
};

/** Layout keys in gallery order: the funding layouts, then the templates. */
export const LAYOUT_GROUPS = Object.freeze(["Funding", "Templates"]);
