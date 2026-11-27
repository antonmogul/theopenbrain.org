<script setup>
import { onMounted, watch } from "vue";
import { useStudyPartner } from "@/composables/useStudyPartner";
import StudyPartnerPanel from "@/components/ai/StudyPartnerPanel.vue";
const {
  user,
  messages,
  conversations,
  busy,
  error,
  opening,
  send,
  load,
  cancel,
  startNew,
} = useStudyPartner();
let lastQuestion = "";
async function ask(text) {
  lastQuestion = text;
  await send(text);
}
function retry() {
  return lastQuestion ? send(lastQuestion) : opening();
}
onMounted(() => {
  if (user.value) opening();
});
watch(
  () => user.value?.id,
  (id) => {
    if (id) opening();
  }
);
</script>
<template>
  <StudyPartnerPanel
    :signed-in="!!user"
    :messages="messages"
    :conversations="conversations"
    :busy="busy"
    :error="error"
    @send="ask"
    @retry="retry"
    @new="
      lastQuestion = '';
      startNew();
    "
    @load="load"
    @cancel="cancel"
  />
</template>
