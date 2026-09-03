import { chromium } from "@playwright/test";

const baseUrl = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
const defaultStories = [
  "chapter-readershell-componentcatalog--citation-tooltip",
  "chapter-readershell-componentcatalog--reader-sidebar-info",
  "chapter-readershell-componentcatalog--text-comp-long-chapter",
  "chapter-readershell-sidebartabs--chat-with-history",
  "chapter-highlighting-componentcatalog--highlight-toolbar-edit",
  "chapter-demos-componentcatalog--quiz-intro",
  "chapter-demos-componentcatalog--lab-ready-to-run",
  "chapter-illustrations-componentcatalog--placeholder-manuscript",
  "chapter-text-componentcatalog--comment-overlay",
  "chapter-text-componentcatalog--section",
];
const stories = process.env.STORYBOOK_STORIES
  ? process.env.STORYBOOK_STORIES.split(",").filter(Boolean)
  : defaultStories;

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const id of stories) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      // Several legacy chapter figures intentionally reference not-yet-bundled
      // local artwork. A missing local asset is not a component mount failure.
      if (/Failed to load resource|404 \(Not Found\)/i.test(text)) return;
      runtimeErrors.push(text);
    });

    try {
      const response = await page.goto(
        `${baseUrl}/iframe?id=${id}&viewMode=story`,
        { waitUntil: "networkidle", timeout: 30_000 }
      );
      await page
        .locator("#storybook-root > *")
        .first()
        .waitFor({ state: "attached", timeout: 15_000 });
      await page.waitForTimeout(250);

      const rootHtml = await page.locator("#storybook-root").innerHTML();
      if (!response?.ok()) runtimeErrors.push(`HTTP ${response?.status()}`);
      if (!rootHtml.trim()) runtimeErrors.push("empty Storybook root");
    } catch (error) {
      const bodyText = (await page.locator("body").innerText()).slice(0, 500);
      runtimeErrors.push(`${error.message}\n${bodyText}`);
    }
    if (runtimeErrors.length) failures.push({ id, runtimeErrors });
    else console.log(`mounted ${id}`);

    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Mounted ${stories.length}/${stories.length} chapter stories.`);
}
