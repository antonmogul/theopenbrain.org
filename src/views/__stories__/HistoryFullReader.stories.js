import HistoryFullReaderHarness from "./HistoryFullReaderHarness.vue";
import fixture from "@/stories/historyFullReaderData.json";
import { loadWidgetHtml } from "@/widgets/uploads/index.js";

// The fixture is a dated export of the published chapter
// (scripts/history-full-reader-export.mjs, docs/architecture/history-fixture.md).
// This story makes no outside request, so the two things the published
// chapter takes from elsewhere are supplied here; the rest is the export.

// An uploaded widget's HTML is not in the fixture: it names the published
// file by sha256 and the committed copy in src/widgets/uploads/ is served,
// without its Google Fonts links.
const offline = (html) => html.replace(/<link[^>]*fonts\.g[^>]*>/g, "");
async function uploadedWidgets(endpoint) {
  const rows = [];
  for (const upload of fixture.uploads) {
    if (!endpoint.includes(`slug=eq.${encodeURIComponent(upload.slug)}`))
      continue;
    const { slug, title, ramp, status } = upload;
    const html = offline((await loadWidgetHtml(slug)) || "");
    rows.push({ slug, title, ramp, status, html });
  }
  return rows;
}

// A figure that plays a YouTube video takes its poster from i.ytimg.com.
// Each poster is a plain stand-in of a poster's size; the video id, caption
// and order are the export's.
const POSTER = /^https:\/\/i\.ytimg\.com\//;
const posterStandIn = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#444"/></svg>'
)}`;
const local = (src) => (POSTER.test(src || "") ? posterStandIn : src);
const animations = fixture.animations.map((animation) => ({
  ...animation,
  image_file_url: local(animation.image_file_url),
  config: Array.isArray(animation.config?.images)
    ? {
        ...animation.config,
        images: animation.config.images.map((image) =>
          typeof image === "string"
            ? local(image)
            : { ...image, src: local(image.src) }
        ),
      }
    : animation.config,
}));

export default {
  title: "Chapter/History Full Reader",
  component: HistoryFullReaderHarness,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: false },
    api: {
      "modules?": [fixture.module],
      "sections?": fixture.sections,
      "paragraphs?": fixture.paragraphs,
      "animations?": animations,
      "animation_states?": [],
      "animation_variants?": [],
      "references?": fixture.references,
      "widget_uploads?": uploadedWidgets,
      "quizzes?": [],
    },
    docs: {
      description: {
        component: `${fixture.boundary} Exported ${fixture.header.exportedAt}.`,
      },
    },
  },
};

export const PublishedExport = {};
