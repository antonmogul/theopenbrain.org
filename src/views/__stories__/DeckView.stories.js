/*
 * Views/Foundations/DeckView — /deck (the funder deck) and /deck/templates.
 * Static content: no API or auth.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import DeckView from "../DeckView.vue";

const mount = (path, deck) => () => ({
  components: { DeckView, ViewStoryShell },
  setup: () => ({ path, deck }),
  template: `<ViewStoryShell label="DeckView" :path="path"><DeckView :deck="deck" /></ViewStoryShell>`,
});

export default {
  title: "Views/Foundations/DeckView",
  component: DeckView,
  parameters: { layout: "fullscreen" },
};

/** The funding deck at /deck. */
export const Funding = { render: mount("/deck", "funding") };

/** The slide templates at /deck/templates. */
export const Templates = { render: mount("/deck/templates", "templates") };
