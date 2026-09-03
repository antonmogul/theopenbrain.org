/*
 * Student/AI Tutor/AITutorChat — the message list and composer.
 *
 * Presentational: the sidebar owns the conversation and passes `messages`
 * down. System messages are filtered out of the list, `streaming` shows the
 * typing indicator and `loading` blocks sending.
 */
import { fn } from "storybook/test";
import AITutorChat from "../AITutorChat.vue";

const at = (seconds) =>
  `2026-08-28T01:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}Z`;

const MESSAGES = [
  {
    id: "m1",
    role: "user",
    content: "Why does the retina invert the visual image?",
    created_at: at(0),
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "The optics invert the image, while retinal and cortical circuits preserve spatial relationships rather than turning it back physically.",
    created_at: at(8),
  },
];

const LONG_THREAD = Array.from({ length: 14 }, (_, i) => ({
  id: `long-${i + 1}`,
  role: i % 2 === 0 ? "user" : "assistant",
  content:
    i % 2 === 0
      ? `Follow-up ${i / 2 + 1}: what happens at the next synapse?`
      : "Bipolar cells relay the photoreceptor signal to ganglion cells, with horizontal and amacrine cells shaping it laterally along the way.",
  created_at: at(i * 40),
}));

export default {
  title: "Student/AI Tutor/AITutorChat",
  component: AITutorChat,
  tags: ["autodocs"],
  argTypes: {
    messages: {
      control: "object",
      description:
        "{ id, role, content, created_at }[]; system messages are hidden.",
    },
    loading: { control: "boolean", description: "Blocks sending." },
    streaming: {
      control: "boolean",
      description: "Shows the typing indicator.",
    },
    onSend: { description: "Emitted with the trimmed input." },
  },
  args: { messages: MESSAGES, loading: false, streaming: false, onSend: fn() },
  render: (args) => ({
    components: { AITutorChat },
    setup: () => ({ args }),
    template: `<div style="height:620px;max-width:720px;"><AITutorChat v-bind="args" /></div>`,
  }),
};

/** A question and its answer. */
export const Default = {};

/** Fresh conversation: the "ask me anything" prompt. */
export const Empty = { args: { messages: [] } };

/** The assistant is typing. */
export const Streaming = { args: { streaming: true } };

/** Waiting on the API: composer disabled. */
export const Loading = { args: { loading: true } };

/** Fourteen messages — the list scrolls to the newest. */
export const LongThread = { args: { messages: LONG_THREAD } };

/** The system prompt is stored as a message but never shown. */
export const SystemMessageHidden = {
  args: {
    messages: [
      {
        id: "m0",
        role: "system",
        content: "You are a patient neuroscience tutor.",
        created_at: at(0),
      },
      ...MESSAGES,
    ],
  },
};
