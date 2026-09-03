/*
 * Dashboard/Sections/VersionsSection — content version list + "new version"
 * modal.
 *
 * Status drives the per-card actions (draft → Publish, published → Archive),
 * so the fixture carries one of each.
 */
import VersionsSection from "../VersionsSection.vue";

const VERSIONS = [
  {
    id: "v2",
    version_number: "2.0",
    status: "draft",
    moduleCount: 12,
    created_at: "2026-08-20T00:00:00Z",
    release_notes:
      "Adds Foundations of Neuroscience and revised Retina figures.",
  },
  {
    id: "v1",
    version_number: "1.0",
    status: "published",
    moduleCount: 11,
    created_at: "2026-05-01T00:00:00Z",
    published_at: "2026-06-01T00:00:00Z",
  },
];

export default {
  title: "Dashboard/Sections/VersionsSection",
  component: VersionsSection,
  tags: ["autodocs"],
  argTypes: {
    versions: { control: "object" },
    versionsLoading: { control: "boolean" },
    versionsError: { control: "text" },
    showNewVersionModal: {
      control: "boolean",
      description: "v-model:showNewVersionModal",
    },
    newVersionForm: {
      control: "object",
      description: "v-model:newVersionForm",
    },
  },
  args: {
    versions: VERSIONS,
    versionsLoading: false,
    versionsError: null,
    showNewVersionModal: false,
    newVersionForm: {
      version_number: "2.1",
      release_notes: "Accessibility and copy improvements.",
    },
  },
  render: (args) => ({
    components: { VersionsSection },
    setup: () => ({ args }),
    template: `
      <VersionsSection
        v-bind="args"
        @update:showNewVersionModal="args.showNewVersionModal = $event"
        @update:newVersionForm="args.newVersionForm = $event"
      />`,
  }),
};

export const Populated = {};

export const LoadError = {
  args: { versionsError: "Couldn’t load content versions." },
};

export const Loading = { args: { versionsLoading: true } };

export const Empty = { args: { versions: [] } };

export const NewVersionModal = { args: { showNewVersionModal: true } };
