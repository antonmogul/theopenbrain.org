// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/retinaWidgetsDb.json";
import blocks from "./fixtures/retinaWidgetBlocks.json";
import { sql, widgetsDb, atWidgetsDb } from "./helpers/retinaWidgetsDb.mjs";
import { transformParagraph } from "@/composables/chapterTransform.mjs";

const harness = process.env.HISTORY_SQL_HARNESS;
const paragraphs = async (db) =>
  (await db.query("select * from paragraphs order by section_id,order_index"))
    .rows;
const uploads = async (db) =>
  (await db.query("select * from widget_uploads order by slug")).rows;

describe.skipIf(!harness || !existsSync(harness))(
  "Retina widgets move to DB blocks",
  () => {
    it("publishes exact files, preserves prose, orders the three bands and removes the duplicate pane link, twice", async () => {
      const db = await widgetsDb(fixture);
      try {
        const before = await paragraphs(db);
        await db.exec(sql);
        const once = await paragraphs(db),
          published = await uploads(db);
        for (const row of published)
          expect(row.html, row.slug).toBe(
            atWidgetsDb(
              readFileSync(`src/widgets/uploads/${row.slug}.html`, "utf8")
            )
          );
        expect(published).toHaveLength(15);
        expect(published.every((u) => u.status === "published")).toBe(true);
        for (const p of before) {
          const after = once.find((r) => r.id === p.id);
          expect(after.content, p.id).toEqual(p.content);
          expect(after.content_text, p.id).toBe(p.content_text);
        }
        for (const block of blocks) {
          const placed = once.filter((p) =>
            p.content.blocks?.some((b) => b.placementId === block.placementId)
          );
          expect(placed).toHaveLength(1);
          expect(placed[0].content.blocks).toEqual([block]);
          const widget = transformParagraph(placed[0]).widget;
          expect(widget).toMatchObject({
            widgetId: block.widgetId,
            fullScreen: true,
          });
          if (block.launchCard)
            expect(widget).toMatchObject({
              launchCard: block.launchCard,
              narrowKind: "breakout",
              fallbackWidgetId: "retinabox",
            });
        }
        const circuit = once.filter(
          (p) => p.section_id === "fa9a9189-d188-47cf-978a-092813998bbc"
        );
        const order = circuit.map(
          (p) => p.content.blocks[0].placementId || p.id
        );
        expect(order.indexOf("retina-color-vision")).toBe(
          order.indexOf("1dd1d2ae-f64f-4d19-8ead-f1a343bcae09") + 1
        );
        expect(order.indexOf("retina-direction-selectivity")).toBe(
          order.indexOf("2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39") + 1
        );
        expect(order.indexOf("retina-retinabox")).toBe(
          order.indexOf("bfb594df-a813-4762-8dfa-8c81d470d38a") - 1
        );
        expect(
          once.find((p) => p.id === "03f92733-17dd-46a2-9131-c3c64875dba1")
        ).toMatchObject({
          animation_id: null,
          has_animation: false,
          animation_trigger: null,
        });
        await db.exec(sql);
        expect(await paragraphs(db)).toEqual(once);
        expect(await uploads(db)).toEqual(published);
      } finally {
        await db.close();
      }
    }, 30000);

    it("repairs older History flags while preserving all other block keys and refusing intervening author HTML changes", async () => {
      const db = await widgetsDb(fixture);
      try {
        for (const id of [
          "f891fe5f-59f8-4649-a2eb-48763f78a3bc",
          "f468cf8d-8ff3-447c-bd28-ef4653174034",
        ])
          await db.query(
            "update paragraphs set content=content #- '{blocks,0,fullScreen}' where id=$1",
            [id]
          );
        await db.exec(sql);
        for (const row of await paragraphs(db))
          if (row.content.blocks[0]?.placementId?.startsWith("foundations-"))
            expect(row.content.blocks[0].fullScreen).toBe(true);
        await db.query(
          "update paragraphs set content=jsonb_set(content, '{blocks,0,fullScreen}', 'false') where id='f891fe5f-59f8-4649-a2eb-48763f78a3bc'"
        );
        await db.exec(sql);
        expect(
          (await paragraphs(db)).find(
            (p) => p.id === "f891fe5f-59f8-4649-a2eb-48763f78a3bc"
          ).content.blocks[0].fullScreen
        ).toBe(false);
        await db.query(
          "update widget_uploads set html=html || '<!-- author edit -->' where slug='retina-retinabox'"
        );
        await expect(db.exec(sql)).rejects.toThrow(/retina-retinabox changed/);
      } finally {
        await db.close();
      }
    }, 30000);
  }
);
