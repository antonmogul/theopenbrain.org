// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  retinaReaderChapter,
  retinaFigureConfig,
} from "../helper/retinaReaderLayout.mjs";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261124079900_retina_reader_layout.sql",
  "utf8"
);
const placements = [
  [
    "8db9c849-1cbf-4217-a4cd-d0da1597705e",
    "animationAccommodationVergence",
    { hold: "next" },
  ],
  [
    "63f9a3e3-1f34-46a0-b973-92e282d5f386",
    "widget-upload:retina-object-motion-sensitivity",
    { room: 1 },
  ],
  [
    "bfb594df-a813-4762-8dfa-8c81d470d38a",
    "widget-upload:retina-rod-vs-cone-circuits",
    { room: 1 },
  ],
  [
    "901b315e-65f7-457d-8526-0b537fae86e4",
    "widget-upload:retina-light-sensitive-ganglion-cells",
    { hold: "next" },
  ],
  [
    "25028da1-b944-46b7-b049-fc8ebbb86484",
    "animationEyeMovements",
    { hold: "next" },
  ],
];
const moduleId = "00000000-0000-4000-8000-000000000001";
const sectionId = "00000000-0000-4000-8000-000000000002";
const directionId = "5089d277-4e6b-4b95-a353-613e81d60011";
const rows = () =>
  placements.map(([id, animation_key], i) => ({
    id,
    section_id: sectionId,
    animation_id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`,
    animation_key,
    content: {
      blocks: [{ type: "text", content: "Author's prose." }],
      custom: "kept",
    },
  }));
const chapter = (paragraphs = rows()) => ({
  slug: "the-retina",
  sections: [
    {
      id: sectionId,
      slug: "amacrine-and-ganglion-cells-circuits-computations-and-output",
      paragraphs,
    },
  ],
});
describe("Retina deploy-interval defaults", () => {
  it("keeps author settings and unrelated chapters, boxes and replacement figures", () => {
    const original = chapter();
    const changed = retinaReaderChapter(original);
    expect(
      original.sections[0].paragraphs[0].content.animationFlags
    ).toBeUndefined();
    changed.sections[0].paragraphs.forEach((p, i) =>
      expect(p.content.animationFlags).toEqual(placements[i][2])
    );
    const edited = chapter(
      rows().map((p) => ({
        ...p,
        content: { ...p.content, animationFlags: { hold: 0, room: 0.5 } },
      }))
    );
    expect(retinaReaderChapter(edited)).toEqual(edited);
    const other = { ...original, slug: "foundations-of-neuroscience" };
    expect(retinaReaderChapter(other)).toBe(other);
    const box = {
      ...original,
      sections: [{ ...original.sections[0], slug: "box-example" }],
    };
    expect(retinaReaderChapter(box)).toEqual(box);
    const replaced = chapter(
      rows().map((p) => ({ ...p, animation_key: "author-replacement" }))
    );
    expect(retinaReaderChapter(replaced)).toEqual(replaced);
  });
  it("uses the same fitted cell-types upload without changing its figure label", () => {
    for (const key of [
      "animationRetinalCellTypes2",
      "animationRetinalCellTypes3",
    ]) {
      expect(retinaFigureConfig(key, { figureNumber: 12 })).toEqual({
        figureNumber: 12,
        widgetId: "upload:retina-retinal-cell-types",
      });
      expect(retinaFigureConfig(key, { widgetId: "author-widget" })).toEqual({
        widgetId: "author-widget",
      });
    }
  });
});
describe.skipIf(!harness || !existsSync(harness))(
  "Retina reviewed layout SQL",
  () => {
    async function fresh() {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(
        `create table modules(id uuid,slug text);create table sections(id uuid,module_id uuid,slug text);create table animations(id uuid,animation_key text,config jsonb,youtube_id text,image_file_url text,updated_at timestamptz);create table paragraphs(id uuid,section_id uuid,animation_id uuid,has_animation boolean,animation_trigger text,content jsonb,updated_at timestamptz);`
      );
      await db.query("insert into modules values ($1,$2)", [
        moduleId,
        "the-retina",
      ]);
      await db.query("insert into sections values ($1,$2,$3)", [
        sectionId,
        moduleId,
        chapter().sections[0].slug,
      ]);
      for (const p of rows()) {
        await db.query(
          "insert into animations(id,animation_key,config) values ($1,$2,$3)",
          [p.animation_id, p.animation_key, {}]
        );
        await db.query(
          "insert into paragraphs(id,section_id,animation_id,content) values ($1,$2,$3,$4)",
          [p.id, sectionId, p.animation_id, p.content]
        );
      }
      await db.query(
        "insert into animations(id,animation_key,config) values ($1,$2,$3)",
        [
          directionId,
          "widget-upload:retina-direction-selectivity",
          { widgetId: "upload:retina-direction-selectivity" },
        ]
      );
      for (const id of [
        "03f92733-17dd-46a2-9131-c3c64875dba1",
        "2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39",
        "4fd08f62-00c0-4ebe-8000-000000000002",
      ])
        await db.query(
          "insert into paragraphs(id,section_id,content) values ($1,$2,$3)",
          [
            id,
            sectionId,
            {
              blocks: [
                id.startsWith("4fd")
                  ? {
                      type: "widget",
                      widgetId: "upload:retina-direction-selectivity",
                      fullScreen: true,
                    }
                  : { type: "text", content: "Preserved direction prose." },
              ],
            },
          ]
        );
      return db;
    }
    it("stores the same timing defaults, safely moves direction selectivity and is idempotent", async () => {
      const db = await fresh();
      try {
        await db.exec(sql);
        const result = (await db.query("select * from paragraphs order by id"))
          .rows;
        for (const [id, , flags] of placements)
          expect(result.find((p) => p.id === id).content).toEqual({
            ...rows().find((p) => p.id === id).content,
            animationFlags: flags,
          });
        for (const id of [
          "03f92733-17dd-46a2-9131-c3c64875dba1",
          "2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39",
        ])
          expect(result.find((p) => p.id === id).animation_id).toBe(
            directionId
          );
        expect(
          result.find((p) => p.id === "4fd08f62-00c0-4ebe-8000-000000000002")
            .content.blocks
        ).toEqual([]);
        await db.exec(sql);
        expect(
          (await db.query("select * from paragraphs order by id")).rows
        ).toEqual(result);
      } finally {
        await db.close();
      }
    });
    it("preserves an explicit hold/room and the standalone widget if either prose figure was changed", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update paragraphs set content=jsonb_set(content,'{animationFlags}',$1) where id=$2",
          [{ hold: 0, room: 0.5 }, placements[0][0]]
        );
        await db.query("update paragraphs set animation_id=$1 where id=$2", [
          rows()[0].animation_id,
          "03f92733-17dd-46a2-9131-c3c64875dba1",
        ]);
        await db.exec(sql);
        expect(
          (
            await db.query("select content from paragraphs where id=$1", [
              placements[0][0],
            ])
          ).rows[0].content.animationFlags
        ).toEqual({ hold: 0, room: 0.5 });
        expect(
          (
            await db.query("select content from paragraphs where id=$1", [
              "4fd08f62-00c0-4ebe-8000-000000000002",
            ])
          ).rows[0].content.blocks
        ).toHaveLength(1);
      } finally {
        await db.close();
      }
    });
    it("matches the reader's figure defaults, keeps labels and creator overrides, and does not rewrite a supplied still", async () => {
      const db = await fresh();
      const configs = [
        [
          "animationRetinalCellTypes2",
          { figureNumber: 12, set: 2 },
          null,
          null,
        ],
        [
          "animationRetinalCellTypes3",
          { figureNumber: 11, widgetId: "author-widget" },
          null,
          null,
        ],
        [
          "animationRetinaDevelopment",
          { images: [{ src: "/loop.webp" }] },
          null,
          null,
        ],
        ["animationWavesOfActivity", { figureNumber: 27 }, "k0_HXpcH4zI", null],
      ];
      try {
        for (const [key, config, youtube, image] of configs)
          await db.query(
            "insert into animations(animation_key,config,youtube_id,image_file_url) values ($1,$2,$3,$4)",
            [key, config, youtube, image]
          );
        await db.exec(sql);
        for (const [key, config, youtube, image] of configs) {
          const row = (
            await db.query(
              "select config from animations where animation_key=$1",
              [key]
            )
          ).rows[0];
          expect(row.config).toEqual(
            retinaFigureConfig(key, config, youtube, image)
          );
        }
        await db.query(
          "update animations set config=$1, image_file_url='/author.jpg' where animation_key='animationWavesOfActivity'",
          [{ figureNumber: 27 }]
        );
        await db.exec(sql);
        expect(
          (
            await db.query(
              "select config from animations where animation_key='animationWavesOfActivity'"
            )
          ).rows[0].config
        ).toEqual({ figureNumber: 27 });
      } finally {
        await db.close();
      }
    });
  }
);
