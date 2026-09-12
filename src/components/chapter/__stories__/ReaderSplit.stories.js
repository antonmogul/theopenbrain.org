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
