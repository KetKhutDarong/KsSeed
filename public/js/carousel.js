(function () {
  "use strict";

  const VISIBLE = 3;
  const GAP = 24; // must match CSS gap on .pc-track
  const AUTO_MS = 3000;
  const ANIM_MS = 420; // must match CSS transition duration

  function init() {
    const section = document.getElementById("products-carousel");
    if (!section) return;

    const track = section.querySelector(".pc-track");
    const btnPrev = section.querySelector(".pc-btn-prev");
    const btnNext = section.querySelector(".pc-btn-next");
    const dotsWrap = section.querySelector(".pc-dots");
    if (!track) return;

    // 1. Collect originals before touching DOM
    const originals = Array.from(track.children);
    const total = originals.length;
    if (total === 0) return;

    // 2. Build: [clone last N] [originals] [clone first N]
    track.innerHTML = "";
    originals
      .slice(-VISIBLE)
      .forEach((c) => track.appendChild(c.cloneNode(true)));
    originals.forEach((c) => track.appendChild(c));
    originals
      .slice(0, VISIBLE)
      .forEach((c) => track.appendChild(c.cloneNode(true)));

    const allCards = Array.from(track.children);
    let current = VISIBLE; // points at first real card
    let isMoving = false;
    let autoTimer = null;

    // 3. Build dots
    if (dotsWrap) {
      for (let i = 0; i < total; i++) {
        const d = document.createElement("span");
        d.className = "pc-dot" + (i === 0 ? " active" : "");
        d.addEventListener("click", () => {
          stopAuto();
          goTo(i + VISIBLE);
          startAuto();
        });
        dotsWrap.appendChild(d);
      }
    }

    function updateDots() {
      if (!dotsWrap) return;
      let di = current - VISIBLE;
      if (di < 0) di += total;
      if (di >= total) di -= total;
      dotsWrap
        .querySelectorAll(".pc-dot")
        .forEach((d, i) => d.classList.toggle("active", i === di));
    }

    function cardStep() {
      return allCards[0].offsetWidth + GAP;
    }

    // Instant teleport — no animation, used for loop wrap-around
    function jump(index) {
      current = index;
      track.style.transition = "none";
      track.style.transform = `translateX(${-current * cardStep()}px)`;
      // Force reflow so "none" sticks before next animated move
      track.getBoundingClientRect();
      updateDots();
    }

    // Animated slide
    function goTo(index) {
      if (isMoving) return;
      isMoving = true;
      current = index;

      track.style.transition = `transform ${ANIM_MS}ms cubic-bezier(.4,0,.2,1)`;
      track.style.transform = `translateX(${-current * cardStep()}px)`;
      updateDots();

      // setTimeout instead of transitionend — avoids firing multiple times
      setTimeout(() => {
        isMoving = false;

        // Wrap: landed on right-side clones → snap to real first
        if (current >= total + VISIBLE) {
          jump(VISIBLE);
        }
        // Wrap: landed on left-side clones → snap to real last
        else if (current < VISIBLE) {
          jump(total + VISIBLE - 1);
        }
      }, ANIM_MS);
    }

    function next() {
      goTo(current + 1);
    }
    function prev() {
      goTo(current - 1);
    }

    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(next, AUTO_MS);
    }
    function stopAuto() {
      clearInterval(autoTimer);
      autoTimer = null;
    }

    // Init position (no animation)
    jump(VISIBLE);

    // Arrow buttons
    if (btnNext) {
      btnNext.addEventListener("click", () => {
        stopAuto();
        next();
        startAuto();
      });
    }
    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        stopAuto();
        prev();
        startAuto();
      });
    }

    // Pause on hover
    track.addEventListener("mouseenter", stopAuto);
    track.addEventListener("mouseleave", startAuto);

    // Reposition on resize without animation
    window.addEventListener("resize", () => {
      track.style.transition = "none";
      track.style.transform = `translateX(${-current * cardStep()}px)`;
    });

    startAuto();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
