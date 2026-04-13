import { useAnimation } from "../stores/animation";

const animationStore = useAnimation();

const pointAdderAnimation = () => {
  let trigger = document.getElementById("animation-1-structures");
  if (!trigger) return;
  trigger.addEventListener("mouseenter", () => {
    animationStore.enterHoverPunkt("animation-1-structures");
  });

  trigger.addEventListener("mouseleave", () => {
    animationStore.leaveHoverPunkt("animation-1-structures");
  });

  let triggerB = trigger.getBoundingClientRect();
  let _container = document.getElementById("containerPunkt");
  let punkt = document.createElement("div");
  punkt.classList.add("punkt");
  punkt.id = "punkt-" + trigger.id;
  punkt.style.top = window.scrollY + triggerB.y - triggerB.height / 2 + "px";

  punkt.addEventListener("mouseenter", () => {
    animationStore.enterHoverAnimation("animation-1-structures");
  });
  punkt.addEventListener("mouseleave", () => {
    animationStore.leaveHoverAnimation("animation-1-structures");
  });

  _container.appendChild(punkt);
};

export { pointAdderAnimation };
