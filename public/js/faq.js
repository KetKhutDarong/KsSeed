// ── FAQ Main Functionality ────────────────────────────────────

function renderFAQ(faqData) {
  const faqContainer = document.getElementById("faqContainer");

  if (!faqContainer) {
    console.error("FAQ container not found");
    return;
  }

  const lang = window.currentLang || "en";

  // Clear existing content
  faqContainer.innerHTML = "";

  // Create a simple container for all questions (no categories)
  const allQuestionsContainer = document.createElement("div");
  allQuestionsContainer.className = "faq-all-questions";

  // Add all FAQ items directly
  faqData.forEach((item) => {
    const faqItem = document.createElement("div");
    faqItem.className = "faq-item";
    faqItem.dataset.id = item._id || item.id;

    const questionEn = item.question?.en || "";
    const questionKm = item.question?.km || "";
    const answerEn = item.answer?.en || "";
    const answerKm = item.answer?.km || "";

    const questionText = lang === "km" ? questionKm : questionEn;
    const answerText = lang === "km" ? answerKm : answerEn;

    const faqHTML = `
      <div class="faq-question">
        <span data-en="${questionEn}" data-km="${questionKm}">${questionText}</span>
        <span class="faq-toggle">+</span>
      </div>
      <div class="faq-answer">
        <p data-en="${answerEn}" data-km="${answerKm}">${answerText}</p>
      </div>
    `;

    const itemContainer = document.createElement("div");
    itemContainer.innerHTML = faqHTML;
    faqItem.appendChild(itemContainer.firstElementChild);
    faqItem.appendChild(itemContainer.lastElementChild);

    allQuestionsContainer.appendChild(faqItem);
  });

  faqContainer.appendChild(allQuestionsContainer);

  // Initialize FAQ toggle functionality after rendering
  initializeFAQToggles();

  // ── Auto-open Q1 WITH animation after browser paints ─────
  // requestAnimationFrame waits for first paint,
  // then setTimeout gives CSS transition time to run smoothly
  requestAnimationFrame(() => {
    setTimeout(() => {
      const firstItem = allQuestionsContainer.querySelector(".faq-item");
      if (firstItem) {
        const firstAnswer = firstItem.querySelector(".faq-answer");
        const firstToggle = firstItem.querySelector(".faq-toggle");
        firstItem.classList.add("active");
        firstAnswer.classList.add("show");
        firstToggle.textContent = "−";
      }
    }, 300); // 300ms delay — enough for page to settle before animating
  });
}

// ── Fetch FAQs from MongoDB API ───────────────────────────────

async function initializeFAQ() {
  const faqContainer = document.getElementById("faqContainer");

  if (!faqContainer) {
    console.error("FAQ container not found");
    return;
  }

  // Show loading state
  faqContainer.innerHTML = `
    <div style="text-align:center; padding: 40px; color: #888;">
      Loading FAQs...
    </div>
  `;

  try {
    const res = await fetch("/api/faqs");

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();

    if (!data.success || !Array.isArray(data.faqs) || data.faqs.length === 0) {
      throw new Error("No FAQ data returned");
    }

    console.log(`✅ Loaded ${data.faqs.length} FAQs from MongoDB`);
    renderFAQ(data.faqs);
  } catch (err) {
    console.error("❌ Failed to load FAQs from API:", err.message);

    faqContainer.innerHTML = `
      <div style="text-align:center; padding: 40px; color: #e53e3e;">
        Failed to load FAQs. Please try again later.
      </div>
    `;
  }
}

// ── FAQ Toggle Functionality ──────────────────────────────────
// Individual toggle — close others when opening one

function initializeFAQToggles() {
  const faqQuestions = document.querySelectorAll(".faq-question");

  faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
      const faqItem = question.closest(".faq-item");
      const answer = faqItem.querySelector(".faq-answer");
      const toggle = question.querySelector(".faq-toggle");

      const isAlreadyActive = faqItem.classList.contains("active");

      // Close all FAQ items first
      document.querySelectorAll(".faq-item").forEach((item) => {
        if (item !== faqItem) {
          item.classList.remove("active");
          item.querySelector(".faq-answer").classList.remove("show");
          item.querySelector(".faq-toggle").textContent = "+";
        }
      });

      // Toggle clicked item
      if (!isAlreadyActive) {
        faqItem.classList.add("active");
        answer.classList.add("show");
        toggle.textContent = "−";
      } else {
        faqItem.classList.remove("active");
        answer.classList.remove("show");
        toggle.textContent = "+";
      }
    });
  });
}

// ── Language Switch Support ───────────────────────────────────

window.onLangChange = (function (prevOnLangChange) {
  return function (lang) {
    if (typeof prevOnLangChange === "function") prevOnLangChange(lang);

    document
      .querySelectorAll(".faq-question span:first-child")
      .forEach((el) => {
        el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
      });

    document.querySelectorAll(".faq-answer p").forEach((el) => {
      el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
    });
  };
})(window.onLangChange);

// ── Initialize on DOM Ready ───────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  initializeFAQ();
});
