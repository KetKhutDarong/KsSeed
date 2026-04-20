document.onkeydown = function (e) {
  if (
    e.key == "F12" ||
    (e.ctrlKey && e.key == "U") ||
    (e.ctrlKey && e.shiftKey && e.key == "I")
  ) {
    return false;
  }
};

// ─── IndexedDB Setup ────────────────────────────────────────────
const DB_NAME = "LanguageDB";
const DB_VERSION = 1;
const STORE_NAME = "settings";

window.DB_NAME = DB_NAME;
window.DB_VERSION = DB_VERSION;
window.STORE_NAME = STORE_NAME;

let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      console.error("Database failed to open");
      reject(request.error);
    };
    request.onsuccess = () => {
      db = request.result;
      console.log("Database opened successfully");
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
        console.log("Object store created");
      }
    };
  });
}

function saveLanguage(lang) {
  return new Promise((resolve, reject) => {
    localStorage.setItem("ksseed-language", lang);
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put({ key: "currentLang", value: lang });
    request.onsuccess = () => {
      console.log("Language saved:", lang);
      resolve();
    };
    request.onerror = () => {
      console.error("Error saving language");
      reject(request.error);
    };
  });
}

function loadLanguage() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get("currentLang");
    request.onsuccess = () => {
      if (request.result) {
        console.log("Language loaded:", request.result.value);
        resolve(request.result.value);
      } else {
        console.log("No saved language, using default: en");
        resolve("en");
      }
    };
    request.onerror = () => {
      console.error("Error loading language");
      reject(request.error);
    };
  });
}

// ─── Language & Font ────────────────────────────────────────────
let currentLang = "en"; // temporary default, will be overwritten by IndexedDB

const langOptions = document.querySelectorAll(".lang-option");

langOptions.forEach((option) => {
  option.addEventListener("click", async () => {
    const lang = option.getAttribute("data-lang");
    if (lang !== currentLang) {
      currentLang = lang;
      window.currentLang = lang;

      updateLanguage(lang);
      updateFont(lang);

      // Re-render stat numbers immediately in the new language
      refreshStatNumbers(lang);

      if (typeof window.onLangChange === "function") {
        window.onLangChange(lang);
      }

      try {
        await saveLanguage(lang);
        if (typeof triggerLanguageChange === "function") {
          triggerLanguageChange(lang);
        }
        if (typeof refreshBlogContent === "function") {
          refreshBlogContent();
        }
      } catch (error) {
        console.error("Failed to save language:", error);
      }

      langOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
    }
  });
});

function updateLanguage(lang) {
  document.querySelectorAll("[data-en], [data-km]").forEach((element) => {
    const text = element.getAttribute(`data-${lang}`);
    if (text !== null && text !== undefined && text.trim() !== "") {
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.placeholder = text;
      } else if (element.children.length > 0) {
        for (const node of element.childNodes) {
          if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.trim() !== ""
          ) {
            node.textContent = text + " ";
            break;
          }
        }
      } else {
        // Skip stat-number elements — managed by formatStatNumber
        if (!element.classList.contains("stat-number")) {
          element.textContent = text;
        }
      }
    }
  });

  document.querySelectorAll("[data-placeholder-en]").forEach((element) => {
    const placeholder = element.getAttribute(`data-placeholder-${lang}`);
    if (placeholder) {
      element.placeholder = placeholder;
    }
  });
}

function updateFont(lang) {
  document.body.style.fontFamily =
    lang === "km" ? '"Hanuman", sans-serif' : '"Poppins", sans-serif';
}

// ─── Stat Number Formatting ─────────────────────────────────────
function formatStatNumber(value, suffix, lang) {
  if (lang === "km") {
    if (value >= 1000000) {
      const m = value / 1000000;
      return (Number.isInteger(m) ? m : m.toFixed(1)) + "លាន" + suffix;
    }
    if (value >= 1000) {
      const k = value / 1000;
      return (Number.isInteger(k) ? k : k.toFixed(1)) + "ពាន់" + suffix;
    }
    return value + suffix;
  } else {
    if (value >= 1000000) {
      const m = value / 1000000;
      return (Number.isInteger(m) ? m : m.toFixed(1)) + "M" + suffix;
    }
    if (value >= 1000) {
      const k = value / 1000;
      return (Number.isInteger(k) ? k : k.toFixed(1)) + "K" + suffix;
    }
    return value + suffix;
  }
}

// Re-render all stat numbers instantly without animation
function refreshStatNumbers(lang) {
  document.querySelectorAll(".stat-number").forEach((el) => {
    const target = parseInt(el.getAttribute("data-count"));
    const suffix = el.getAttribute("data-suffix") ?? "+";
    if (!isNaN(target)) {
      el.textContent = formatStatNumber(target, suffix, lang);
    }
  });
}

function animateCounter(element) {
  const target = parseInt(element.getAttribute("data-count"));
  const suffix = element.getAttribute("data-suffix") ?? "+";
  const duration = 1700;
  const increment = target / (duration / 16);
  let current = 0;

  // ✅ Read currentLang at animation time — guaranteed correct because
  //    we only call this AFTER loadLanguage() has resolved
  const lang = currentLang;

  const updateCounter = () => {
    current += increment;
    if (current < target) {
      element.textContent = formatStatNumber(Math.floor(current), suffix, lang);
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = formatStatNumber(target, suffix, lang);
    }
  };

  updateCounter();
}

// ─── Stats Observer ─────────────────────────────────────────────
// ✅ Defined here but NOT started yet — started only after lang loads
const statsBar = document.querySelector(".stats-bar");

const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll(".stat-number").forEach((stat) => {
          if (stat.getAttribute("data-animated") !== "true") {
            stat.setAttribute("data-animated", "true");
            animateCounter(stat);
          }
        });
        statsObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

// ─── Hero Slideshow ─────────────────────────────────────────────
let currentSlide = 0;
const slides = document.querySelectorAll(".hero-image");
const dots = document.querySelectorAll(".hero_dot");
const slideInterval = 3000;

if (slides.length > 0) {
  function showSlide(index) {
    slides.forEach((slide) => slide.classList.remove("active"));
    dots.forEach((dot) => dot.classList.remove("active"));
    slides[index].classList.add("active");
    dots[index].classList.add("active");
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
  }

  let autoSlide = setInterval(nextSlide, slideInterval);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentSlide = index;
      showSlide(currentSlide);
      clearInterval(autoSlide);
      autoSlide = setInterval(nextSlide, slideInterval);
    });
  });
}

// ─── Mobile Menu ────────────────────────────────────────────────
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const nav = document.getElementById("nav");

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener("click", () => {
    nav.classList.toggle("active");
    mobileMenuToggle.classList.toggle("active");
  });
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
  });
});

// ─── Smooth Scrolling ───────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      const headerOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  });
});

// ─── Active Nav Link on Scroll ──────────────────────────────────
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((section) => {
    if (pageYOffset >= section.offsetTop - 100) {
      current = section.getAttribute("id");
    }
  });
  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
});

// ─── Header Scroll Effect ───────────────────────────────────────
const header = document.getElementById("header");
if (header) {
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 50);
  });
}

// ─── Page Initialization ────────────────────────────────────────
// ✅ This is the ONLY place statsObserver.observe() is called.
//    It runs strictly after IndexedDB has resolved with the correct language.
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await initDB();

    const savedLang = await loadLanguage();

    // ✅ Set currentLang BEFORE anything reads it
    currentLang = savedLang;
    window.currentLang = savedLang;
    localStorage.setItem("ksseed-language", savedLang);

    updateLanguage(savedLang);
    updateFont(savedLang);

    if (typeof window.onLangChange === "function") {
      window.onLangChange(savedLang);
    }

    langOptions.forEach((opt) => {
      opt.classList.toggle(
        "active",
        opt.getAttribute("data-lang") === savedLang,
      );
    });

    // ✅ Start observing stats ONLY after currentLang is set correctly
    if (statsBar) {
      statsObserver.observe(statsBar);
    }
  } catch (error) {
    console.error("Error initializing language:", error);
    updateFont("en");

    // Fallback — still start observer even on error
    if (statsBar) {
      statsObserver.observe(statsBar);
    }
  }
});
// product filtering: but add later cuz now that need to do is chnage product

// Newsletter form submission
// const newsletterForm = document.getElementById("newsletterForm");

// newsletterForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   const email = newsletterForm.querySelector('input[type="email"]').value;

//   // Simulate form submission
//   alert(
//     currentLang === "en"
//       ? `Thank you for subscribing with ${email}!`
//       : `អរគុណសម្រាប់ការជាវជាមួយ ${email}!`
//   );
//   newsletterForm.reset();
// });

// Chat Widget
const chatWidget = document.getElementById("chatWidget");
const chatButton = document.getElementById("chatButton");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatMessages = document.getElementById("chatMessages");

if (chatButton) {
  chatButton.addEventListener("click", () => {
    chatWidget.classList.toggle("active");
  });
}

function addChatMessage(message, isUser = false) {
  if (!chatMessages) return;
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("chat-message");
  messageDiv.classList.add(isUser ? "user" : "bot");

  const p = document.createElement("p");
  p.textContent = message;
  messageDiv.appendChild(p);

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatSend) {
  chatSend.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message) {
      addChatMessage(message, true);
      chatInput.value = "";

      // Simulate bot response
      setTimeout(() => {
        const responses =
          currentLang === "en"
            ? [
                "Thank you for your message! How can I help you with our seeds?",
                "I'd be happy to help! What product are you interested in?",
                "Great question! Let me connect you with our team.",
              ]
            : [
                "អរគុណសម្រាប់សាររបស់អ្នក! តើខ្ញុំអាចជួយអ្នកអ្វីអំពីគ្រាប់ពូជរបស់យើង?",
                "ខ្ញុំរីករាយក្នុងការជួយ! តើអ្នកចាប់អារម្មណ៍លើផលិតផលអ្វី?",
                "សំណួរល្អ! ខ្ញុំនឹងភ្ជាប់អ្នកជាមួយក្រុមរបស់យើង។",
              ];

        const randomResponse =
          responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(randomResponse);
      }, 1000);
    }
  });
}

if (chatInput) {
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      chatSend.click();
    }
  });
}

// Scroll to Top Button
const scrollTopBtn = document.getElementById("scrollTop");

if (scrollTopBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 500) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }
  });

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Fade-in Animation on Scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const fadeInObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.animation = "fadeInUp 0.8s ease forwards";
      fadeInObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements for fade-in animation
document
  .querySelectorAll(
    ".testimonial-card, .product-card, .story-card, .blog-card, .timeline-item, .team-member",
  )
  .forEach((element) => {
    element.style.opacity = "0";
    fadeInObserver.observe(element);
  });

// Video Play Button (Placeholder functionality)
// document.querySelectorAll(".play-button").forEach((button) => {
//   button.addEventListener("click", () => {
//     alert(
//       currentLang === "en"
//         ? "Video player would open here!"
//         : "កម្មវិធីចាក់វីដេអូនឹងបើកនៅទីនេះ!"
//     );
//   });
// });

// // Product "Learn More" Button
// document.querySelectorAll(".btn-product").forEach((button) => {
//   button.addEventListener("click", () => {
//     alert(
//       currentLang === "en"
//         ? "Product details page would open here!"
//         : "ទំព័រព័ត៌មានលម្អិតផលិតផលនឹងបើកនៅទីនេះ!"
//     );
//   });
// });

// Initialize
// document
//   .getElementById("contactForm")
//   .addEventListener("submit", function (event) {
//     event.preventDefault();

//     // Example: detect button text to know language
//     const button = document.getElementById("sent");
//     const currentText = button.textContent.trim();

//     if (currentText === "Send Message") {
//       alert("✅ Your message has been sent successfully!");
//     } else {
//       alert("✅ សាររបស់អ្នកត្រូវបានផ្ញើដោយជោគជ័យ!");
//     }
//     document.getElementById("contactForm").reset();
//   });

// carousel

// carousel

// Smooth Infinite Carousel - Fixed Version
// Simple Working Carousel - Version 3
// document.addEventListener("DOMContentLoaded", () => {
//   console.log("Carousel Version 3 loaded");
//   const carouselContainer = document.getElementById("carouselContainer");
//   const arrowLeft = document.getElementById("arrowLeft");
//   const arrowRight = document.getElementById("arrowRight");
//   const dots = document.querySelectorAll(".dots");

//   if (!carouselContainer) return;

//   let currentIndex = 0;
//   let isAnimating = false;
//   let autoScrollInterval = null;
//   let cardWidth = 0;
//   const totalItems = 5;

//   function calculateCardWidth() {
//     const firstCard = carouselContainer.querySelector(".product-card-link");
//     if (firstCard) {
//       const style = window.getComputedStyle(firstCard);
//       const marginRight = parseFloat(style.marginRight) || 0;
//       cardWidth = firstCard.offsetWidth + marginRight;
//     }
//   }

//   function updateDots() {
//     dots.forEach((dot, index) => {
//       dot.classList.toggle("active", index === currentIndex);
//     });
//   }

//   function scrollToIndex(index, smooth = true) {
//     if (isAnimating) return;

//     isAnimating = true;
//     currentIndex = ((index % totalItems) + totalItems) % totalItems;

//     const scrollAmount = currentIndex * cardWidth;

//     if (smooth) {
//       carouselContainer.scrollTo({
//         left: scrollAmount,
//         behavior: "smooth",
//       });

//       setTimeout(() => {
//         isAnimating = false;
//       }, 500);
//     } else {
//       carouselContainer.scrollLeft = scrollAmount;
//       isAnimating = false;
//     }

//     updateDots();
//   }

//   function startAutoScroll() {
//     stopAutoScroll();
//     autoScrollInterval = setInterval(() => {
//       scrollToIndex(currentIndex + 1);
//     }, 3000);
//   }

//   function stopAutoScroll() {
//     if (autoScrollInterval) {
//       clearInterval(autoScrollInterval);
//       autoScrollInterval = null;
//     }
//   }

//   // Arrow buttons
//   arrowLeft.addEventListener("click", () => {
//     stopAutoScroll();
//     scrollToIndex(currentIndex - 1);
//     startAutoScroll();
//   });

//   arrowRight.addEventListener("click", () => {
//     stopAutoScroll();
//     scrollToIndex(currentIndex + 1);
//     startAutoScroll();
//   });

//   // Dot navigation
//   dots.forEach((dot) => {
//     dot.addEventListener("click", () => {
//       stopAutoScroll();
//       const index = parseInt(dot.dataset.index);
//       scrollToIndex(index);
//       startAutoScroll();
//     });
//   });

//   // Pause on hover
//   carouselContainer.addEventListener("mouseenter", stopAutoScroll);
//   carouselContainer.addEventListener("mouseleave", startAutoScroll);

//   // Handle manual scrolling
//   let scrollTimeout;
//   carouselContainer.addEventListener("scroll", () => {
//     if (isAnimating) return;

//     clearTimeout(scrollTimeout);
//     scrollTimeout = setTimeout(() => {
//       const scrollLeft = carouselContainer.scrollLeft;
//       const newIndex = Math.round(scrollLeft / cardWidth);
//       if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalItems) {
//         currentIndex = newIndex;
//         updateDots();
//       }
//     }, 150);
//   });

//   // Handle window resize
//   window.addEventListener("resize", () => {
//     calculateCardWidth();
//     scrollToIndex(currentIndex, false);
//   });

//   // Initialize
//   calculateCardWidth();
//   updateDots();
//   startAutoScroll();

//   // Cleanup
//   window.addEventListener("beforeunload", stopAutoScroll);
// });
// database do not touch

// document.addEventListener("DOMContentLoaded", () => {
//   document
//     .getElementById("contactForm")
//     .addEventListener("submit", async (e) => {
//       e.preventDefault();

//       const data = {
//         name: document.getElementById("contactName").value.trim(),
//         email: document.getElementById("contactEmail").value.trim(),
//         phone: document.getElementById("contactPhone").value.trim(),
//         subject: document.getElementById("contactSubject").value.trim(),
//         message: document.getElementById("contactMessage").value.trim(),
//       };

//       console.log("Sending:", data); // debug

//       try {
//         const res = await fetch("http://localhost:3000/contact", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(data),
//         });

//         const result = await res.json();
//         alert(result.message);
//       } catch (err) {
//         alert("Failed to send message");
//       }
//       document.getElementById("contactForm").reset();
//     });
// });

// UNIVERSAL FORM HANDLER - ensure it SKIPS contactForm and newsletterForm
document.addEventListener("DOMContentLoaded", function () {
  console.log(
    "Universal form handler starting (will skip contact/newsletter if present)",
  );

  document.querySelectorAll("form").forEach((form) => {
    // skip contact/newsletter explicit forms (to avoid double-handling)
    const formId = (form.id || "").toLowerCase();
    if (formId === "contactform" || formId === "newsletterform") {
      console.log(`Skipping universal handling for form id="${form.id}"`);
      form.dataset.ajaxBound = "true";
      return;
    }

    // skip if form is explicitly marked as custom-handled
    if (form.dataset.customHandler === "true") {
      console.log(
        `Skipping universal handling (customHandler) for form id="${form.id || form.name || "unnamed"}"`,
      );
      form.dataset.ajaxBound = "true";
      return;
    }

    // skip if explicitly opt-out
    if (form.hasAttribute("data-no-ajax")) {
      console.log(
        `Skipping universal handling (data-no-ajax) for form id="${form.id || form.name || "unnamed"}"`,
      );
      return;
    }

    // Prevent double-binding
    if (form.dataset.ajaxBound === "true") return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      form.dataset.ajaxBound = "true";

      console.log(
        "Universal handler submit for form:",
        form.id || form.name || "unnamed",
      );

      // determine endpoint by explicit attribute or default
      let endpoint = form.getAttribute("data-endpoint") || "/contact";
      if (form.id === "newsletterForm") endpoint = "/subscribe";

      // collect values
      const inputs = form.querySelectorAll("input, textarea, select");
      const payload = {};
      inputs.forEach((input) => {
        if (!input.name || input.disabled) return;
        if (input.type === "checkbox") payload[input.name] = input.checked;
        else payload[input.name] = input.value;
      });

      // If the form is a newsletter by id, validate email
      if (form.id === "newsletterForm") {
        const email = payload.email || payload.newsletterEmail || "";
        if (!email.includes("@")) {
          if (window.customAlert) {
            window.customAlert.removePreviousModals &&
              window.customAlert.removePreviousModals();
            window.customAlert.warning(
              "Invalid Email",
              "Please enter a valid email address",
              { autoClose: true, closeTime: 3000 },
            );
          } else {
            alert("Please enter a valid email address");
          }
          return;
        }
      }

      // UI feedback
      const submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"]',
      );
      const originalText = submitBtn ? submitBtn.textContent : null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let data;
        try {
          data = await res.json();
        } catch (err) {
          data = { success: false, message: "Invalid server response" };
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          if (originalText) submitBtn.textContent = originalText;
        }

        if (data.success) {
          if (window.customAlert) {
            window.customAlert.removePreviousModals &&
              window.customAlert.removePreviousModals();
            window.customAlert.success(
              "Success",
              data.message || "Operation completed",
              { autoClose: true, closeTime: 3000 },
            );
          } else {
            alert(data.message || "Success");
          }
          form.reset();
        } else {
          if (window.customAlert) {
            window.customAlert.removePreviousModals &&
              window.customAlert.removePreviousModals();
            window.customAlert.error(
              "Error",
              data.message || "Something went wrong",
              { autoClose: true, closeTime: 4000 },
            );
          } else {
            alert("Error: " + (data.message || "Something went wrong"));
          }
        }
      } catch (err) {
        console.error("Universal handler error:", err);
        if (submitBtn) {
          submitBtn.disabled = false;
          if (originalText) submitBtn.textContent = originalText;
        }
        if (window.customAlert) {
          window.customAlert.removePreviousModals &&
            window.customAlert.removePreviousModals();
          window.customAlert.error("Network Error", "Please try again later", {
            autoClose: true,
            closeTime: 4000,
          });
        } else {
          alert("Network error. Please try again.");
        }
      }
    });

    console.log(
      "Universal handler bound to form:",
      form.id || form.name || "unnamed",
    );
  });
});

const dropdown = document.querySelector(".nav-item");
if (dropdown) {
  const toggle = dropdown.querySelector(".dropdown-toggle");
  if (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      dropdown.classList.toggle("active");
    });
  }

  // Close when clicking outside
  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
}

/* ── Shared Video Modal (used by index.html AND farmers-stories.html) ──────
   Both pages use:  #videoModal  .video-modal-wrapper  .video-modal-content
                    #videoFrame  .modal-close.video-modal-close
   Call openVideo(url) from any play-button onclick or data-video button.    */

document.addEventListener("DOMContentLoaded", () => {
  // Attach to every .play-button that carries a data-video attribute
  document.querySelectorAll(".play-button[data-video]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openVideo(btn.getAttribute("data-video"));
    });
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeVideoModal();
  });
});

// ── Parse YouTube URL → embed URL ──────────────────────────────────────────
function parseYouTubeEmbed(videoUrl) {
  let videoId = "";
  let startTime = 0;
  try {
    if (videoUrl.includes("youtube.com/watch")) {
      const u = new URL(videoUrl);
      videoId = u.searchParams.get("v") || "";
      const t = u.searchParams.get("t");
      if (t) startTime = parseInt(t.replace(/\D/g, ""), 10) || 0;
    } else if (videoUrl.includes("youtu.be/")) {
      videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
      const tMatch = videoUrl.match(/[?&]t=(\d+)/);
      if (tMatch) startTime = parseInt(tMatch[1], 10);
    }
  } catch (_) {}
  if (!videoId) return null;
  let url = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
  if (startTime > 0) url += `&start=${startTime}`;
  return url;
}

// ── openVideo — works on both pages ────────────────────────────────────────
function openVideo(videoUrl) {
  const embedUrl = parseYouTubeEmbed(videoUrl);
  if (!embedUrl) return;

  // Use existing modal in HTML (farmers-stories.html) or create one (index.html)
  let modal = document.getElementById("videoModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "videoModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="video-modal-wrapper">
        <button class="modal-close video-modal-close" onclick="closeVideoModal()" aria-label="Close video">×</button>
        <div class="video-modal-content">
          <iframe id="videoFrame" width="100%" height="100%" src="about:blank"
            allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
            allowfullscreen style="border:none;background:#000;"></iframe>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeVideoModal();
    });
  }

  const frame = document.getElementById("videoFrame");
  frame.src = "";
  setTimeout(() => {
    frame.src = embedUrl;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }, 50);
}

// ── closeVideoModal — shared close function ─────────────────────────────────
function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  if (!modal) return;
  const frame = document.getElementById("videoFrame");
  if (frame) frame.src = "about:blank";
  modal.classList.remove("active");
  document.body.style.overflow = "";
}
