import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const base = process.env.STUDY_BROWSER_BASE || "http://127.0.0.1:5296";
const output =
  process.env.STUDY_BROWSER_OUT ||
  "/Volumes/Brain/artifacts/feedback-2026-11-24/OPENBRAIN-96";
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    })
);
const supabase = env.VITE_SUPABASE_URL,
  key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const user = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "fixture@example.invalid",
  user_metadata: { full_name: "Alex Example", role: "student" },
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1331, 375]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1331 ? 992 : 704 },
      isMobile: width === 375,
      hasTouch: width === 375,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(
      ({ storageKey, user }) => {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "study-fixture",
            refresh_token: "fixture",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user,
          })
        );
        localStorage.setItem("ob.reduceMotion", "true");
      },
      {
        storageKey: `sb-${new URL(supabase).hostname.split(".")[0]}-auth-token`,
        user,
      }
    );
    // All student reads/writes are fixtures. Public content only is forwarded
    // with the publishable key; the fake bearer NEVER reaches production.
    await page.route(`${supabase}/**`, async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split("/").at(-1);
      if (url.pathname.startsWith("/auth/"))
        return route.fulfill({ json: user });
      if (table === "profiles")
        return route.fulfill({
          json: [{ id: user.id, full_name: "Alex Example", role: "student" }],
        });
      if (
        ![
          "modules",
          "sections",
          "paragraphs",
          "animations",
          "animation_states",
          "animation_variants",
          "references",
          "break_videos",
          "widget_uploads",
          "chapter_authors",
          "authors",
          "trending_highlights",
          "content_versions",
        ].includes(table)
      )
        return route.fulfill({ json: [] });
      assert.equal(
        route.request().method(),
        "GET",
        `No production writes: ${table}`
      );
      let response;
      try {
        response = await route.fetch({
          headers: {
            ...route.request().headers(),
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        });
      } catch {
        if (!page.isClosed()) await route.abort().catch(() => {});
        return;
      }
      return route.fulfill({ response }).catch(() => {});
    });
    await page.goto(`${base}/chapter/2/the-retina`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .locator(".chapter-reader")
      .waitFor({ state: "attached", timeout: 30000 });
    await page.waitForFunction(
      () => document.documentElement.scrollHeight > 2500
    );
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.wheel(0, 1600);
    await page.waitForFunction(() => window.scrollY > 100);
    await page.getByTestId("reader-tools-button").click();
    await page.locator('[data-tool="chat"]').first().click();
    const panel = page.getByTestId("study-partner");
    await panel
      .getByText("Hey Alex!", { exact: false })
      .waitFor({ timeout: 30000 });
    await page.screenshot({
      path: `${output}/opening-${width}.png`,
      animations: "disabled",
    });
    await panel.getByRole("button", { name: "Test me", exact: false }).click();
    await panel
      .getByRole("button", {
        name: "Flashcards from your highlights",
        exact: false,
      })
      .waitFor();
    await panel
      .getByRole("button", {
        name: "Flashcards from your highlights",
        exact: false,
      })
      .click();
    await panel.locator(".sp-flip").first().waitFor();
    await panel.locator(".sp-flip").first().click();
    assert.match(
      await panel.locator(".sp-flip").first().innerText(),
      /Light into electrical signals/
    );
    await page.screenshot({
      path: `${output}/flashcards-${width}.png`,
      animations: "disabled",
    });
    await panel.getByRole("button", { name: "New", exact: true }).click();
    await panel.getByText("Hey Alex!", { exact: false }).waitFor();
    await panel.getByRole("button", { name: "Test me", exact: false }).click();
    await panel
      .getByRole("button", { name: "A quiz on what you've read", exact: false })
      .click();
    await panel.locator("fieldset").first().waitFor();
    assert.equal(await panel.locator(".sp-reveal").count(), 0);
    await panel
      .locator("fieldset")
      .first()
      .getByRole("button", { name: "Light", exact: true })
      .click();
    await panel.locator(".sp-reveal").waitFor();
    await page.screenshot({
      path: `${output}/quiz-${width}.png`,
      animations: "disabled",
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        width,
        errors,
        overflow,
        opening: true,
        flashcardFlip: true,
        quizReveal: true,
      })
    );
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
} finally {
  await browser.close();
}
