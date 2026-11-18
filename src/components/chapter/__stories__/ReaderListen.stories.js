import ReaderListen from "../ReaderListen.vue";

export default {
  title: "Chapter/ReaderShell/ReaderListen",
  component: ReaderListen,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { rootId: "listen-story-text" },
  argTypes: {
    rootId: {
      control: false,
      description: "The prose DOM root; the reader uses main#text.",
    },
  },
  render: (args) => ({
    components: { ReaderListen },
    setup: () => ({ args }),
    template: `<div style="min-height:100vh;background:rgb(var(--color-paper));color:rgb(var(--color-ink))">
      <div style="position:fixed;top:0;left:0;right:0;height:64px;display:flex;justify-content:flex-end;align-items:center;padding:0 1rem;border-bottom:1px solid rgb(var(--color-line));z-index:45;background:rgb(var(--color-paper))"><ReaderListen v-bind="args" /></div>
      <main id="listen-story-text" style="max-width:38rem;padding:7rem 1.5rem 8rem;margin:auto">
        <h1>Introduction</h1>
        <div data-paragraph-id="listen-first"><p>How does the brain make sense of the world? This chapter follows the history of that question.</p></div>
        <h2 class="subChapter">A place for the mind</h2>
        <div data-paragraph-id="listen-second"><p>For centuries, scientists looked for the physical home of thought. Their experiments changed how we understand the nervous system.<sup>1</sup></p></div>
        <div data-paragraph-id="listen-third"><p>Today we can trace signals through networks of neurons. Each discovery builds on questions asked by earlier generations.</p></div>
      </main>
    </div>`,
  }),
};

export const Default = {};
const open = async ({ canvasElement }) => {
  canvasElement.querySelector('[aria-label="Listen to this chapter"]')?.click();
};
/** Opens the controls without speaking; press Play to hear browser speech. */
export const ControlsOpen = { play: open };
export const Mobile = { globals: { viewport: { value: "phone" } }, play: open };
