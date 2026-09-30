/*
 * npm run tokens:export — write tokens/tokens.json from the CSS (OPENBRAIN-117).
 *
 * Run it after changing a token in src/styles/brand.css (or a .t-* weight in
 * src/index.css) and commit the result; src/__tests__/tokens.test.js fails
 * while the two disagree. Then update the Figma design system file's
 * variables to match (docs/design-system/figma-sync.md).
 */
import { readFile, writeFile } from "node:fs/promises";
import { extractTokens } from "./extract.mjs";

const brand = await readFile("src/styles/brand.css", "utf8");
const index = await readFile("src/index.css", "utf8");
const tokens = extractTokens(brand, index);
await writeFile("tokens/tokens.json", JSON.stringify(tokens, null, 2) + "\n");
console.log(
  `tokens/tokens.json: ${Object.keys(tokens.color.light).length} colours, ` +
    `${Object.keys(tokens.chapter).length} chapter ramps, ` +
    `${Object.keys(tokens.type).length} type roles`
);
