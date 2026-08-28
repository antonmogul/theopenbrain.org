import AITutorChat from "../AITutorChat.vue";
import AITutorSidebar from "../AITutorSidebar.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Student/AI Tutor",
  parameters: { auth: { authenticated: true }, api: apiFixtures },
};

export const Conversation = {
  render: () => ({
    components: { AITutorChat },
    data: () => ({
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Why does the retina invert the visual image?",
          created_at: "2026-08-28T01:00:00Z",
        },
        {
          id: "m2",
          role: "assistant",
          content:
            "The optics invert the image, while retinal and cortical circuits preserve spatial relationships rather than turning it back physically.",
          created_at: "2026-08-28T01:00:08Z",
        },
      ],
    }),
    template:
      '<div style="height:620px;max-width:720px"><AITutorChat :messages="messages" /></div>',
  }),
};

export const Sidebar = {
  render: () => ({
    components: { AITutorSidebar },
    template:
      '<AITutorSidebar module-id="module-foundations" content-context="The chapter traces debates about mind and brain." />',
  }),
};
