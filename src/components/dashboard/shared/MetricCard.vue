<script>
// Deprecated alias — MetricCard was renamed StatCard in the token rebuild.
// Kept as a re-export shim so the dead refactor modules (AnalyticsSection,
// QuizzesSection) still resolve until they're retired in the Creator/cleanup
// phase. Do not use in new code; import StatCard instead.
export { default } from "./StatCard.vue";
</script>
