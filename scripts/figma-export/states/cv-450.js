(() => {
  const el = document.querySelector("input.cv-spectrum");
  el.value = 450;
  el.dispatchEvent(new Event("input", { bubbles: true }));
})();
