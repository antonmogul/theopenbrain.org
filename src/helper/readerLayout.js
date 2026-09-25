/*
 * The reader's layout breakpoint (OPENBRAIN-89). From this width up the
 * chapter is two columns, text on the right and the figure pane pinned on
 * the left; below it, one column with the figures inline.
 *
 * It used to be 1300px, which put most laptop windows (1280–1299 and below)
 * in the one-column layout and hid the figure pane. At 1024px, with the
 * prose column's floor in brand.css (--reader-prose-w) and the tighter
 * gutters in TextComp, lines still run to about 50 characters.
 *
 * Keep in step with tailwind.config.js `screens.reader` and the CSS media
 * queries that name this file (src/__tests__/readerLayout.test.js checks).
 */
export const READER_TWO_COLUMN_PX = 1024;
export const READER_WIDE_QUERY = `(min-width: ${READER_TWO_COLUMN_PX}px)`;
export const READER_NARROW_QUERY = `(max-width: ${READER_TWO_COLUMN_PX - 1}px)`;
