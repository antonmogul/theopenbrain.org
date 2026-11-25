/*
 * Chapter/ReaderShell/PlayMark — the reader's one play button
 * (OPENBRAIN-87).
 *
 * A white square with the play triangle in the plate's dark, one drawing at
 * every size: a video's poster (64px), a small frame's poster (36px), a
 * gallery's thumbnail (16px), and the gallery's own play and pause, where
 * the square takes the ink of its ground and the icon is a hole in it.
 */
import PlayMark from "../PlayMark.vue";

const row = "display:flex;align-items:center;gap:1.5rem;padding:1.5rem;";

export default {
  title: "Chapter/ReaderShell/PlayMark",
  component: PlayMark,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};

/** Over a picture or the dark pane: every size is the same drawing. */
export const Sizes = {
  render: () => ({
    components: { PlayMark },
    template: `<div data-chapter="fund" style="${row}background:rgb(var(--color-dark-surface));">
      <PlayMark style="--play-mark-size:64px" />
      <PlayMark style="--play-mark-size:36px" />
      <PlayMark />
      <PlayMark style="--play-mark-size:1rem" />
      <PlayMark icon="pause" />
    </div>`,
  }),
};

/** Inside a control, the triangle takes the chapter's colour on hover and
 *  focus. */
export const InAControl = {
  render: () => ({
    components: { PlayMark },
    template: `<div data-chapter="fund" style="${row}background:rgb(var(--color-dark-surface));">
      <button type="button" aria-label="Play video" style="padding:0;border:0;background:none;cursor:pointer;">
        <PlayMark style="--play-mark-size:64px" />
      </button>
    </div>`,
  }),
};

/** Cut: the gallery's play and pause, in the ink of whatever ground the
 *  gallery is on (the dark pane, paper, a chapter-colour box). */
export const Cut = {
  render: () => ({
    components: { PlayMark },
    template: `<div data-chapter="fund">
      <div style="${row}background:rgb(var(--color-dark-surface));color:#fff;">
        <PlayMark cut style="--play-mark-size:2rem" />
        <PlayMark cut icon="pause" style="--play-mark-size:2rem" />
      </div>
      <div style="${row}background:rgb(var(--color-paper));color:rgb(var(--color-ink));">
        <PlayMark cut style="--play-mark-size:2rem" />
        <PlayMark cut icon="pause" style="--play-mark-size:2rem" />
      </div>
      <div style="${row}background:rgb(var(--color-chapter));color:#fff;">
        <PlayMark cut style="--play-mark-size:2rem" />
        <PlayMark cut icon="pause" style="--play-mark-size:2rem" />
      </div>
    </div>`,
  }),
};
