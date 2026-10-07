/*
 * Chapter/ReaderShell/ChatTab — the AI tutor inside the sidebar. It loads
 * the module's conversations through the (mocked) API client and builds its
 * context from the text store's chapter. Live AI is disabled. The separate
 * offline previews rearrange loaded text and never persist mock answers.
 */
import ChatTab from "../ChatTab.vue";
import { sidebarFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/ReaderShell/ChatTab",
  component: ChatTab,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    auth: { role: "student" },
    api: { ai_conversations: [] },
  },
  args: { moduleId: "retina-module" },
  argTypes: {
    moduleId: {
      control: "text",
      description: "Scopes conversations to a module.",
    },
  },
  render: sidebarFrame(ChatTab),
};

/** First use: live AI unavailable; optional offline previews. */
export const Default = {};

/** An existing conversation with an assistant reply. */
export const WithHistory = {
  parameters: {
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
