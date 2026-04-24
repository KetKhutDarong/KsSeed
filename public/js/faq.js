// ── FAQ Main Functionality ────────────────────────────────────

// ── Build the answer <p> element ─────────────────────────────
// Supports three modes:
//   1. answerParts array  — multiple inline links anywhere in text
//   2. answerLink         — single inline link (legacy)
//   3. plain answer text  — no links

function buildAnswerElement(item, lang) {
  const p = document.createElement("p");

  if (item.answerParts && item.answerParts.length > 0) {
    // Store serialized parts for language switch
    p.setAttribute("data-parts", JSON.stringify(item.answerParts));
    p.classList.add("has-parts");
    renderAnswerParts(p, lang);
  } else if (item.answerLink) {
    const answerEn = item.answer?.en || "";
    const answerKm = item.answer?.km || "";
    p.setAttribute("data-en", answerEn);
    p.setAttribute("data-km", answerKm);
    p.setAttribute("data-link-en", item.answerLink.text?.en || "");
    p.setAttribute("data-link-km", item.answerLink.text?.km || "");
    p.setAttribute("data-link-href", item.answerLink.href || "#");
    p.setAttribute("data-suffix-en", item.answerSuffix?.en || "");
    p.setAttribute("data-suffix-km", item.answerSuffix?.km || "");
    p.classList.add("has-link");
    renderAnswerWithLink(p, lang);
  } else {
    const answerEn = item.answer?.en || "";
    const answerKm = item.answer?.km || "";
    p.setAttribute("data-en", answerEn);
    p.setAttribute("data-km", answerKm);
    p.textContent = lang === "km" ? answerKm : answerEn;
  }

  return p;
}

// ── Renders answerParts (multiple inline links) ───────────────
function renderAnswerParts(p, lang) {
  const parts = JSON.parse(p.getAttribute("data-parts") || "[]");
  p.innerHTML = "";

  const linkStyle =
    "color: #2c2c2c; font-weight: 700; text-decoration: underline; text-underline-offset: 2px;";

  parts.forEach((part) => {
    if (part.type === "link") {
      const a = document.createElement("a");
      a.href = part.href || "#";
      a.textContent = part.text?.[lang] || part.text?.en || "";
      a.style.cssText = linkStyle;
      p.appendChild(a);
    } else {
      p.appendChild(
        document.createTextNode(part.text?.[lang] || part.text?.en || ""),
      );
    }
  });
}

// ── Renders a single inline link inside a <p> (legacy) ────────
function renderAnswerWithLink(p, lang) {
  const answerText = p.getAttribute(`data-${lang}`) || "";
  const linkText = p.getAttribute(`data-link-${lang}`) || "";
  const href = p.getAttribute("data-link-href") || "#";
  const suffix = p.getAttribute(`data-suffix-${lang}`) || "";

  p.innerHTML = "";

  if (answerText) {
    p.appendChild(document.createTextNode(answerText + " "));
  }

  const a = document.createElement("a");
  a.href = href;
  a.textContent = linkText;
  a.style.cssText =
    "color: #2c2c2c; font-weight: 700; text-decoration: underline; text-underline-offset: 2px;";
  p.appendChild(a);

  if (suffix) {
    p.appendChild(document.createTextNode(" " + suffix));
  }
}

// ── Render all FAQ items ──────────────────────────────────────

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
    const questionText = lang === "km" ? questionKm : questionEn;

    // ── Question row ─────────────────────────────────────────
    const questionDiv = document.createElement("div");
    questionDiv.className = "faq-question";

    const questionSpan = document.createElement("span");
    questionSpan.setAttribute("data-en", questionEn);
    questionSpan.setAttribute("data-km", questionKm);
    questionSpan.textContent = questionText;

    const toggleSpan = document.createElement("span");
    toggleSpan.className = "faq-toggle";
    toggleSpan.textContent = "+";

    questionDiv.appendChild(questionSpan);
    questionDiv.appendChild(toggleSpan);

    // ── Answer row ───────────────────────────────────────────
    const answerDiv = document.createElement("div");
    answerDiv.className = "faq-answer";

    const answerP = buildAnswerElement(item, lang);
    answerDiv.appendChild(answerP);

    faqItem.appendChild(questionDiv);
    faqItem.appendChild(answerDiv);
    allQuestionsContainer.appendChild(faqItem);
  });

  faqContainer.appendChild(allQuestionsContainer);

  // Initialize FAQ toggle functionality after rendering
  initializeFAQToggles();

  // ── Auto-open Q1 WITH animation after browser paints ─────
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
    }, 300);
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

    // Update question text
    document
      .querySelectorAll(".faq-question span:first-child")
      .forEach((el) => {
        el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
      });

    // Update answer text — rebuild link if present, plain text otherwise
    document.querySelectorAll(".faq-answer p").forEach((el) => {
      if (el.classList.contains("has-parts")) {
        renderAnswerParts(el, lang);
      } else if (el.classList.contains("has-link")) {
        renderAnswerWithLink(el, lang);
      } else {
        el.textContent = el.getAttribute(`data-${lang}`) || el.textContent;
      }
    });
  };
})(window.onLangChange);

// ── Initialize on DOM Ready ───────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  initializeFAQ();
});
