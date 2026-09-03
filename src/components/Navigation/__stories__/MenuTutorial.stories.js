/*
 * Foundations/Navigation/MenuTutorial — the legacy "?" help control.
 *
 * No props: hovering the icon shows the hard-coded prototype notice, and the
 * icon shifts with useGeneral.activeAbout. White-on-dark by design.
 */
import MenuTutorial from "../MenuTutorial.vue";

export default {
  title: "Foundations/Navigation/MenuTutorial",
  component: MenuTutorial,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { MenuTutorial },
    template: `
      <div style="min-height:240px; padding:32px; background:#111; color:white;">
        <MenuTutorial />
      </div>`,
  }),
};

export const HelpControl = {};
