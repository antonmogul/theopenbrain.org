/*
 * Chapter/ReaderSplit — the reader's desktop geometry on its own, with no
 * chapter content: the figure pane (`w-illus`) on the left, the prose column
 * (`w-text`) pinned right, and the divider between them. Both widths derive
 * from `--reader-prose-w` (brand.css), restored to the original 50/50 by
 * OPENBRAIN-31 (50vw, capped at the legacy 890px measure).
 *
 * Story-only: there is no component to mount. It exists so a change to the
 * split token can be reviewed at a glance — the divider must sit on the
 * measured 50% line (or at 890px from the right edge above ~1780px), and
 * nothing may overlap. Resize the canvas to see the cap engage.
 */
export default {
  title: "Chapter/ReaderSplit",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Figure pane + prose column at the reader's real widths. The prose column is " +
          "`min(50vw, 890px)`; the pane fills the rest.",
      },
    },
  },
};

/*
 * The figure marks on the divider (OPENBRAIN-91, kept under OPENBRAIN-145).
 * Stuart, 24 Sep: "I liked in the demo chapter how there was some indicator
 * in the center divider line when the visual elements on the left would
 * change." Every paragraph that brings a figure into the pane is an
 * .animationTrigger span; index.css gives it a tick on the divider at its
 * top (::before, absolutely positioned, so no layout shift), ink until its
 * figure is showing, then the chapter colour and half as long again
 * (.active, set by IllustrationsComp). The reading-line dot at mid-screen
 * is where a figure switches. Desktop only: below 1024px there is no
 * divider and the figures are inline.
 */
export const FigureMarks = {
  parameters: {
    docs: {
      description: {
        story:
          "Four pane-figure paragraphs in the prose column, the second one active: its mark is the chapter colour. " +
          "Dot, marks and divider all derive their x from `--app-w` − `--reader-prose-w`.",
      },
    },
  },
  render: () => ({
    template: `
      <div data-chapter="fund" style="position:relative; min-height:100vh; font-family:var(--font-body);">
        <div class="w-illus" style="position:fixed; inset:0 auto 0 0; background:rgb(var(--color-bg)); display:grid; place-items:center; color:rgb(var(--color-mute)); font-family:var(--font-mono); font-size:12px;">
          figure pane
        </div>
        <div class="reading-line is-on" aria-hidden="true"></div>
        <main class="ml-text w-text" style="position:relative; margin-left:calc(var(--app-w, 100vw) - var(--reader-prose-w)); min-height:100vh; padding:20vh 5rem 20vh 5rem; background:rgb(var(--color-paper)); border-left:1px solid rgb(var(--color-ink)); font-size:1.0625rem; line-height:1.6;">
          <span id="triggerAnimationDemoFigA" class="animationTrigger block noHighlight" style="display:block; position:relative; margin-bottom:2.5rem;">
            <p>A paragraph with a figure. Its mark on the divider is ink: the figure is not on show.</p>
          </span>
          <span id="triggerAnimationDemoFigB" class="animationTrigger active block noHighlight" style="display:block; position:relative; margin-bottom:2.5rem;">
            <p>The active paragraph: its figure is in the pane, so its mark takes the chapter colour and grows. The dot at mid-screen is the reading line, where figures switch.</p>
          </span>
          <span id="triggerAnimationDemoFigC" class="animationTrigger block noHighlight" style="display:block; position:relative; margin-bottom:2.5rem;">
            <p>Another figure paragraph, further down.</p>
          </span>
          <p style="margin-bottom:2.5rem;">A paragraph without a figure has no mark.</p>
          <span id="triggerAnimationDemoFigD" class="animationTrigger block noHighlight" style="display:block; position:relative;">
            <p>The last figure paragraph.</p>
          </span>
        </main>
      </div>`,
  }),
};

export const FiftyFifty = {
  render: () => ({
    data: () => ({ width: 0, prose: 0, divider: 0 }),
    mounted() {
      const measure = () => {
        const prose = this.$refs.prose?.getBoundingClientRect();
        this.width = window.innerWidth;
        this.prose = prose ? Math.round(prose.width) : 0;
        this.divider = prose ? Math.round(prose.left) : 0;
      };
      measure();
      window.addEventListener("resize", measure);
      this._measure = measure;
    },
    beforeUnmount() {
      window.removeEventListener("resize", this._measure);
    },
    template: `
      <div style="position:relative; height:100vh; font-family:var(--font-mono); font-size:12px;">
        <div class="w-illus" style="position:absolute; inset:0 auto 0 0; background:rgb(var(--color-bg)); display:grid; place-items:center; color:rgb(var(--color-mute));">
          figure pane · {{ width - prose }}px
        </div>
        <div ref="prose" class="w-text" style="position:absolute; inset:0 0 0 auto; background:rgb(var(--color-paper)); border-left:1px solid rgb(var(--color-ink)); display:grid; place-items:center; color:rgb(var(--color-mute));">
          prose column · {{ prose }}px
        </div>
        <div style="position:absolute; top:12px; left:12px; padding:4px 8px; background:rgb(var(--color-ink)); color:rgb(var(--color-paper));">
          viewport {{ width }}px · divider at {{ divider }}px ({{ width ? Math.round((divider / width) * 100) : 0 }}%)
        </div>
      </div>`,
  }),
};
