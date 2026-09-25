/*
 * Chapter/Text/ReferenceList — a chapter's references from the references
 * table (OPENBRAIN-92): the authors' own text, a link to each source.
 */
import ReferenceList from "../ReferenceList.vue";

export default {
  title: "Chapter/Text/ReferenceList",
  component: ReferenceList,
  args: {
    references: [
      {
        number: 1,
        raw_text:
          "Finger, S. <em>Origins of neuroscience: a history of explorations into brain function</em>. (Oxford Univ. Press, 2001).",
        doi: null,
        url: null,
      },
      {
        number: 6,
        raw_text:
          "Masland, R. H. The neuronal organization of the retina. <em>Neuron</em> <strong>76</strong>, 266–280 (2012).",
        doi: "10.1016/j.neuron.2012.10.002",
      },
      {
        number: 7,
        raw_text:
          "Weschler, L. A Rare, Personal Look at Oliver Sacks’s Early Career. <em>Vanity Fair</em> https://www.vanityfair.com/culture/2015/04/oliver-sacks-autobiography-before-cancer (2015).",
        url: "https://www.vanityfair.com/culture/2015/04/oliver-sacks-autobiography-before-cancer",
      },
    ],
  },
  render: (args) => ({
    components: { ReferenceList },
    setup: () => ({ args }),
    template: `<div style="max-width:640px;padding:24px;font-family:var(--font-body);color:rgb(var(--color-ink));"><ReferenceList v-bind="args" /></div>`,
  }),
};

/** A book, an article with a DOI, and a web page. */
export const Default = {};
