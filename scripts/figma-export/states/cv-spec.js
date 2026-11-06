(() => {
  const c = (t) =>
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim().toLowerCase() === t)
      .click();
  c("spectrum");
  c("achromatopsia");
})();
