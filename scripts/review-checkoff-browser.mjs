/** OPENBRAIN-47 browser proof. Real reader, mocked review RPCs; never writes to Supabase.
 * node scripts/review-checkoff-browser.mjs --base http://127.0.0.1:4247 --out /tmp/ob47-proof
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit, devices } from "playwright";

// WebKit can leave the reader's unused Plex 600 italic face "loading" with no
// pending request. Wait explicitly for the widget's normal UI faces instead.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";

const arg = (key, fallback) =>
  process.argv[process.argv.indexOf(key) + 1] || fallback;
const base = process.argv.includes("--base")
  ? arg("--base")
  : "http://127.0.0.1:4247";
const out = process.argv.includes("--out") ? arg("--out") : "/tmp/ob47-proof";
await mkdir(out, { recursive: true });
const statuses = ["new", "doing", "question", "done", "wont_do", "verified"];
const result = [];
const uuid = (i) =>
  `aaaaaaaa-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [1440, 1024, 390]) {
      const context = await browser.newContext({
        ...(width === 390 ? devices["iPhone 13"] : {}),
        viewport: { width, height: width === 390 ? 844 : 900 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      const calls = [];
      const rows = statuses.map((status, i) => ({
        id: uuid(i),
        parent_id: null,
        chapter_slug: "the-retina",
        type: "note",
        created_at: `2026-11-19T12:0${i}:00Z`,
        updated_at: "2026-11-19T13:00:00Z",
        status,
        note: `Review ${status}: please check the figure legend.`,
        reply: status === "done" ? "Fixed the date in the legend." : null,
        reviewer_name: "Stuart",
        reviewer_role: "author",
        verified_at: status === "verified" ? "2026-11-19T13:00:00Z" : null,
        anchor: {
          kind: "opener",
          label: `Chapter cover (${status})`,
          point: {
            x: 0.05 + (i % 2) * 0.35,
            y: 0.08 + Math.floor(i / 2) * 0.1,
          },
        },
      }));
      rows.push({
        ...rows[3],
        id: uuid(6),
        reviewer_name: "Another reviewer",
        created_at: "2026-11-19T12:07:00Z",
      });
      const queue = rows.slice(0, 6).map((n, i) => ({
        id: n.id,
        clientId: `r_proof_${i}`,
        state: "sent",
        status: n.status,
        chapterSlug: n.chapter_slug,
        createdAt: n.created_at,
        label: n.anchor.label,
        type: n.type,
        note: n.note,
        payload: { anchor: n.anchor, client_id: `r_proof_${i}` },
      }));
      await context.addInitScript(
        ({ queue }) => {
          if (!localStorage.getItem("ob47.seeded")) {
            localStorage.setItem(
              "ob.review.identity",
              JSON.stringify({ name: "Stuart", role: "author" })
            );
            localStorage.setItem("ob.review.queue", JSON.stringify(queue));
            localStorage.setItem("ob47.seeded", "1");
          }
        },
        { queue }
      );
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!url.hostname.endsWith(".supabase.co")) return route.continue();
        const rpc = url.pathname.split("/").at(-1);
        const respond = (data) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        if (rpc === "review_feedback_status") {
          calls.push({ rpc, method: request.method() });
          assert.equal(request.method(), "GET");
          return respond(
            rows
              .slice(0, 6)
              .map(({ id, status, reply, verified_at, updated_at }) => ({
                id,
                status,
                reply,
                verified_at,
                updated_at,
              }))
          );
        }
        if (rpc === "list_review_feedback") {
          calls.push({ rpc, method: request.method() });
          assert.equal(request.method(), "GET");
          return respond(rows);
        }
        if (rpc === "review_feedback_author_action") {
          const p = request.postDataJSON();
          calls.push({ rpc, method: request.method(), action: p.p_action });
          assert.equal(request.method(), "POST");
          const i = rows.findIndex((n) => n.id === p.p_id);
          assert.equal(p.p_client_id, `r_proof_${i}`);
          assert.ok(["done", "wont_do", "verified"].includes(rows[i].status));
          if (p.p_action === "reopen") {
            assert.ok(p.p_note.trim());
            rows.push({
              ...rows[i],
              id: uuid(rows.length),
              parent_id: rows[i].id,
              note: p.p_note,
              anchor: {},
              status: "new",
            });
          }
          rows[i] = {
            ...rows[i],
            status: p.p_action === "verify" ? "verified" : "new",
            verified_at:
              p.p_action === "verify" ? "2026-11-19T14:00:00Z" : null,
          };
          return respond(rows[i]);
        }
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          errors.push(`Blocked unexpected ${request.method()} ${url.pathname}`);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(`${base}/chapter/2/the-retina?review=on`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByTestId("review-fab").waitFor();
      await page.locator(".opener-hero").waitFor();
      await page.evaluate(() =>
        Promise.all([
          document.fonts.load('400 14px "IBM Plex Sans"'),
          document.fonts.load('600 14px "IBM Plex Sans"'),
        ])
      );
      assert.equal(
        calls.filter((r) => r.rpc === "review_feedback_status").length,
        1
      );
      assert.equal(calls.filter((r) => r.method !== "GET").length, 0);
      assert.match(
        await page.getByTestId("review-check-badge").innerText(),
        /1/
      );
      await page.getByTestId("review-fab").click();
      await page.getByTestId("review-tab-mine").click();
      await page
        .getByText("Fixed the date in the legend.", { exact: false })
        .waitFor();
      const mine = page.locator('.rv-note[data-status="done"]');
      assert.equal(
        await mine
          .getByRole("button", { name: "Looks good ✓", exact: true })
          .count(),
        1
      );
      await page.screenshot({ path: `${out}/${name}-${width}-mine.png` });
      await page.getByTestId("review-tab-all").click();
      await page.getByTestId("review-all-note").first().waitFor();
      for (const status of statuses) {
        const card = page
          .locator(`.rv-thread[data-status="${status}"]`)
          .first();
        if (width !== 1024)
          await card.screenshot({
            path: `${out}/${name}-${width}-${status}.png`,
          });
        const chip = card.locator(".rv-status-chip");
        // Actual computed colours, in the rendered book, have AA text contrast.
        const colours = await chip.evaluate((el) => ({
          fg: getComputedStyle(el).color,
          bg: getComputedStyle(el).backgroundColor,
        }));
        const luminance = (css) => {
          const values = css
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((c) => (css.startsWith("color(srgb") ? c : c / 255))
            .map((c) =>
              c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
            );
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        };
        const l = [luminance(colours.fg), luminance(colours.bg)].sort(
          (a, b) => b - a
        );
        assert.ok(
          (l[0] + 0.05) / (l[1] + 0.05) >= 4.5,
          `${status} contrast ${JSON.stringify(colours)}`
        );
      }
      const foreign = page.locator(`[data-note-id="${uuid(6)}"]`);
      assert.equal(
        await foreign
          .getByRole("button", { name: "Looks good ✓", exact: true })
          .count(),
        0
      );
      await page.getByTestId("review-pins").check();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" })
      );
      await page.waitForTimeout(250);
      assert.equal(
        await page.locator('.rv-pin[data-status="verified"]').count(),
        0
      );
      await page.screenshot({ path: `${out}/${name}-${width}-pins.png` });
      await page.getByTestId("review-fab").click();
      await page.getByLabel("Show checked", { exact: true }).check();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.waitForTimeout(100);
      assert.equal(
        await page.locator('.rv-pin[data-status="verified"]').count(),
        1
      );
      await page.screenshot({
        path: `${out}/${name}-${width}-checked-pins.png`,
      });
      await page.getByTestId("review-fab").click();
      await page.getByTestId("review-tab-mine").click();
      await page
        .locator('.rv-note[data-status="done"]')
        .getByRole("button", { name: "Looks good ✓", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("ob.review.queue")).find(
            (n) => n.status === "done"
          ) == null
      );
      assert.equal(await page.getByTestId("review-check-badge").count(), 0);
      const verified = page
        .locator(`.rv-note`)
        .filter({ hasText: "Chapter cover (done)" });
      await verified
        .getByRole("button", { name: "Not quite", exact: true })
        .click();
      const reopen = verified.getByRole("button", {
        name: "Reopen with comment",
        exact: true,
      });
      assert.equal(await reopen.isDisabled(), true);
      await verified
        .getByRole("textbox")
        .fill("The date is still wrong on the small screen.");
      await reopen.click();
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("ob.review.queue")).find(
            (n) => n.clientId === "r_proof_3"
          )?.status === "new"
      );
      await page.getByTestId("review-tab-all").click();
      await page
        .getByText("The date is still wrong on the small screen.", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      );
      assert.deepEqual(errors, []);
      const statusReads = calls.filter(
        (r) => r.rpc === "review_feedback_status"
      ).length;
      await page.evaluate(() => localStorage.removeItem("ob.review.queue"));
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(
        calls.filter((r) => r.rpc === "review_feedback_status").length,
        statusReads
      );
      result.push({
        browser: name,
        width,
        reducedMotion: true,
        calls,
        consoleErrors: errors,
        passed: true,
      });
      await context.close();
      console.log(`PASS ${name} ${width}`);
    }
  } finally {
    await browser.close();
  }
}
await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
