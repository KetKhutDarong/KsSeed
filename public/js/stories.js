// stories.js
// ✅ Works on BOTH homepage (#homeStoriesGrid) and farmers-stories.html (#storiesGrid)

(function () {
  // ── Detect which page we're on ──────────────────────────────
  const homeGrid = document.getElementById("homeStoriesGrid"); // homepage
  const storiesGrid = document.getElementById("storiesGrid"); // farmers-stories.html

  // If neither grid exists on this page, do nothing
  if (!homeGrid && !storiesGrid) return;

  const isHomePage = !!homeGrid;
  const isStoriesPage = !!storiesGrid;

  // ── State (only needed on farmers-stories.html) ─────────────
  let allStories = [];
  let displayedCount = 0;
  let totalStories = 0;
  let isLoading = false;
  const itemsPerPage = 3;

  // ── Create one story card ───────────────────────────────────
  function createStoryCard(story) {
    const card = document.createElement("div");
    card.className = "story-card";

    const lang = window.currentLang || "en";
    const title = story.title?.[lang] || story.title?.en || "";
    const description =
      story.description?.[lang] || story.description?.en || "";
    const province = story.province?.[lang] || story.province?.en || "";

    const playButtonHTML =
      story.hasVideo && story.videoUrl
        ? `<button class="play-button" onclick="event.stopPropagation(); openVideo('${story.videoUrl}')">
           <i class="ri-play-fill"></i>
         </button>`
        : story.hasVideo && !story.videoUrl
          ? `<div class="coming-soon-badge" title="Coming Soon">🎬</div>`
          : "";

    card.innerHTML = `
      <div class="story-media">
        <img src="${story.image || ""}" alt="${title}" onerror="this.style.display='none'">
        ${playButtonHTML}
      </div>
      <div class="story-content">
        <h3 class="story-title"
            data-en="${story.title?.en || ""}"
            data-km="${story.title?.km || ""}">${title}</h3>
        <p class="story-description"
           data-en="${story.description?.en || ""}"
           data-km="${story.description?.km || ""}">${description}</p>
        <span class="story-location"
              data-en="📍 ${story.province?.en || ""}"
              data-km="📍 ${story.province?.km || ""}">📍 ${province}</span>
      </div>
    `;
    return card;
  }

  // ── Render stories into the correct grid ────────────────────
  function displayStories(stories) {
    const grid = storiesGrid || homeGrid;
    if (!grid) return;
    grid.innerHTML = "";
    stories.forEach((story) => grid.appendChild(createStoryCard(story)));
  }

  // ── Update Load More button (stories page only) ─────────────
  function updateLoadMoreButton() {
    const btn = document.getElementById("loadMoreBtn");
    if (!btn) return;
    const lang = window.currentLang || "en";
    btn.textContent = lang === "km" ? "បន្ថែមរឿងទៀត" : "Load More Stories";
    btn.classList.toggle("hidden", displayedCount >= totalStories);
  }

  // ── Fetch stories from API ──────────────────────────────────
  async function fetchStories(page, limit) {
    const res = await fetch(`/api/stories?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Load More (stories page only) ──────────────────────────
  async function loadMore() {
    if (isLoading || displayedCount >= totalStories) return;

    isLoading = true;
    const btn = document.getElementById("loadMoreBtn");
    if (btn) {
      btn.textContent = "...";
      btn.disabled = true;
    }

    try {
      const nextPage = Math.floor(displayedCount / itemsPerPage) + 1;
      const data = await fetchStories(nextPage, itemsPerPage);

      if (data.success && Array.isArray(data.stories)) {
        allStories = [...allStories, ...data.stories];
        displayedCount = allStories.length;
        totalStories = data.total;
        displayStories(allStories);
        updateLoadMoreButton();
      }
    } catch (err) {
      console.error("❌ Load more failed:", err.message);
      updateLoadMoreButton();
    } finally {
      if (btn) btn.disabled = false;
      isLoading = false;
    }
  }

  // ── Language switch support ─────────────────────────────────
  window.onLangChange = (function (prev) {
    return function (lang) {
      if (typeof prev === "function") prev(lang);
      window.currentLang = lang;

      // Re-render full stories page
      if (isStoriesPage) {
        displayStories(allStories.slice(0, displayedCount));
        const btn = document.getElementById("loadMoreBtn");
        if (btn)
          btn.textContent =
            lang === "km" ? "បន្ថែមរឿងទៀត" : "Load More Stories";
      }

      // Update homepage cards in place (no re-fetch)
      if (isHomePage) {
        const grid = document.getElementById("homeStoriesGrid");
        if (!grid) return;
        grid.querySelectorAll(".story-title").forEach((el) => {
          el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
        });
        grid.querySelectorAll(".story-description").forEach((el) => {
          el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
        });
        grid.querySelectorAll(".story-location").forEach((el) => {
          el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
        });
      }
    };
  })(window.onLangChange);

  // ── Init: Homepage (fetch 3, done) ──────────────────────────
  async function initHomePage() {
    try {
      const data = await fetchStories(1, 3);
      if (!data.success || !Array.isArray(data.stories)) return;
      allStories = data.stories;
      displayedCount = data.stories.length;
      totalStories = data.total;
      displayStories(allStories);
      console.log(`✅ Homepage stories loaded: ${data.stories.length}`);
    } catch (err) {
      console.error("❌ Failed to load homepage stories:", err.message);
    }
  }

  // ── Init: Stories page (fetch + load more) ──────────────────
  async function initStoriesPage() {
    const loadingEl = document.getElementById("storiesLoading");
    const errorEl = document.getElementById("storiesError");

    try {
      const data = await fetchStories(1, itemsPerPage);
      if (loadingEl) loadingEl.style.display = "none";

      if (!data.success || !Array.isArray(data.stories)) {
        throw new Error("Invalid response from server");
      }

      allStories = data.stories;
      displayedCount = allStories.length;
      totalStories = data.total;

      displayStories(allStories);
      updateLoadMoreButton();
      console.log(
        `✅ Stories page loaded: ${allStories.length} of ${totalStories}`,
      );
    } catch (err) {
      console.error("❌ Failed to load stories:", err.message);
      if (loadingEl) loadingEl.style.display = "none";
      if (errorEl) errorEl.style.display = "block";
    }

    // Attach events
    const btn = document.getElementById("loadMoreBtn");
    if (btn) btn.addEventListener("click", loadMore);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeVideoModal();
    });
    window.addEventListener("click", (e) => {
      const modal = document.getElementById("videoModal");
      if (e.target === modal) closeVideoModal();
    });
  }

  // ── Run correct init based on page ─────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (isHomePage) initHomePage();
    if (isStoriesPage) initStoriesPage();
  });
})(); // end IIFE
