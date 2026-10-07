/*
 * Dashboard/ChapterEditor/LottieUpload — add a Lottie animation (.json) to
 * the media library (OPENBRAIN-70 B4). Choosing a file checks it is really a
 * Lottie animation before offering the upload.
 */
import LottieUpload from "../LottieUpload.vue";

export default {
  title: "Dashboard/ChapterEditor/LottieUpload",
  component: LottieUpload,
  args: { slug: "foundations-of-neuroscience" },
  argTypes: { onUploaded: { action: "uploaded" } },
};

export const Default = {};
