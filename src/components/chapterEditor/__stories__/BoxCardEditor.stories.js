import BoxCardEditor from "../BoxCardEditor.vue";
const path = "/publicAssets/images/foundations/boxes/hippocrates/";
export default {
  title: "Dashboard/ChapterEditor/BoxCardEditor",
  component: BoxCardEditor,
  args: {
    title: "Hippocrates: the sacred disease and the four humours",
    value: {
      enabled: true,
      image: {
        src: path + "original.webp",
        alt: "Hippocrates refuses the gifts of Artaxerxes",
      },
      layers: [1, 2, 3, 4].map((n, i) => ({
        src: path + `layer${n}.webp`,
        depth: [0.12, 0.4, 0.65, 1][i],
      })),
    },
  },
  render: (args) => ({
    components: { BoxCardEditor },
    setup: () => ({ args }),
    template: '<BoxCardEditor v-bind="args" @change="args.value=$event" />',
  }),
};
export const Layers = {};
export const BeforeMigration = { args: { disabled: true, value: null } };
