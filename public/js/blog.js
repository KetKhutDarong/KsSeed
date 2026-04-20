class Carousel {
  constructor() {
    this.wrapper = document.getElementById("carouselWrapper");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.dotsContainer = document.getElementById("dotsContainer");

    // Initialize with empty data
    this.originalCards = [];
    this.totalOriginalCards = 0;
    this.cards = [];

    // Configuration
    this.cardWidth = 0;
    this.gap = 30;
    this.currentIndex = 3;
    this.autoScrollInterval = null;
    this.autoScrollDelay = 3000; // 3 seconds
    this.currentLang = localStorage.getItem("ksseed-language") || "en";

    // Initialize
    this.init();
  }

  // Always get the most up-to-date language
  getLang() {
    return (
      window.currentLang ||
      this.currentLang ||
      localStorage.getItem("ksseed-language") ||
      "en"
    );
  }

  async init() {
    try {
      // Load blog data from MongoDB API
      await this.loadBlogData();

      // Set up the carousel
      this.cardWidth = this.originalCards[0]?.offsetWidth || 400;
      this.initDots();
      this.attachEventListeners();
      this.scrollToSlide(false);
      this.startAutoScroll();

      // Handle window resize
      window.addEventListener("resize", () => this.updateCardWidth());
    } catch (error) {
      console.error("Error initializing carousel:", error);
    }
  }

  async loadBlogData() {
    try {
      // Fetch blogs from MongoDB API
      const response = await fetch("/api/blogs?limit=5");
      const data = await response.json();

      if (!data.success || !data.blogs || data.blogs.length === 0) {
        console.warn("No blog data available");
        return;
      }

      // Clear existing content
      this.wrapper.innerHTML = "";
      this.dotsContainer.innerHTML = "";

      // Sort by date descending (newest first), then take 5
      const blogsToShow = data.blogs
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      blogsToShow.forEach((blog) => {
        const card = this.createBlogCard(blog);
        this.wrapper.appendChild(card);
      });

      // Get all cards
      this.originalCards = Array.from(
        this.wrapper.querySelectorAll(".blog-card"),
      );
      this.totalOriginalCards = this.originalCards.length;

      if (this.totalOriginalCards === 0) {
        console.warn("No blog cards created");
        return;
      }

      // Clone cards for infinite scroll effect
      this.cloneCards();
    } catch (error) {
      console.error("Error loading blog data:", error);
      this.wrapper.innerHTML = `
        <div class="carousel-error">
          <p>Unable to load blog posts. Please try again later.</p>
        </div>
      `;
    }
  }

  createBlogCard(blog) {
    const card = document.createElement("div");
    card.className = "blog-card";
    card.dataset.id = blog._id;

    const lang = this.getLang();
    const title = lang === "km" ? blog.title.km : blog.title.en;
    const preview = lang === "km" ? blog.preview.km : blog.preview.en;
    const category = lang === "km" ? blog.category?.km : blog.category?.en;
    const readMoreText = lang === "km" ? "អានបន្ថែម →" : "Read More →";

    card.innerHTML = `
      <div class="blog-image">
        <img
          src="${blog.image || "/placeholder.svg?height=300&width=400"}"
          alt="${title}"
          loading="lazy"
        />
        ${category ? `<span class="blog-category">${category}</span>` : ""}
      </div>
      <div class="blog-content">
        <div class="blog-meta">
          <span class="blog-date"> ${blog.date || "No date"}</span>
          <span class="blog-read">⏱️ ${blog.readTime || 0} min read</span>
        </div>
        <h3>${title}</h3>
        <p>${preview}</p>
        <a href="blog_detail.html?id=${blog._id}" class="blog-link">
          ${readMoreText}
        </a>
      </div>
    `;

    return card;
  }

  cloneCards() {
    if (this.totalOriginalCards === 0) return;

    // Clone first 3 cards to end for infinite scroll
    const firstThree = Array.from(this.originalCards).slice(0, 3);
    firstThree.forEach((card) => {
      const clone = card.cloneNode(true);
      this.wrapper.appendChild(clone);
    });

    // Clone last 3 cards to beginning for infinite scroll
    const lastThree = Array.from(this.originalCards).slice(-3);
    lastThree.reverse().forEach((card) => {
      const clone = card.cloneNode(true);
      this.wrapper.insertBefore(clone, this.wrapper.firstChild);
    });

    // Update cards reference
    this.cards = this.wrapper.querySelectorAll(".blog-card");
  }

  updateCardWidth() {
    if (this.originalCards.length > 0) {
      this.cardWidth = this.originalCards[0].offsetWidth;
    }
  }

  initDots() {
    if (this.totalOriginalCards === 0) return;

    const dotsCount = this.totalOriginalCards;
    this.dotsContainer.innerHTML = ""; // Clear existing dots

    for (let i = 0; i < dotsCount; i++) {
      const dot = document.createElement("div");
      dot.className = "dot" + (i === 0 ? " active" : "");
      dot.setAttribute("data-index", i);
      dot.addEventListener("click", () => this.goToSlide(i));
      this.dotsContainer.appendChild(dot);
    }
  }

  updateDots() {
    if (this.totalOriginalCards === 0) return;

    const dots = this.dotsContainer.querySelectorAll(".dot");
    let displayIndex = this.currentIndex - 3;

    // Handle wrapping
    if (displayIndex < 0) {
      displayIndex += this.totalOriginalCards;
    }
    if (displayIndex >= this.totalOriginalCards) {
      displayIndex -= this.totalOriginalCards;
    }

    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === displayIndex);
    });
  }

  next() {
    if (this.totalOriginalCards === 0) return;

    this.currentIndex++;
    this.scrollToSlide(true);
  }

  prev() {
    if (this.totalOriginalCards === 0) return;

    this.currentIndex--;
    this.scrollToSlide(true);
  }

  scrollToSlide(smooth = true) {
    if (this.totalOriginalCards === 0) return;

    const scrollPosition = this.currentIndex * (this.cardWidth + this.gap);

    if (smooth) {
      this.wrapper.style.scrollBehavior = "smooth";
    } else {
      this.wrapper.style.scrollBehavior = "auto";
    }

    this.wrapper.scrollLeft = scrollPosition;
    this.updateDots();

    // Handle infinite scroll wraparound
    this.handleWraparound();
  }

  handleWraparound() {
    if (this.totalOriginalCards === 0) return;

    // If we're at the cloned end (right side), jump back to real cards
    if (this.currentIndex >= this.totalOriginalCards + 3) {
      setTimeout(() => {
        this.currentIndex = 3;
        this.wrapper.style.scrollBehavior = "auto";
        const scrollPosition = this.currentIndex * (this.cardWidth + this.gap);
        this.wrapper.scrollLeft = scrollPosition;
      }, 300);
    }
    // If we're at the cloned beginning (left side), jump forward to real cards
    else if (this.currentIndex < 0) {
      setTimeout(() => {
        this.currentIndex = this.totalOriginalCards + 2;
        this.wrapper.style.scrollBehavior = "auto";
        const scrollPosition = this.currentIndex * (this.cardWidth + this.gap);
        this.wrapper.scrollLeft = scrollPosition;
      }, 300);
    }
  }

  goToSlide(index) {
    if (this.totalOriginalCards === 0) return;

    this.currentIndex = index + 3;
    this.scrollToSlide(true);
    this.resetAutoScroll();
  }

  startAutoScroll() {
    if (this.totalOriginalCards === 0) return;

    this.autoScrollInterval = setInterval(
      () => this.next(),
      this.autoScrollDelay,
    );
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  resetAutoScroll() {
    this.stopAutoScroll();
    this.startAutoScroll();
  }

  attachEventListeners() {
    if (!this.prevBtn || !this.nextBtn) return;

    this.nextBtn.addEventListener("click", () => {
      this.next();
      this.resetAutoScroll();
    });

    this.prevBtn.addEventListener("click", () => {
      this.prev();
      this.resetAutoScroll();
    });

    if (this.wrapper) {
      this.wrapper.addEventListener("mouseenter", () => this.stopAutoScroll());
      this.wrapper.addEventListener("mouseleave", () => this.startAutoScroll());
    }
  }

  async updateLanguage(lang) {
    this.currentLang = lang;
    await this.refreshCarousel();
  }

  async refreshCarousel() {
    // Stop auto scroll during refresh
    this.stopAutoScroll();

    // Store current blog id
    const currentId = this.getCurrentBlogId();

    // Reload cards in the new language
    await this.loadBlogData();

    // Re-init dots after rebuild
    this.initDots();

    // Update card width in case layout changed
    this.cardWidth = this.originalCards[0]?.offsetWidth || 400;

    // Restore position, or go to start
    if (currentId) {
      const newIndex = this.findCardIndexById(currentId);
      this.currentIndex = newIndex !== -1 ? newIndex + 3 : 3;
    } else {
      this.currentIndex = 3;
    }

    this.scrollToSlide(false);

    // Restart auto scroll
    this.startAutoScroll();
  }

  getCurrentBlogId() {
    if (this.totalOriginalCards === 0) return null;

    let displayIndex = this.currentIndex - 3;
    if (displayIndex < 0) displayIndex += this.totalOriginalCards;
    if (displayIndex >= this.totalOriginalCards)
      displayIndex -= this.totalOriginalCards;

    if (this.originalCards[displayIndex]) {
      return this.originalCards[displayIndex].dataset.id;
    }
    return null;
  }

  findCardIndexById(blogId) {
    return Array.from(this.originalCards).findIndex(
      (card) => card.dataset.id === blogId,
    );
  }

  destroy() {
    this.stopAutoScroll();
    window.removeEventListener("resize", () => this.updateCardWidth());

    if (this.prevBtn) {
      this.prevBtn.removeEventListener("click", () => {
        this.next();
        this.resetAutoScroll();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.removeEventListener("click", () => {
        this.prev();
        this.resetAutoScroll();
      });
    }

    if (this.wrapper) {
      this.wrapper.removeEventListener("mouseenter", () =>
        this.stopAutoScroll(),
      );
      this.wrapper.removeEventListener("mouseleave", () =>
        this.startAutoScroll(),
      );
    }
  }
}

// Initialize carousel when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Create global carousel instance
  window.blogCarousel = new Carousel();

  // Listen for language changes
  document.addEventListener("languageChange", (event) => {
    if (window.blogCarousel && event.detail && event.detail.lang) {
      window.blogCarousel.updateLanguage(event.detail.lang);
    }
  });
});

// Language change helper function (add this to your language switcher)
function triggerLanguageChange(lang) {
  const event = new CustomEvent("languageChange", {
    detail: { lang },
  });
  document.dispatchEvent(event);

  // Also update carousel if it exists
  if (window.blogCarousel) {
    window.blogCarousel.updateLanguage(lang);
  }
}
