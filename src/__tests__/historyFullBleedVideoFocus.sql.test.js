// @vitest-environment node
/** Runs 20261124078700_history_full_bleed_video_focus.sql in PGlite
 * (OPENBRAIN-87).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyFullBleedVideoFocus.sql.test.js (the SQL
 * run is skipped without it; the reader checks always run).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figureFill, figureImages } from "@/helper/figureCycle";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261124078700_history_full_bleed_video_focus.sql",
  "utf8"
);
const ART = "/publicAssets/images/foundations";

// The rows as production holds them on 25 Nov (and the History fixture).
const FILLS = {
  animationFoundationsFig12: {
    focus: "50% 30%",
    config: {
      images: [
        { alt: "A replica microscope.", src: `${ART}/fig12-01-v2.webp` },
      ],
      caption: "Replica van Leeuwenhoek microscope. Source: Wikipedia.",
      tintFade: true,
      diagramType: "photo",
      placeholder: true,
      figureNumber: 16,
    },
  },
  animationFoundationsFig13: {
    focus: "60% 70%",
    config: {
      images: [{ alt: "Deiters' drawings.", src: `${ART}/fig13-01-v2.webp` }],
      caption: "Deiters’ neuron drawings.",
      diagramType: "illustration",
      placeholder: true,
      figureNumber: 17,
    },
  },
};
const VIDEOS = {
  animationFoundationsMilnerHM: {
    youtube: "g4-6A8u8QBc",
    focus: "50% 30%",
    config: {
      images: [
        { alt: "Portrait.", src: `${ART}/hm-brenda-milner-v2.webp` },
        {
          alt: "Video: History of Neuroscience, Brenda Milner.",
          src: `${ART}/thumbs/brenda-milner.webp`,
          play: "player",
          youtube: "g4-6A8u8QBc",
          posterPlay: "corner",
        },
        `${ART}/hm-scoville-surgery.jpg`,
        {
          alt: "H.M.'s brain being cut.",
          src: `${ART}/hm-brain-slicing.jpg`,
          youtube: "OmmH4Rp9-to",
        },
      ],
      tintFade: true,
      placeholder: true,
      figureNumber: 15,
    },
  },
  animationFoundationsNgfLeviMontalcini: {
    youtube: "WgkAR-vrJpM",
    focus: "50% 0%",
    config: {
      images: [
        {
          alt: "Video: History of Neuroscience, Rita Levi-Montalcini.",
          src: `${ART}/thumbs/rita-levi-montalcini.webp`,
          play: "player",
          start: 2,
          youtube: "WgkAR-vrJpM",
          posterPlay: "corner",
        },
      ],
      diagramType: "video",
      placeholder: true,
      figureNumber: "L",
    },
  },
  animationFoundationsFig21: {
    youtube: "KbA3RLz3xUQ",
    focus: "50% 60%",
    config: {
      images: [
        {
          alt: "Video: an interview with Andrew Huxley.",
          src: `${ART}/thumbs/andrew-huxley.webp`,
          play: "player",
          youtube: "KbA3RLz3xUQ",
          posterPlay: "corner",
        },
        { alt: "A diagram.", src: `${ART}/fig21-01.jpg` },
      ],
      placeholder: true,
      figureNumber: 25,
    },
  },
};
const withFocus = (config, youtube, focus) => ({
  ...config,
  images: config.images.map((item) =>
    item?.youtube === youtube ? { ...item, focus } : item
  ),
});

/* What a pane shows of a `width` × `height` picture that covers it around
   the focal point. The pane is 100vw less the text column (50vw, at least
   35rem, at most 890px) wide, and the window less the top bar (48px), the
   timeline (20px) and the FIG row (about 75px) tall. */
function seenIn([vw, vh], width, height, focus) {
  const [fx, fy] = focus.split(" ").map((v) => parseFloat(v) / 100);
  const w = vw - Math.min(890, Math.max(560, vw / 2));
  const h = vh - 48 - 20 - 75;
  const scale = Math.max(w / width, h / height);
  const left = ((width * scale - w) * fx) / scale;
  const top = ((height * scale - h) * fy) / scale;
  return { left, top, right: left + w / scale, bottom: top + h / scale };
}
const WINDOWS = [
  [1024, 600],
  [1024, 768],
  [1280, 720],
  [1331, 992],
  [1440, 900],
  [1920, 947],
  [1920, 1080],
  [2560, 1440],
];

describe("Fig 16, Fig 17 and the video posters: the reader", () => {
  it("reads the migrated rows as fills, and today's rows as before", () => {
    for (const { config, focus } of Object.values(FILLS)) {
      expect(figureFill(config)).toBe("");
      expect(figureFill({ ...config, fill: true, focus })).toBe(focus);
      expect(migration).toContain(`'${focus}'`);
    }
  });

  it("gives a video's entry its focal point, and no other entry one", () => {
    for (const { config, youtube, focus } of Object.values(VIDEOS)) {
      expect(figureImages(config).some((image) => image.focus)).toBe(false);
      const images = figureImages(withFocus(config, youtube, focus));
      expect(images.filter((image) => image.focus)).toEqual([
        expect.objectContaining({ youtube, focus }),
      ]);
      expect(migration).toContain(`'${youtube}', '${focus}'`);
    }
    expect(figureImages({ images: [{ src: "/a.jpg", focus: "top" }] })).toEqual(
      [{ src: "/a.jpg", caption: "", alt: "" }]
    );
  });

  it("has no transaction of its own", () => {
    expect(migration).not.toMatch(/^\s*(begin|commit)\s*;/im);
  });

  // Fig 16 is upright (1440 × 1920): a pane wider than it is tall cuts the
  // foot of the instrument, but the working parts (the lens, the specimen
  // pin, the focusing screw and the lever) stay in frame.
  it("keeps the microscope's working parts in frame from 1024 × 600 to 2560 × 1440", () => {
    const PARTS = { left: 494, top: 480, right: 1175, bottom: 1115 };
    for (const size of WINDOWS) {
      const seen = seenIn(
        size,
        1440,
        1920,
        FILLS.animationFoundationsFig12.focus
      );
      const name = size.join("×");
      expect(seen.left, name).toBeLessThanOrEqual(PARTS.left);
      expect(seen.top, name).toBeLessThanOrEqual(PARTS.top);
      expect(seen.right, name).toBeGreaterThanOrEqual(PARTS.right);
      expect(seen.bottom, name).toBeGreaterThanOrEqual(PARTS.bottom);
    }
  });

  // Fig 17 (1440 × 1821) is drawn to all four edges, so any crop trims the
  // outer branches; the four cell bodies stay in frame.
  it("keeps Deiters' four cell bodies in frame from 1024 × 600 to 2560 × 1440", () => {
    const BODIES = { left: 480, top: 900, right: 1395, bottom: 1580 };
    for (const size of WINDOWS) {
      const seen = seenIn(
        size,
        1440,
        1821,
        FILLS.animationFoundationsFig13.focus
      );
      const name = size.join("×");
      expect(seen.left, name).toBeLessThanOrEqual(BODIES.left);
      expect(seen.top, name).toBeLessThanOrEqual(BODIES.top);
      expect(seen.right, name).toBeGreaterThanOrEqual(BODIES.right);
      expect(seen.bottom, name).toBeGreaterThanOrEqual(BODIES.bottom);
    }
  });
});

describe.skipIf(!harness || !existsSync(harness))(
  "Fig 16, Fig 17 and the video posters (SQL)",
  () => {
    const OTHER = { images: [{ src: "/x.webp", youtube: "g4-6A8u8QBc" }] };
    async function fresh(overrides = {}) {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(`create schema if not exists public;
        create table public.animations (animation_key text primary key,
          config jsonb, updated_at timestamptz);`);
      const rows = {
        animationFoundationsFig1: OTHER,
        ...Object.fromEntries(
          Object.entries({ ...FILLS, ...VIDEOS }).map(([key, row]) => [
            key,
            row.config,
          ])
        ),
        ...overrides,
      };
      for (const [key, config] of Object.entries(rows))
        await db.query(
          "insert into public.animations(animation_key, config) values ($1, $2)",
          [key, config === null ? null : JSON.stringify(config)]
        );
      return db;
    }
    const read = async (db) =>
      Object.fromEntries(
        (
          await db.query(
            "select * from public.animations order by animation_key"
          )
        ).rows.map((row) => [row.animation_key, row])
      );

    it("sets the fills and the focal points, keeps everything else and replays as a no-op", async () => {
      const db = await fresh();
      try {
        await db.exec(migration);
        const rows = await read(db);
        // A row the migration does not name is untouched, even one that
        // carries the same video.
        expect(rows.animationFoundationsFig1.config).toEqual(OTHER);
        expect(rows.animationFoundationsFig1.updated_at).toBeNull();
        for (const [key, { config, focus }] of Object.entries(FILLS)) {
          expect(rows[key].config).toEqual({ ...config, fill: true, focus });
          expect(rows[key].updated_at).not.toBeNull();
          expect(figureFill(rows[key].config)).toBe(focus);
        }
        for (const [key, { config, youtube, focus }] of Object.entries(
          VIDEOS
        )) {
          // Every entry in place and in order; only the video's gains a key.
          expect(rows[key].config).toEqual(withFocus(config, youtube, focus));
          expect(rows[key].updated_at).not.toBeNull();
        }
        await db.exec("update public.animations set updated_at = '2000-01-01'");
        await db.exec(migration);
        const again = await read(db);
        for (const key of Object.keys(again)) {
          expect(again[key].config).toEqual(rows[key].config);
          expect(new Date(again[key].updated_at).getFullYear()).toBe(2000);
        }
      } finally {
        await db.close();
      }
    });

    it("keeps a focal point an author set, on a row and on a video's entry", async () => {
      const fig12 = FILLS.animationFoundationsFig12.config;
      const rita = VIDEOS.animationFoundationsNgfLeviMontalcini;
      const db = await fresh({
        animationFoundationsFig12: { ...fig12, fill: "yes", focus: "40% 20%" },
        animationFoundationsNgfLeviMontalcini: withFocus(
          rita.config,
          rita.youtube,
          "30% 10%"
        ),
      });
      try {
        await db.exec(migration);
        const rows = await read(db);
        expect(rows.animationFoundationsFig12.config).toEqual({
          ...fig12,
          fill: true,
          focus: "40% 20%",
        });
        expect(rows.animationFoundationsNgfLeviMontalcini.config).toEqual(
          withFocus(rita.config, rita.youtube, "30% 10%")
        );
        expect(
          rows.animationFoundationsNgfLeviMontalcini.updated_at
        ).toBeNull();
      } finally {
        await db.close();
      }
    });

    it("copes with a null config, a row without images and a missing row", async () => {
      const db = await fresh({
        animationFoundationsFig13: null,
        animationFoundationsFig21: { figureNumber: 25 },
      });
      try {
        await db.query(
          "delete from public.animations where animation_key = $1",
          ["animationFoundationsMilnerHM"]
        );
        await db.exec(migration);
        const rows = await read(db);
        expect(rows.animationFoundationsFig13.config).toEqual({
          fill: true,
          focus: FILLS.animationFoundationsFig13.focus,
        });
        expect(rows.animationFoundationsFig21.config).toEqual({
          figureNumber: 25,
        });
        expect(rows.animationFoundationsFig21.updated_at).toBeNull();
        expect(rows.animationFoundationsMilnerHM).toBeUndefined();
      } finally {
        await db.close();
      }
    });
  }
);
