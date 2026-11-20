(() => {
  const el = document.querySelector("input.cv-spectrum");
  el.value = 650;
  el.dispatchEvent(new Event("input", { bubbles: true }));
})();
