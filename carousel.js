(() => {
  const root = document.getElementById("carousel");
  if (!root) return;

  const imageFiles = [
    "1.png",
    "2.png",
    "3.png",
    "4.png",
    "5.png",
    "6.png",
  ];

  const images = imageFiles.map((name) =>
    encodeURI(`./assets/carousel/${name}`)
  );

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.innerHTML = `
    <section class="carousel" aria-label="Screenshots">
      <div class="carousel__viewport" tabindex="0" aria-roledescription="carousel" aria-label="Carousel">
        <div class="carousel__track">
          ${images
            .map(
              (src, i) => `
                <div class="carousel__slide" role="group" aria-roledescription="slide" aria-label="${
                  i + 1
                } of ${images.length}">
                  <img class="carousel__img" src="${src}" alt="Screenshot ${
                i + 1
              }" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" />
                </div>
              `
            )
            .join("")}
        </div>
      </div>

      <button class="carousel__btn carousel__btn--prev" type="button" aria-label="Previous slide">
        <span aria-hidden="true">‹</span>
      </button>
      <button class="carousel__btn carousel__btn--next" type="button" aria-label="Next slide">
        <span aria-hidden="true">›</span>
      </button>

      <div class="carousel__meta">
        <div class="carousel__dots" role="tablist" aria-label="Choose slide">
          ${images
            .map(
              (_, i) =>
                `<button class="carousel__dot" type="button" role="tab" aria-label="Go to slide ${
                  i + 1
                }" aria-selected="false" tabindex="-1"></button>`
            )
            .join("")}
        </div>
        <div class="sr-only" aria-live="polite" aria-atomic="true"></div>
      </div>
    </section>
  `;

  const viewport = root.querySelector(".carousel__viewport");
  const track = root.querySelector(".carousel__track");
  const slides = Array.from(root.querySelectorAll(".carousel__slide"));
  const prevBtn = root.querySelector(".carousel__btn--prev");
  const nextBtn = root.querySelector(".carousel__btn--next");
  const dots = Array.from(root.querySelectorAll(".carousel__dot"));
  const live = root.querySelector('[aria-live="polite"]');

  if (
    !viewport ||
    !track ||
    !prevBtn ||
    !nextBtn ||
    slides.length === 0 ||
    dots.length !== slides.length ||
    !live
  ) {
    return;
  }

  let index = 0;
  let autoplayId = null;

  const clampIndex = (i) =>
    ((i % slides.length) + slides.length) % slides.length;

  const render = (nextIndex, { announce = true, focusDot = false } = {}) => {
    index = clampIndex(nextIndex);
    track.style.transform = `translateX(${-index * 100}%)`;

    dots.forEach((dot, i) => {
      const isActive = i === index;
      dot.setAttribute("aria-selected", String(isActive));
      dot.tabIndex = isActive ? 0 : -1;
      dot.classList.toggle("is-active", isActive);
      if (isActive && focusDot) dot.focus({ preventScroll: true });
    });

    if (announce) {
      live.textContent = `Slide ${index + 1} of ${slides.length}`;
    }
  };

  const stopAutoplay = () => {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  };

  const startAutoplay = () => {
    if (prefersReducedMotion) return;
    if (autoplayId) return;
    autoplayId = window.setInterval(
      () => render(index + 1, { announce: false }),
      3000
    );
  };

  prevBtn.addEventListener("click", () => render(index - 1));
  nextBtn.addEventListener("click", () => render(index + 1));

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => render(i, { focusDot: true }));
  });

  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      render(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      render(index + 1);
    }
  });

  // Pause/resume autoplay on interaction
  const pauseEvents = ["mouseenter", "focusin", "pointerdown", "touchstart"];
  const resumeEvents = ["mouseleave", "focusout"];
  pauseEvents.forEach((evt) =>
    root.addEventListener(evt, stopAutoplay, { passive: true })
  );
  resumeEvents.forEach((evt) =>
    root.addEventListener(evt, startAutoplay, { passive: true })
  );

  // Swipe support via pointer events
  let pointerActive = false;
  let startX = 0;
  let deltaX = 0;

  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerActive = true;
    startX = e.clientX;
    deltaX = 0;
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!pointerActive) return;
    deltaX = e.clientX - startX;
  });

  const endPointer = () => {
    if (!pointerActive) return;
    pointerActive = false;
    const threshold = 40;
    if (deltaX > threshold) render(index - 1);
    else if (deltaX < -threshold) render(index + 1);
    deltaX = 0;
  };

  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);

  // Initial state
  render(0, { announce: false });
  startAutoplay();
})();
