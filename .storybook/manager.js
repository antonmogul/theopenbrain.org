/*
 * Storybook manager (the chrome around the stories): the Open Brain theme and
 * a "Figma" toolbar button (OPENBRAIN-115).
 *
 * The button opens the story's Figma component or frame: from
 * `parameters.design.url` if the story sets one, otherwise from the
 * title → node map in .storybook/figma.js (FIGMA_BY_TITLE), which is where
 * the links normally live. Stories with no link show the button disabled, so
 * the gaps stay visible. It is a local addon on purpose: the link is all we need, and it
 * adds no dependency.
 */
import React from "react";
import {
  addons,
  types,
  useParameter,
  useStorybookState,
} from "storybook/manager-api";
import { IconButton } from "storybook/internal/components";
import { managerTheme } from "./theme";
import { figmaUrlForTitle } from "./figma";

addons.setConfig({
  theme: managerTheme,
  sidebar: { showRoots: true },
});

const ADDON_ID = "open-brain/figma";

/* Figma's mark, drawn small so it sits with Storybook's own toolbar icons. */
function FigmaMark() {
  const d = [
    "M5 5.5A2.5 2.5 0 0 1 7.5 3H10v5H7.5A2.5 2.5 0 0 1 5 5.5Z",
    "M10 3h2.5a2.5 2.5 0 0 1 0 5H10V3Z",
    "M5 10.5A2.5 2.5 0 0 1 7.5 8H10v5H7.5A2.5 2.5 0 0 1 5 10.5Z",
    "M10 10.5a2.5 2.5 0 1 1 5 0a2.5 2.5 0 0 1-5 0Z",
    "M5 15.5A2.5 2.5 0 0 1 7.5 13H10v2.5a2.5 2.5 0 0 1-5 0Z",
  ];
  return React.createElement(
    "svg",
    { width: 14, height: 14, viewBox: "3 2 14 16", "aria-hidden": true },
    d.map((p) =>
      React.createElement("path", {
        key: p,
        d: p,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.3,
      })
    )
  );
}

function FigmaTool() {
  const design = useParameter("design", null);
  const state = useStorybookState();
  const entry = state.index && state.index[state.storyId];
  const url = (design && design.url) || figmaUrlForTitle(entry && entry.title);
  return React.createElement(
    IconButton,
    {
      key: ADDON_ID,
      title: url
        ? "Open this component in Figma"
        : "No Figma link for this story yet",
      disabled: !url,
      onClick: () => url && window.open(url, "_blank", "noopener"),
    },
    React.createElement(FigmaMark),
    React.createElement(
      "span",
      { style: { marginLeft: 6, fontSize: 12 } },
      "Figma"
    )
  );
}

addons.register(ADDON_ID, () => {
  addons.add(`${ADDON_ID}/tool`, {
    type: types.TOOL,
    title: "Figma",
    match: ({ viewMode }) => viewMode === "story" || viewMode === "docs",
    render: FigmaTool,
  });
});
