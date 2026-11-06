(() => {
  [2, 3].forEach((i) => document.querySelector(`tr[data-cell="${i}"]`).click());
  const s = document.querySelector("#tuning svg");
  for (let i = 0; i < 5; i++)
    s.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
      })
    );
})();
