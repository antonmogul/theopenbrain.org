/*
 * Chapter/ReaderShell/FullBleed — full-width blocks in the reader
 * (OPENBRAIN-72). In the reader at desktop widths the content moves into
 * TextComp's stage layer and spans the whole page; Storybook has no stage
 * layer, so this shows the fallback every narrow screen gets: the content
 * stays in the column, `floating` false.
 */
import FullBleed from "../FullBleed.vue";

export default {
  title: "Chapter/ReaderShell/FullBleed",
  component: FullBleed,
  args: { enabled: true },
  render: (args) => ({
    components: { FullBleed },
    setup: () => ({ args }),
    template: `
      <div style="max-width:640px;padding:24px;font-family:var(--font-body)">
        <p>Prose above the block.</p>
        <FullBleed v-bind="args" v-slot="{ floating }">
          <div style="padding:24px;background:rgb(var(--color-bg));border:1px solid rgb(var(--color-line))">
            A full-width block · floating: {{ floating }}
          </div>
        </FullBleed>
        <p>Prose below the block.</p>
      </div>`,
  }),
};

export const InTheColumn = {};
