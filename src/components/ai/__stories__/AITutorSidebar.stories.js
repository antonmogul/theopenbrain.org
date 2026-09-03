/*
 * Student/AI Tutor/AITutorSidebar — the slide-in tutor panel.
 *
 * It teleports to <body> and pins itself to the right edge, so it renders
 * over the canvas rather than inside it (hence no autodocs page). On mount it
 * lists `ai_conversations` for the module and reopens the active one, which
 * is what the states below drive through `parameters.api`. Sending a message
 * goes to the AI-tutor mock response, never a network call.
 */
import { fn } from "storybook/test";
import AITutorSidebar from "../AITutorSidebar.vue";
import { apiFixtures, moduleFixture } from "@/stories/openBrainFixtures";

const CONVERSATION = {
  id: "conversation-1",
  user_id: "storybook-student",
  module_id: moduleFixture.id,
  section_id: null,
  title: "AI Tutor Session",
  is_active: true,
  created_at: "2026-08-28T01:00:00Z",
  updated_at: "2026-08-28T01:00:08Z",
};

const MESSAGES = [
  {
    id: "m0",
    conversation_id: CONVERSATION.id,
    role: "system",
    content: "You are a patient neuroscience tutor.",
    created_at: "2026-08-28T01:00:00Z",
  },
  {
    id: "m1",
    conversation_id: CONVERSATION.id,
    role: "user",
    content: "Why does the retina invert the visual image?",
    created_at: "2026-08-28T01:00:02Z",
  },
  {
    id: "m2",
    conversation_id: CONVERSATION.id,
    role: "assistant",
    content:
      "The optics invert the image, while retinal and cortical circuits preserve spatial relationships rather than turning it back physically.",
    created_at: "2026-08-28T01:00:08Z",
  },
];

export default {
  title: "Student/AI Tutor/AITutorSidebar",
  component: AITutorSidebar,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true },
    api: apiFixtures,
  },
  argTypes: {
    moduleId: { control: "text" },
    sectionId: { control: "text" },
    contentContext: {
      control: "text",
      description:
        "Chapter text folded into the system prompt of a new conversation.",
    },
    onClose: { description: "Close button." },
  },
  args: {
    moduleId: moduleFixture.id,
    sectionId: null,
    contentContext: "The chapter traces debates about mind and brain.",
    onClose: fn(),
  },
  render: (args) => ({
    components: { AITutorSidebar },
    setup: () => ({ args }),
    template: `<div style="min-height:720px;"><AITutorSidebar v-bind="args" /></div>`,
  }),
};

/** No conversations yet: the empty chat prompt. */
export const Default = {};

/** The module's active conversation is reopened with its messages. */
export const ActiveConversation = {
  parameters: {
    api: {
      ...apiFixtures,
      "ai_conversations?": [CONVERSATION],
      "ai_messages?": MESSAGES,
    },
  },
};

/** Past conversations only — listed under the history toggle. */
export const HistoryOnly = {
  parameters: {
    api: {
      ...apiFixtures,
      "ai_conversations?": [
        { ...CONVERSATION, is_active: false },
        {
          ...CONVERSATION,
          id: "conversation-2",
          title: "Retina questions",
          is_active: false,
          updated_at: "2026-08-27T18:20:00Z",
        },
      ],
    },
  },
};
