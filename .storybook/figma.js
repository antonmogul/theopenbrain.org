/*
 * Links from Storybook to the Figma design system file (OPENBRAIN-115/116).
 *
 * "Open Brain — Design System" mirrors the code's tokens and components one
 * to one (see the Guides/Figma docs page). The Figma button in the toolbar
 * (.storybook/manager.js) opens the node for the current story:
 *
 *   1. `parameters.design.url` on the story or its file, if set; otherwise
 *   2. FIGMA_BY_TITLE below, matched on the story's title (the longest
 *      matching title prefix wins, so a group can have a default).
 *
 * Keep this map as the one place the links live: add a line when a Figma
 * component lands. Node ids come from the Figma URL (`node-id=20-62`).
 */
export const FIGMA_FILE =
  "https://www.figma.com/design/NAjmvySrMHLtWYqn2zi4h4/Open-Brain-Design-System";

/** A link to one node in the design system file. */
export const figmaNode = (nodeId) =>
  `${FIGMA_FILE}?node-id=${String(nodeId).replace(":", "-")}`;

/** Named nodes, for the pages that aren't a single component. */
export const FIGMA_NODES = {
  cover: "2-227",
  foundations: "2-2",
  typeDesktopVsPhone: "10-2",
  layoutGrid: "12-2",
  button: "1-161",
  icons: "67-2",
  chapterKitDesktop: "36-2",
  chapterKitTablet: "71-513",
  chapterKitPhone: "36-175",
  libraryGuide: "73-2",
};

/** Story title → Figma node. */
export const FIGMA_BY_TITLE = {
  "Guides/Figma": FIGMA_NODES.cover,
  "Foundations/Colours": FIGMA_NODES.foundations,
  "Foundations/Typography": FIGMA_NODES.typeDesktopVsPhone,
  "Foundations/Layout": FIGMA_NODES.layoutGrid,
  // Atoms
  "Foundations/Button": "1-161",
  "Foundations/StatusBadge": "20-62",
  "Foundations/PreviewTag": "20-75",
  "Foundations/Forms/Switch": "21-10",
  "Foundations/Forms/SegmentedControl": "21-32",
  "Foundations/Forms/FilterChips": "21-48",
  "Foundations/Forms/SearchInput": "22-19",
  "Foundations/Forms/FormField": "22-86",
  "Foundations/Pagination": "23-11",
  // Molecules
  "Foundations/BaseCard": "25-34",
  "Dashboard/StatCard": "25-54",
  "Foundations/ListRow": "26-22",
  "Foundations/Forms/ToggleRow": "26-53",
  "Foundations/EmptyState": "27-11",
  "Foundations/ErrorState": "27-23",
  "Foundations/LoadingState": "27-54",
  "Foundations/SectionHeader": "27-81",
  "Foundations/BaseModal": "27-137",
  "Foundations/ConfirmDialog": "27-171",
  "Foundations/DataTable": "27-352",
  // Book blocks
  "Chapter/ReaderShell/ReaderTopBar": "28-127",
  "Chapter/Highlighting/HighlightToolbar": "35-31",
  "Chapter/ReaderShell/ReaderSidebar": "35-32",
  "Chapter/Opener/OpenerHero": "29-16",
  "Chapter/Opener/OpenerToc": "29-97",
  "Chapter/Opener/ChapterOpener": "29-97",
  // The Reader text page: Section heading, Author block and Paragraph.
  "Chapter/Text/SectionComp": "28-88",
  "Chapter/Illustrations/IllustrationPlaceholder": "31-40",
  "Chapter/Illustrations/FigureImages": "35-120",
  "Chapter/Text/BreakoutBox": "32-21",
  "Chapter/Text/WidgetBreakout": "33-65",
  "Chapter/EndOfChapterCallout": "69-392",
  "Chapter/ReaderShell/TextComp": FIGMA_NODES.chapterKitDesktop,
  // Library (/chapters)
  "Chapter/BookContents": "86-86",
  // Dashboards
  "Dashboard/DashboardRail": "79-20",
  "Dashboard/DashboardShell": "79-6",
  "Dashboard/DashboardNavIcon": FIGMA_NODES.icons,
  "Student/Dashboard Cards/ProgressCard": "80-88",
  "Student/Dashboard Cards/StudyStats": "80-129",
  // Page templates composed from the components
  "Views/Student/StudentDashboardView": "83-2",
  "Views/Student/ChaptersView": "88-425",
  "Views/Admin/DashboardView": "94-851",
};

/** The Figma link for a story title, or null. */
export function figmaUrlForTitle(title = "") {
  const hit = Object.keys(FIGMA_BY_TITLE)
    .filter((t) => title === t || title.startsWith(`${t}/`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? figmaNode(FIGMA_BY_TITLE[hit]) : null;
}
