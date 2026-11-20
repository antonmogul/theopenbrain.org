/** Shared published-reader fixture names. No production data or credentials. */
export const readerChapters = {
  "foundations-of-neuroscience": {
    key: "history",
    title: "History",
    number: 1,
  },
  "the-retina": { key: "retina", title: "Retina", number: 2 },
};
export function readerChapter(args = process.argv.slice(2)) {
  const flag = args.indexOf("--chapter");
  const slug = flag < 0 ? "foundations-of-neuroscience" : args[flag + 1];
  const chapter = readerChapters[slug];
  if (!chapter) throw new Error(`Unknown --chapter ${slug}`);
  return {
    ...chapter,
    slug,
    fixture: `src/stories/${chapter.key}FullReaderData.json`,
    assets: `storybook-static/${chapter.key}-full-reader-assets.json`,
    story: `chapter-${chapter.key}-full-reader--published-export`,
  };
}
