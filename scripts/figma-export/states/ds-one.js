(() => {
  [1, 2, 3].forEach((i) =>
    document.querySelector(`tr[data-cell="${i}"]`).click()
  );
})();
