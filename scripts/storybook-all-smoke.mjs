import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
const concurrency = Number(process.env.STORYBOOK_SMOKE_CONCURRENCY || 4);
const index = JSON.parse(await readFile("storybook-static/index.json", "utf8"));
const stories = Object.values(index.entries || {})
  .filter((entry) => entry.type === "story")
  .map((entry) => entry.id)
  .sort();
const expectedConsoleErrors = new Map([
  [
    "chapter-demos-labpanel--load-error",
    [/useCodeLabs: Error loading lab: Error: Lab not found/],
  ],
  [
    "chapter-demos-quizpanel--load-error",
    [
      /useQuizzes: Error fetching quiz: Error: Quiz unavailable in this preview/,
      /QuizPanel: Error loading quiz: Error: Quiz unavailable in this preview/,
    ],
  ],
]);

const browser = await chromium.launch({ headless: true });
const failures = [];
let cursor = 0;

async function worker() {
  while (cursor < stories.length) {
    const id = stories[cursor++];
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const errors = [];
    const externalRequests = new Set();

    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== new URL(baseUrl).origin
      ) {
        externalRequests.add(url.origin);
        await route.abort();
        return;
      }
      await route.continue();
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (/Failed to load resource|404 \(Not Found\)/i.test(text)) return;
      if (
        (expectedConsoleErrors.get(id) || []).some((pattern) =>
          pattern.test(text)
        )
      )
        return;
      errors.push(text);
    });

    try {
      const response = await page.goto(
        `${baseUrl}/iframe?id=${id}&viewMode=story`,
        { waitUntil: "domcontentloaded", timeout: 30_000 }
      );
      await page
        .locator(
          '#storybook-root > *, .modal-root, [data-testid="ai-tutor-sidebar"]'
        )
        .first()
        .waitFor({ state: "attached", timeout: 15_000 });
      await page.waitForTimeout(350);
      if (id === "views-widgets-pythonplaygroundview--deterministic-run") {
        await page.getByRole("button", { name: "Run", exact: true }).click();
        await page.getByText("Storybook Python preview completed.").waitFor({
          state: "visible",
          timeout: 5_000,
        });
      }
      if (!response?.ok()) errors.push(`HTTP ${response?.status()}`);
      if (externalRequests.size) {
        errors.push(`external requests: ${[...externalRequests].join(", ")}`);
      }
    } catch (error) {
      errors.push(error.message);
    }

    if (errors.length) failures.push({ id, errors: [...new Set(errors)] });
    else console.log(`mounted ${id}`);
    await page.close();
  }
}

try {
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Mounted ${stories.length}/${stories.length} Storybook stories.`);
}
