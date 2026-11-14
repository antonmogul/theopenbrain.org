(() => {
  const s = document.querySelector(".faculty-picker select");
  s.value = "13";
  s.dispatchEvent(new Event("change", { bubbles: true }));
})();
