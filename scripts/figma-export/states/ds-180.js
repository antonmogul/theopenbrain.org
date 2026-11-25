(() => {
  const s = document.querySelector("#tuning svg");
  for (let i = 0; i < 3; i++)
    s.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
      })
    );
})();
