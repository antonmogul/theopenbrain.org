(() => {
  const r = [
    ...document.querySelectorAll(
      "section.cv-sec:nth-of-type(3) input[type=range]"
    ),
  ];
  [255, 200, 30].forEach((v, i) => {
    r[i].value = v;
    r[i].dispatchEvent(new Event("input", { bubbles: true }));
  });
})();
