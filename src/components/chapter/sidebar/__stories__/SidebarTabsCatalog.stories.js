import ChatTabComponent from "../ChatTab.vue";
import InfoTabComponent from "../InfoTab.vue";
import NotebookTabComponent from "../NotebookTab.vue";
import {
  chapterFrame,
  highlights,
  notes,
  trending,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/ReaderShell/SidebarTabs",
  parameters: { layout: "padded" },
};

const sidebarTemplate = `
  <div style="width:min(420px,100%);height:640px;overflow:auto;border:1px solid rgb(var(--color-line));background:rgb(var(--color-paper));">
    <StoryComponent v-bind="args" />
  </div>`;

export const InfoWithReadingStats = {
  render: chapterFrame(InfoTabComponent, {
    provideReaderData: true,
    template: sidebarTemplate,
  }),
};

export const NotebookWithAnnotations = {
  args: { moduleId: "retina-module" },
  render: chapterFrame(NotebookTabComponent, {
    provideReaderData: true,
    highlights,
    notes,
    template: sidebarTemplate,
  }),
  parameters: { api: { trending_highlights: trending } },
};

export const NotebookEmpty = {
  args: { moduleId: "retina-module" },
  render: chapterFrame(NotebookTabComponent, {
    provideReaderData: true,
    highlights: [],
    notes: [],
    template: sidebarTemplate,
  }),
  parameters: { api: { trending_highlights: [] } },
};

export const ChatFirstUse = {
  args: { moduleId: "retina-module" },
  render: chapterFrame(ChatTabComponent, { template: sidebarTemplate }),
  parameters: { auth: { role: "student" }, api: { ai_conversations: [] } },
};

export const ChatWithHistory = {
  args: { moduleId: "retina-module" },
  render: chapterFrame(ChatTabComponent, { template: sidebarTemplate }),
  parameters: {
    auth: { role: "student" },
    api: {
      ai_conversations: [
        {
          id: "conversation-1",
          module_id: "retina-module",
          title: "Why do rods saturate?",
          is_active: true,
          updated_at: "2026-08-27T19:30:00.000Z",
        },
      ],
      "ai_messages?": [
        {
          id: "message-1",
          role: "assistant",
          content:
            "Rods amplify single-photon responses, which makes them sensitive but gives them a limited operating range in bright light.",
          created_at: "2026-08-27T19:31:00.000Z",
        },
      ],
    },
  },
};
