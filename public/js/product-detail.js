// IndexedDB Setup
const DB_NAME = "ProductLanguageDB";
const DB_VERSION = 1;
const STORE_NAME = "settings";
let db;

// Global variables
let currentLang = "en";
let currentProduct = "cucumber";

let products = {};

// DOM Elements
const langSwitch = document.getElementById("langSwitch");
const langOptions = document.querySelectorAll(".lang-option");
const listItems = document.querySelectorAll(".product-list li");
const display = document.getElementById("product-display");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
const guideModal = document.getElementById("guide-modal");
const guideModalClose = document.getElementById("guide-modal-close");
const guideContent = document.getElementById("guide-content");

let currentVariantData = null;

// Define font families for each language
const fontMap = {
  en: "'Poppins', sans-serif",
  km: "'Hanuman', serif",
};

// ========== INDEXEDDB FUNCTIONS ==========
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
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "key",
        });
        console.log("Object store created");
      }
    };
  });
}

function saveToIndexedDB(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put({ key: key, value: value });

    request.onsuccess = () => {
      console.log(`${key} saved:`, value);
      resolve();
    };

    request.onerror = () => {
      console.error(`Error saving ${key}`);
      reject(request.error);
    };
  });
}

function loadFromIndexedDB(key, defaultValue) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(key);

    request.onsuccess = () => {
      if (request.result) {
        console.log(`${key} loaded:`, request.result.value);
        resolve(request.result.value);
      } else {
        console.log(`No saved ${key}, using default:`, defaultValue);
        resolve(defaultValue);
      }
    };

    request.onerror = () => {
      console.error(`Error loading ${key}`);
      reject(request.error);
    };
  });
}

// ========== URL HANDLING FUNCTIONS ==========
function createSEOString(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function updateURL(
  productKey = null,
  variantIndex = null,
  variantTitle = null,
) {
  const url = new URL(window.location);

  // Clear all parameters first
  url.search = "";

  if (productKey) {
    // Format: ?cucumber&variant=1&f1-cucumber-neang-kangri-variety
    let newSearch = productKey;

    if (variantIndex !== null && variantTitle) {
      // Use English title for URL regardless of current language
      const variant = products[productKey]?.imgs[variantIndex - 1]; // Convert from 1-based to 0-based
      if (variant) {
        const seoName = createSEOString(variant.title.en);
        newSearch += `&variant=${variantIndex}`; // Store as 1-based
        newSearch += `&${seoName}`;
      }
    }

    url.search = `?${newSearch}`;
  }

  // Update URL without reload
  window.history.pushState({}, "", url);
  console.log("URL updated to:", url.toString());
}

function handleURLParameters() {
  const search = window.location.search;
  console.log("URL search:", search);

  if (!search || search === "?") return false;

  // Parse URL like: ?cucumber&variant=1&f1-cucumber-neang-kangri-variety
  const params = search.substring(1).split("&");
  console.log("URL params array:", params);

  // First param is product key
  const productKey = params[0];

  if (!productKey || !products[productKey]) {
    console.log("Invalid product key:", productKey);
    return false;
  }

  let variantIndex = null;
  let seoName = null;

  // Parse other parameters
  for (let i = 1; i < params.length; i++) {
    const param = params[i];
    if (param.startsWith("variant=")) {
      variantIndex = parseInt(param.split("=")[1]);
    } else if (param && !param.includes("=")) {
      // This is the SEO name (like f1-cucumber-neang-kangri-variety)
      seoName = param;
    }
  }

  console.log("Parsed URL:", { productKey, variantIndex, seoName });

  // Update sidebar active state
  document.querySelectorAll(".product-list li").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.product === productKey) {
      item.classList.add("active");
    }
  });

  // Show the product category
  showProduct(productKey);

  // If variant index is specified, open modal
  if (variantIndex !== null) {
    const index = parseInt(variantIndex);
    if (!isNaN(index) && products[productKey].imgs[index - 1]) {
      // Convert from 1-based to 0-based
      setTimeout(() => {
        console.log(
          "Opening modal for:",
          productKey,
          "variant (1-based):",
          index,
        );
        showModal(productKey, index); // Pass 1-based index
      }, 100);
      return true;
    }
  }
  return true;
}

// ========== LANGUAGE FUNCTIONS ==========
langOptions.forEach((option) => {
  option.addEventListener("click", async () => {
    const lang = option.getAttribute("data-lang");
    if (lang !== currentLang) {
      currentLang = lang;
      updateLanguage(lang);

      try {
        await saveToIndexedDB("currentLang", lang);
      } catch (error) {
        console.error("Failed to save language:", error);
      }

      langOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      // Update product display with new language
      showProduct(currentProduct);
    }
  });
});

function updateLanguage(lang) {
  document.documentElement.style.fontFamily = fontMap[lang];
  document.body.style.fontFamily = fontMap[lang];

  document.querySelectorAll("[data-en]").forEach((element) => {
    const text = element.getAttribute(`data-${lang}`);
    if (text) {
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.placeholder = text;
      } else if (element.children.length > 0) {
        // ✅ Has child elements (e.g. dropdown arrow span) — only update text nodes
        for (const node of element.childNodes) {
          if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.trim() !== ""
          ) {
            node.textContent = " " + text + " ";
            break;
          }
        }
      } else {
        // ✅ No children — safe to replace all text
        element.textContent = text;
      }
    }
  });

  document.querySelectorAll("[data-placeholder-en]").forEach((element) => {
    const placeholder = element.getAttribute(`data-placeholder-${lang}`);
    if (placeholder) {
      element.placeholder = placeholder;
    }
  });

  // Update "See Detail" buttons text
  document.querySelectorAll(".see-detail-btn").forEach((btn) => {
    btn.textContent = lang === "en" ? "See Detail" : "មើលលម្អិត";
  });
}

// ========== PRODUCT DISPLAY FUNCTIONS ==========
function showProduct(productKey) {
  const product = products[productKey];
  if (!product) {
    console.error(`Product ${productKey} not found`);
    return;
  }

  currentProduct = productKey;
  const display = document.getElementById("product-display");
  const lang = currentLang;

  // Save to IndexedDB
  // saveToIndexedDB("currentProduct", productKey).catch(console.error);

  display.classList.remove("fade-up");
  void display.offsetWidth;
  display.classList.add("fade-up");

  // Update sidebar
  document.querySelectorAll(".product-list li").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.product === productKey) {
      item.classList.add("active");
    }
  });

  // Generate HTML - use 1-based index for display
  display.innerHTML = `
        <h2>${product.name[lang]}</h2>
        <p>${product.desc[lang]}</p>
        <div class="image-grid">
          ${product.imgs
            .map((img, index) => {
              const title = img.title || { en: "", km: "" }; // ← safe fallback
              const info = img.info || { en: [""], km: [""] }; // ← safe fallback
              const seoName = createSEOString(title.en || "");
              const displayIndex = index + 1;
              return `
              <div class="image-card" 
                  data-product="${productKey}" 
                  data-index="${displayIndex}" 
                  data-seo-name="${seoName}">
                <img src="${img.src || ""}" alt="${title[lang] || ""}">
                <h3>${title[lang] || ""}</h3>
                <p>${Array.isArray(info?.[lang]) ? info[lang][0] : info?.[lang] || ""}</p>
                <div class="image-card-overlay">
                  <button class="see-detail-btn">
                    ${lang === "en" ? "See Detail" : "មើលលម្អិត"}
                  </button>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;

  // Add click listeners to image cards
  document.querySelectorAll(".image-card").forEach((card) => {
    card.addEventListener("click", function () {
      const productKey = this.dataset.product;
      const index = Number.parseInt(this.dataset.index); // This is 1-based

      console.log("Card clicked:", { productKey, index });

      // Update URL (always use English for URL)
      const variant = products[productKey].imgs[index - 1]; // Convert to 0-based for array access
      updateURL(productKey, index, variant.title?.en || "");
      showModal(productKey, index); // Pass 1-based index
    });
  });
}

// Add this function to your modal
async function downloadPdfWithCleanName(url, fileName) {
  try {
    // Check if URL exists and is valid
    if (!url || url.trim() === "") {
      const message =
        currentLang === "en"
          ? "PDF guide is not available for this product yet."
          : "ឯកសារ PDF មិនទាន់មានសម្រាប់ផលិតផលនេះទេ។";
      alert(message);
      return; // Stop execution
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
    // Show error message instead of opening URL
    const message =
      currentLang === "en"
        ? "Unable to download PDF. The file may not be available."
        : "មិនអាចទាញយក PDF បានទេ។ ឯកសារប្រហែលជាមិនមាន។";
    alert(message);
  }
}

function showModal(productKey, variantIndex) {
  // variantIndex is 1-based, convert to 0-based for array access
  const arrayIndex = variantIndex - 1;
  const product = products[productKey];
  if (!product || !product.imgs[arrayIndex]) {
    console.error(
      `Variant ${variantIndex} (0-based: ${arrayIndex}) not found for product ${productKey}`,
    );
    return;
  }

  const variant = product.imgs[arrayIndex];
  const lang = currentLang;

  currentVariantData = variant;
  console.log("🔍 variant data:", JSON.stringify(variant, null, 2));
  console.log("🔍 variant.info:", variant?.info);
  console.log("🔍 currentLang:", lang);

  const weightLabel = lang === "en" ? "Weight" : "ទម្ងន់";
  const viewsLabel = lang === "en" ? "Views" : "ចំនួនមើល";
  const descLabel = lang === "en" ? "Description" : "ការពិពណ៌នា";
  const growingGuideLabel = lang === "en" ? "Technical" : "បច្ចេកទេស​ដាំដុះ";
  const seeVideoLabel = lang === "en" ? "Watch Video" : "មើលវីដេអូ";
  const downloadLabel =
    lang === "en" ? "Download Technical" : "ទាញយកបច្ចេកទេស​ដាំដុះ";

  // Check if PDF exists for this variant
  const hasPdf = variant.pdfUrl && variant.pdfUrl.trim() !== "";

  // Generate download button HTML based on whether PDF exists
  let downloadButtonHtml = "";
  if (hasPdf) {
    downloadButtonHtml = `
      <button class="order-button" id="download-pdf-btn">
        <i class="ri-download-line"></i> ${downloadLabel}
      </button>
    `;
  } else {
    downloadButtonHtml = `
      <button class="order-button disabled" id="download-pdf-btn" disabled style="opacity: 0.5; cursor: not-allowed;">
        <i class="ri-download-line"></i> ${downloadLabel}
      </button>
    `;
  }

  modalBody.innerHTML = `
      <div class="modal-images">
        <img src="${variant.gallery[0].src}" alt="${
          variant.title[lang]
        }" class="modal-main-image" id="main-image">
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          ${variant.gallery
            .map(
              (img, idx) => `
            <img 
              src="${img.src}" 
              alt="${img.label[lang]}" 
              style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${
                idx === 0 ? "#43b048" : "#ddd"
              }; transition: all 0.3s ease;"
              class="thumbnail-img"
              data-index="${idx}"
            >
          `,
            )
            .join("")}
        </div>
      </div>
      <div class="modal-details">
        <h2 class="modal-title">${variant.title[lang]}</h2>
        <div class="modal-meta">
          <span>⚖️ ${weightLabel}: <strong>${variant.weight}</strong></span>
          <span>👁️ ${viewsLabel}: <strong>${variant.views}</strong></span>
        </div>
        
        <div class="modal-section">
          <h3>${descLabel}</h3>
          ${(() => {
            const info = variant?.info?.[lang] ?? [];
            if (Array.isArray(info)) {
              return (
                '<ul style="padding-left:18px; margin:0; line-height:1.6;">' +
                info
                  .slice(1)
                  .map(
                    (item) =>
                      '<li style="margin-bottom:-5px; text-align:justify;">' +
                      item +
                      "</li>",
                  )
                  .join("") +
                "</ul>"
              );
            }
            return '<p style="text-align:justify;">' + info + "</p>";
          })()}
        </div>

        <div class="modal-actions">
          <button class="action-button" id="growing-guide-btn">
             ${growingGuideLabel}
          </button>
          <button class="action-button" id="see-video-btn">
            ${seeVideoLabel}
          </button>
        </div>

        <div class="modal-cta">
          ${downloadButtonHtml}
        </div>
      </div>
    `;

  // Setup thumbnail click handlers
  const thumbnails = modalBody.querySelectorAll(".thumbnail-img");
  const mainImage = document.getElementById("main-image");

  thumbnails.forEach((thumb, idx) => {
    thumb.addEventListener("click", function () {
      mainImage.src = variant.gallery[idx].src;
      thumbnails.forEach((t) => {
        t.style.borderColor = "#ddd";
      });
      this.style.borderColor = "#43b048";
    });

    if (idx === 0) {
      thumb.style.borderColor = "#43b048";
    }
  });

  // Setup button handlers
  document
    .getElementById("growing-guide-btn")
    .addEventListener("click", showGrowingGuide);

  document.getElementById("see-video-btn").addEventListener("click", showVideo);

  // Add event listener for download button
  const downloadBtn = document.getElementById("download-pdf-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (hasPdf) {
        const fileName = `${variant.title[lang].replace(
          /\s+/g,
          "-",
        )}-technical-guide.pdf`;
        downloadPdfWithCleanName(variant.pdfUrl, fileName);
      } else {
        // Show message when PDF doesn't exist
        const message =
          lang === "en"
            ? "PDF guide is not available for this product variant yet."
            : "ឯកសារ PDF មិនទាន់មានសម្រាប់ប្រភេទរងនៃផលិតផលនេះទេ។";
        alert(message);
        វ;
      }
    });
  }

  // Show modal
  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  // Update page title
  document.title = `${variant.title[lang]} - ${product.name[lang]} - KsSEED`;

  console.log(
    "Modal opened for:",
    productKey,
    "variant (1-based):",
    variantIndex,
    "Has PDF:",
    hasPdf,
  );
}

// =============================================================
//  GROWING GUIDE — guide.js
//  All layout/style handled by guide.css (no inline styles)
// =============================================================

// ── Helper: format water-management description bullets ──────
function formatBulletPoints(text) {
  if (!text) return "";
  let html = "";
  const lines = text.split("\n");
  let inBulletSection = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.includes("❖")) {
      html += `<p style="margin:10px 0 0 0;">${line}</p>`;
      inBulletSection = true;
    } else if (line.includes("➤")) {
      html += `<p style="margin:0 0 8px 0; padding-left:20px; text-align:justify;">${line}</p>`;
    } else if (inBulletSection) {
      html += `<p style="margin:0 0 8px 0; padding-left:20px; text-align:justify;">${line}</p>`;
    } else {
      html += `<p style="margin:0 0 10px 0; text-align:justify;">${line}</p>`;
    }
  }
  return html;
}

// ── Helper: format watering schedule ────────────────────────
function formatWateringSchedule(text) {
  if (!text) return "";
  let html = "";
  const lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.includes("❖")) {
      html += `<p style="margin:15px 0 8px 0;">${line}</p>`;
    } else if (line.includes("➤")) {
      const colonIdx = line.indexOf(":");
      const label = colonIdx !== -1 ? line.substring(0, colonIdx + 1) : line;
      const rest = colonIdx !== -1 ? line.substring(colonIdx + 1) : "";
      html += `<p style="margin:0 0 5px 0; padding-left:20px;"><span>${label}</span>${rest}</p>`;
    } else {
      const indent = line.startsWith(" ") ? "40px" : "20px";
      html += `<p style="margin:0 0 5px 0; padding-left:${indent}; text-align:justify;">${line}</p>`;
    }
  }
  return html;
}

// ── Helper: build a 2-column image grid ─────────────────────
function imgGrid2(srcs = [], captions = [], extraClass = "") {
  const imgs = srcs
    .map(
      (src, i) => `
    <img src="${src}" alt="${captions[i] || ""}"
      onerror="this.style.display='none'">
  `,
    )
    .join("");
  return `<div class="guide-img-grid-2 ${extraClass}">${imgs}</div>`;
}

// ── Helper: build a 4-column image grid with captions ───────
function imgGrid4(srcs = [], captions = []) {
  const cells = srcs
    .map(
      (src, i) => `
    <div class="img-cell">
      <img src="${src}" alt="${captions[i] || ""}"
        onerror="this.style.display='none'">
      <p class="img-caption">${captions[i] || ""}</p>
    </div>
  `,
    )
    .join("");
  return `<div class="guide-img-grid-4">${cells}</div>`;
}

// ── Helper: build a 5-column image grid with captions ───────
function imgGrid5(srcs = [], captions = []) {
  const cells = srcs
    .slice(0, 5)
    .map(
      (src, i) => `
    <div class="img-cell">
      <img src="${src}" alt="${captions[i] || ""}"
        onerror="this.style.display='none'">
      <p class="img-caption">${captions[i] || ""}</p>
    </div>
  `,
    )
    .join("");
  return `<div class="guide-img-grid-5">${cells}</div>`;
}

// ── Helper: wrap every table in a scroll wrapper ─────────────
function wrapTables(container) {
  container.querySelectorAll("table").forEach((table) => {
    if (table.closest(".table-scroll-wrapper")) return;

    const outer = document.createElement("div");
    outer.className = "table-scroll-outer";

    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll-wrapper";

    table.parentNode.insertBefore(outer, table);
    outer.appendChild(wrapper);
    wrapper.appendChild(table);
  });
}

// ── Main function ────────────────────────────────────────────
function showGrowingGuide() {
  console.log("showGrowingGuide called");

  if (!currentVariantData) {
    console.error("No variant data available");
    return;
  }

  const lang = currentLang;
  const v = currentVariantData;
  console.log("Variant data:", v);

  const guideContent = document.getElementById("guide-content");
  const guideModal = document.getElementById("guide-modal");

  if (!guideContent) {
    console.error("guide-content not found");
    return;
  }
  if (!guideModal) {
    console.error("guide-modal not found");
    return;
  }

  // Shorthand to get localised string
  const t = (obj, fallback = "") => (obj && obj[lang]) || fallback;

  // Shorthand: direct access for already-localised strings (sectionTitles, subtitleTitles)
  const st = (key, fallback = "") => v.sectionTitles?.[lang]?.[key] || fallback;
  const sub = (key, fallback = "") =>
    v.subtitleTitles?.[lang]?.[key] || fallback;

  // ── BUILD HTML ───────────────────────────────────────────────
  const html = `
<div class="guide-container">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 1 · Features & Land Preparation
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h3 class="guide-section-title">
      ${st("section1", "1. Features (Crop Characteristics)")}
    </h3>

    <div class="guide-features-layout">
      ${
        v.featuresImage
          ? `
        <div class="guide-features-image">
          <img src="${v.featuresImage}" alt="Features"
            onerror="this.style.display='none'">
          <p class="guide-features-image-caption">${t(v.featuresTitle)}</p>
        </div>
      `
          : ""
      }
      <div class="guide-features-bullets">
        <ul class="guide-bullets">
          ${(v.features?.[lang] || []).map((f) => `<li>${f}</li>`).join("")}
        </ul>
      </div>
    </div>

    <hr class="guide-divider">

    <h3 class="guide-section-title">
      ${st("section2", "2. Land Preparation")}
    </h3>
    <ul class="guide-bullets">
      ${(v.landPreparation?.[lang] || []).map((f) => `<li>${f}</li>`).join("")}
    </ul>
  </div>

  <hr class="guide-divider">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 2 · Raising Beds
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h3 class="guide-section-title">
      ${st("section3", "3. Raising Beds for Planting")}
    </h3>

    <ul class="guide-bullets">
      ${(v.bedPreparation?.[lang] || []).map((f) => `<li>${f}</li>`).join("")}
    </ul>

    <div class="guide-checkmarks">
      ${(v.bedPreparationNotes?.[lang] || [])
        .map(
          (note) => `
        <div class="guide-checkmark-item">
          <span class="check-icon">✓</span>
          <span class="check-text">${note.substring(2)}</span>
        </div>
      `,
        )
        .join("")}
    </div>

    <p class="guide-indent" style="font-weight:bold;">
      ${t(v.bedPreparationFooter)}
    </p>

    ${imgGrid2(v.bedImages || [], [], "contain")}
    <p class="guide-img-caption-shared">${t(v.bedtitle)}</p>
  </div>

  <hr class="guide-divider">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 3 · Nursery
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h3 class="guide-section-title">
      ${st("section4", "4. Nursery of Romyoul Seedlings")}
    </h3>

    <p class="guide-indent">${t(v.nursery, "To achieve high efficiency and target yields, farmers can use two planting methods:")}</p>

    <h4 class="guide-subtitle">
      ${sub("directSeeding", "4.1. Direct Seeding")}
    </h4>
    <p class="guide-indent">${(v.directSeeding?.[lang] || []).join(" ")}</p>

    <h4 class="guide-subtitle">
      ${sub("seedlingNursing", "4.2. Seedling Nursing")}
    </h4>
    ${(v.seedlingNursing?.[lang] || [])
      .map((p) => `<p class="guide-indent">${p}</p>`)
      .join("")}

    ${imgGrid2(v.nurseryImages || [])}
    <p class="guide-img-caption-shared">${t(v.nurserytitle)}</p>
  </div>

  <hr class="guide-divider">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 4 · Transplanting
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h3 class="guide-section-title">
      ${st("section5", "5. Transplanting Seedlings")}
    </h3>

    <p class="guide-indent">${(v.transplanting?.[lang] || [])[0] || ""}</p>

    <ul class="guide-bullets">
      ${(v.transplanting?.[lang] || [])
        .slice(1)
        .map((f) => `<li>${f}</li>`)
        .join("")}
    </ul>

    <!-- Row 1 -->
    ${imgGrid2([v.transplantingImages?.[0] || "", v.transplantingImages?.[1] || ""])}
    <p class="guide-img-caption-left">
      <strong>${t(v.trantitle?.[0]?.tran1, "រូបភាពទី៣")}៖</strong>
      ${t(v.trantitle?.[0]?.tran1caption)}
    </p>

    <!-- Row 2 -->
    ${imgGrid2([v.transplantingImages?.[2] || "", v.transplantingImages?.[3] || ""])}
    <p class="guide-img-caption-left">
      <strong>${t(v.trantitle?.[0]?.tran3, "រូបភាពទី៥")}៖</strong>
      ${t(v.trantitle?.[0]?.tran3caption)}
    </p>
  </div>

  <hr class="guide-divider">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 5 · Water Management
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h3 class="guide-section-title">
      ${st("section6", "6. Maintenance")}
    </h3>
    <h4 class="guide-subtitle">
      ${sub("waterManagement", "6.1. Water Management")}
    </h4>

    <!-- 4-col top images -->
    <div class="guide-water-top-grid">
      ${(v.waterManagementTopImages || [])
        .slice(0, 4)
        .map(
          (src, i) => `
        <div class="img-cell">
          <img src="${src}" alt="" onerror="this.style.display='none'">
          <p class="img-caption">${t(v.waterManagementLabels?.[i])}</p>
        </div>
      `,
        )
        .join("")}
    </div>

    <!-- Description -->
    <div style="margin-bottom:12px;">
      ${(() => {
        const parts = (v.waterManagementDesc?.[lang] || "").split("\n\n");
        let out = "";
        if (parts[1]) out += `<p class="guide-indent">${parts[1].trim()}</p>`;
        out += `<div style="text-indent:2.3em; line-height:1.6; text-align:justify;">
          ${formatBulletPoints(v.waterManagementDesc?.[lang] || "")}
        </div>`;
        return out;
      })()}
    </div>

    <!-- Watering schedule -->
    <div style="text-indent:2.3em; margin-bottom:16px; line-height:1.6; text-align:justify;">
      ${formatWateringSchedule(v.wateringSchedule?.[lang] || "")}
    </div>

    <!-- Center images -->
    ${imgGrid2(v.waterManagementCenterImages || [])}
    <p class="guide-img-caption-shared">
      ${t(v.centerImageLabels?.[0], "កូនម្រះបន្ទាប់ពីបណ្តុះបាន១០ថ្ងៃ")}
    </p>
  </div>

  <hr class="guide-divider">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 6 · Fertilizer Management
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h4 class="guide-subtitle">
      ${sub("fertilizerManagement", "6.2. Fertilizer Management")}
    </h4>

    <p class="guide-indent">${t(v.fertilizerIntro, "Farmers can use two methods for fertilization:")}</p>
    <p class="guide-indent">${t(v.fertilizerStep1, "Step 1: Manual/Direct Application")}</p>

    <!-- Fertilizer Table 1 -->
    <table>
      <thead>
        <tr style="text-align:center; font-weight:bold;">
          <th rowspan="2" style="background:#4caf50; color:#fff; white-space:pre-line; min-width:45px;">
            ${t(v.fertilizerTable1.col1)}
          </th>
          <th rowspan="2" style="background:#4caf50; color:#fff; white-space:pre-line; min-width:65px;">
            ${t(v.fertilizerTable1.col2)}
          </th>
          ${v.fertilizerTable1.fertilizers
            .map(
              (f) => `
            <th style="background:${f.headerColor}; color:#fff; min-width:60px;">${t(f.name)}</th>
          `,
            )
            .join("")}
          <th rowspan="3" style="background:#4caf50; color:#fff; min-width:90px;">
            ${t(v.fertilizerTable1.noteHeader)}
          </th>
        </tr>
        <tr style="text-align:center;">
          ${v.fertilizerTable1.fertilizers
            .map(
              (f) => `
            <td style="background:${f.color}; font-weight:bold; color:#333;">${f.spec}</td>
          `,
            )
            .join("")}
        </tr>
        <tr style="text-align:center; font-weight:bold;">
          <td colspan="2" style="background:#4caf50; color:#fff; white-space:pre-line; font-size:0.7rem; vertical-align:middle;">
            ${t(v.fertilizerTable1.totalRowLabel)}
          </td>
          ${v.fertilizerTable1.fertilizers
            .map(
              (f) => `
            <td style="background:#00bcd4; color:#fff;">${f.total}</td>
          `,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${v.fertilizerTable1.rows
          .map(
            (row, i) => `
          <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}; text-align:center;">
            <td style="font-weight:bold;">${row.day}</td>
            <td>${row.dist}</td>
            ${row.vals
              .map(
                (val, vi) => `
              <td style="background:${val ? v.fertilizerTable1.fertilizers[vi].color : "transparent"};">${val}</td>
            `,
              )
              .join("")}
            <td style="text-align:center;">${t(row.note)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <p class="guide-indent" style="margin-top:32px;">
      ${t(v.fertilizerStep2, "Step 2: Fertigation via Drip System")}
    </p>

    <!-- Fertilizer Table 2 -->
    <table>
      <thead>
        <tr style="background:#43b048; color:#fff; text-align:center;">
          <th rowspan="2" style="white-space:pre-line; min-width:45px;">${t(v.fertilizerTable2.headers[0].label)}</th>
          <th rowspan="2" style="min-width:90px;">${t(v.fertilizerTable2.headers[1].label)}</th>
          ${v.fertilizerTable2.headers
            .slice(2)
            .map(
              (h) => `
            <th style="min-width:52px;">${t(h.label)}</th>
          `,
            )
            .join("")}
        </tr>
        <tr style="background:#fff; text-align:center; color:#333;">
          ${v.fertilizerTable2.headers
            .slice(2)
            .map(
              (h) => `
            <td style="font-size:0.7rem; white-space:pre-line; color:#555; vertical-align:middle;">${h.spec || ""}</td>
          `,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${v.fertilizerTable2.sections
          .map((section) => {
            const rowCount = section.rows.length;
            const isGreen = section.bgColor === "#c6efce";
            return section.rows
              .map((row, rowIdx) => {
                const stageTd =
                  rowIdx === 0
                    ? `<td rowspan="${rowCount}" style="background:${isGreen ? "#c6efce" : "#e8f5e9"}; text-align:center; vertical-align:middle; font-weight:bold; white-space:pre-line; line-height:1.5;">${t(section.stage)}</td>`
                    : "";
                const rowBg = isGreen
                  ? "#c6efce"
                  : rowIdx % 2 === 0
                    ? "#f4faf4"
                    : "#fff";
                return `
              <tr style="background:${rowBg}; text-align:center;">
                <td>${row[0]}</td>
                ${stageTd}
                ${row
                  .slice(2)
                  .map((cell) => `<td>${cell}</td>`)
                  .join("")}
              </tr>
            `;
              })
              .join("");
          })
          .join("")}
        <tr style="background:#43b048; color:#fff; font-weight:bold; text-align:center;">
          <td colspan="2" style="white-space:pre-line;">${t(v.fertilizerTable2.totals.label)}</td>
          ${v.fertilizerTable2.totals.values.map((val) => `<td>${val}</td>`).join("")}
        </tr>
      </tbody>
    </table>
  </div>

  <hr class="guide-divider">

  <!-- ═══════════════════════════════════════════════════════
       PAGE 7 · Pest & Disease Management
  ═══════════════════════════════════════════════════════ -->
  <div class="guide-page">
    <h3 class="guide-section-title">
      ${st("section7", "7. Pest and Disease Management")}
    </h3>

    <!-- 7.1 Pest Management -->
    <h4 class="guide-subtitle">
      ${sub("pestManagement", "7.1. Pest Management")}
    </h4>
    <p class="guide-indent">${t(v.pestIntro)}</p>

    <h5 class="guide-subsubtitle">
      ${sub("preventionMethods", "7.1.1. Prevention Methods")}
    </h5>
    <p class="guide-indent">${(v.preventionMethods?.[lang] || [])[0] || ""}</p>
    <ul class="guide-bullets">
      ${(v.preventionMethods?.[lang] || [])
        .slice(1)
        .map((f) => `<li>${f}</li>`)
        .join("")}
    </ul>

    <h5 class="guide-subsubtitle">
      ${sub("eliminationMethods", "7.1.2. Elimination Methods")}
    </h5>
    <p class="guide-indent">${t(v.eliminationMethods)}</p>

    <!-- Pest Table -->
    <p>${t(v.pestTable?.[lang]?.title, "Chemical Control")}</p>
    <table>
      <thead>
        <tr style="background:#43b048; color:#fff; text-align:center;">
          ${(v.pestTable?.[lang]?.headers || [])
            .map((h) => `<th style="padding:8px;">${h}</th>`)
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${(v.pestTable?.[lang]?.rows || [])
          .map(
            (row) => `
          <tr style="border-bottom:1px solid #ddd;">
            ${row
              .map(
                (cell, idx) => `
              <td style="padding:8px; ${idx === 0 ? "text-align:left;" : "text-align:center;"}">${cell}</td>
            `,
              )
              .join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <p class="guide-note">${t(v.pestLegend)}</p>

    <!-- Pest images 4-col grid -->
    <p style="font-weight:bold; margin:16px 0 8px 0;">ប្រភេទសត្វល្អិត / Type of Pests:</p>
    ${imgGrid4(
      v.pestImages || [],
      v.pestNames?.[lang] || v.pestNames?.en || [],
    )}

    <!-- 7.2 Disease Management -->
    <h4 class="guide-subtitle" style="margin-top:24px;">
      ${sub("diseaseManagement", "7.2. Disease Management")}
    </h4>
    <p class="guide-indent">${t(v.diseaseIntro)}</p>

    <!-- Disease images 5-col grid -->
    ${imgGrid5(
      (v.diseaseImages || []).slice(0, 5),
      (v.diseaseNames?.[lang] || v.diseaseNames?.en || []).slice(0, 5),
    )}

    <h5 class="guide-subsubtitle">
      ${sub("diseasePrevention", "7.2.1. Plant Disease Prevention Methods")}
    </h5>
    <p class="guide-indent">${(v.diseasePrevention?.[lang] || [])[0] || ""}</p>
    <ul class="guide-bullets">
      ${(v.diseasePrevention?.[lang] || [])
        .slice(1)
        .map((f) => `<li>${f}</li>`)
        .join("")}
    </ul>

    <img src="${v.diseasePreventionImage || ""}"
      class="guide-disease-prevention-img"
      onerror="this.style.display='none'">

    <!-- Disease Treatment Table -->
    <p style="margin-top:16px;">${t(v.diseasetable, "Chemical Control")}</p>
    <table>
      <thead>
        <tr style="background:#43b048; color:#fff; text-align:center;">
          ${(v.diseaseTreatmentTable?.[lang]?.headers || [])
            .map((h) => `<th style="padding:8px;">${h}</th>`)
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${(v.diseaseTreatmentTable?.[lang]?.rows || [])
          .map(
            (row) => `
          <tr>
            ${row
              .map(
                (cell) =>
                  `<td style="padding:8px; text-align:justify;">${cell}</td>`,
              )
              .join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <p class="guide-note">${t(v.diseaseNote)}</p>
  </div>

</div>
  `;

  // ── Inject HTML ────────────────────────────────────────────
  guideContent.innerHTML = html;

  // ── Wrap all tables for responsive horizontal scroll ──────
  wrapTables(guideContent);

  // ── Show modal ────────────────────────────────────────────
  guideModal.classList.add("active");
  document.body.style.overflow = "hidden";
  console.log("Guide modal activated");
}

async function loadAllProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products?limit=100`);
    const data = await res.json();
    if (data.success) {
      data.products.forEach((p) => {
        products[p.key] = p; // e.g. products["bitter_melon"] = {...}
      });
      console.log("✅ Products loaded:", Object.keys(products));
    }
  } catch (err) {
    console.error("❌ Failed to load products:", err);
  }
}

function showVideo() {
  const message =
    currentLang === "en"
      ? "Video feature coming soon! This will show instructional videos for growing this seed variety."
      : "មុខងារវីដេអូនឹងមកដល់ឆាប់ៗនេះ! វានឹងបង្ហាញវីដេអូណែនាំសម្រាប់ការដាំដុះពូជគ្រាប់នេះ។";
  alert(message);
}

function closeModal() {
  modal.classList.remove("active");
  document.body.style.overflow = "auto";

  // Clean URL when modal closes - keep only product, remove variant
  const url = new URL(window.location);
  url.search = `?${currentProduct}`;
  window.history.replaceState({}, "", url);
  document.title = "Products - KsSEED";
}

function closeGuideModal() {
  guideModal.classList.remove("active");
}

// ========== EVENT LISTENERS ==========
// Product list click handlers
listItems.forEach((item) => {
  item.addEventListener("click", () => {
    listItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    const productKey = item.dataset.product;
    const url = new URL(window.location);
    url.search = `?${productKey}`;
    window.history.pushState({}, "", url);
    showProduct(productKey);
  });
});

// Close modal handlers
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

guideModalClose.addEventListener("click", closeGuideModal);
guideModal.addEventListener("click", (e) => {
  if (e.target === guideModal) closeGuideModal();
});

// Escape key handler
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal.classList.contains("active")) closeModal();
    if (guideModal.classList.contains("active")) closeGuideModal();
  }
});

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const nav = document.getElementById("nav");

mobileMenuToggle.addEventListener("click", () => {
  nav.classList.toggle("active");
  mobileMenuToggle.classList.toggle("active");
});

// Close mobile menu when clicking on a link
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
  });
});

// Browser back/forward navigation
window.addEventListener("popstate", function () {
  console.log("popstate event fired");
  const urlHandled = handleURLParameters();
  if (!urlHandled) {
    // If URL doesn't contain product params, show default
    const urlParams = window.location.search;
    if (!urlParams || urlParams === "?" || urlParams === "") {
      showProduct(currentProduct);
    }
  }
});

// ========== INITIALIZATION ==========
window.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded - Initializing...");

  try {
    // Initialize database
    await initDB();

    await loadAllProducts();

    // Load saved language
    const savedLang = await loadFromIndexedDB("currentLang", "en");
    currentLang = savedLang;
    console.log("Loaded language:", savedLang);

    // Load saved product
    const savedProduct = await loadFromIndexedDB("currentProduct", "cucumber");
    currentProduct = savedProduct;
    console.log("Loaded product:", savedProduct);

    // Apply saved language
    updateLanguage(savedLang);

    // Update active state in UI
    langOptions.forEach((opt) => {
      if (opt.getAttribute("data-lang") === savedLang) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });

    // Handle URL parameters FIRST (this will open modal if URL has variant)
    const urlHandled = handleURLParameters();

    // If URL doesn't specify a product, show saved product
    if (!urlHandled) {
      console.log("No URL params, showing default product:", currentProduct);
      showProduct(currentProduct);
    }
  } catch (error) {
    console.error("Error initializing:", error);
    // Fallback to defaults
    updateLanguage("en");
    showProduct("cucumber");
  }
});

// Add CSS for fade animation if not already present
if (!document.querySelector("#fade-animation")) {
  const style = document.createElement("style");
  style.id = "fade-animation";
  style.textContent = `
    .fade-up {
      animation: fadeUp 0.5s ease forwards;
    }
    
    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

// Debug: Log current URL
console.log("Current URL:", window.location.href);
