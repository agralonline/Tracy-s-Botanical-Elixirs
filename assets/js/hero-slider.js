// Simple auto-advancing hero image slider.
// Edit HERO_SLIDES to add/remove/reorder hero images — no other code changes needed.
// (A future admin-panel control can replace this list once Firebase is connected.)
export const HERO_SLIDES = [
  "/assets/img/hero/hero-model2.jpg",
  "/assets/img/hero/hero-model3.jpg",
  "/assets/img/hero/hero-model4.jpg",
  "/assets/img/hero/hero-model5.jpg",
  "/assets/img/hero/hero-model6.jpg",
];

const SLIDE_INTERVAL_MS = 5500;

export function initHeroSlider(rootEl, slides = HERO_SLIDES) {
  if (!rootEl || !slides.length) return;

  const track = rootEl.querySelector("[data-hero-track]");
  const dotsWrap = rootEl.querySelector("[data-hero-dots]");
  if (!track || !dotsWrap) return;

  track.innerHTML = slides
    .map(
      (src, i) =>
        `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url('${src}')"></div>`
    )
    .join("");

  dotsWrap.innerHTML = slides
    .map(
      (_, i) =>
        `<button type="button" class="hero-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
    )
    .join("");

  const slideEls = [...track.querySelectorAll(".hero-slide")];
  const dotEls = [...dotsWrap.querySelectorAll(".hero-dot")];
  let current = 0;
  let timer = null;

  function goTo(index) {
    slideEls[current]?.classList.remove("active");
    dotEls[current]?.classList.remove("active");
    current = (index + slideEls.length) % slideEls.length;
    slideEls[current]?.classList.add("active");
    dotEls[current]?.classList.add("active");
  }

  function start() {
    stop();
    timer = setInterval(() => goTo(current + 1), SLIDE_INTERVAL_MS);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  dotEls.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.index));
      start();
    });
  });

  rootEl.addEventListener("mouseenter", stop);
  rootEl.addEventListener("mouseleave", start);

  if (slideEls.length > 1) start();
}
