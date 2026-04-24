// blog_detail.js - For blog_detail.html
// Renders dynamic content blocks: text | image-right | image-left | image-center | two-column

function getCurrentLang() {
  return window.currentLang || localStorage.getItem("ksseed-language") || "en";
}

function getBlogIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

let _cachedBlog = null;

// ─────────────────────────────────────────────────────────────
//  BLOCK RENDERERS
//  Each function receives a block object and the current lang,
//  and returns an HTML string.
// ─────────────────────────────────────────────────────────────

function renderBlock(block, lang) {
  switch (block.type) {
    case "text":
      return renderText(block, lang);
    case "image-right":
      return renderImageRight(block, lang);
    case "image-left":
      return renderImageLeft(block, lang);
    case "image-center":
      return renderImageCenter(block, lang);
    case "two-column":
      return renderTwoColumn(block, lang);
    default:
      return "";
  }
}

// Full-width paragraph
function renderText(block, lang) {
  const text = lang === "km" ? block.text?.km : block.text?.en;
  if (!text) return "";
  return `
    <div class="blog-block blog-block--text">
      <p>${text}</p>
    </div>`;
}

// Text LEFT  |  Image RIGHT
function renderImageRight(block, lang) {
  const text = lang === "km" ? block.text?.km : block.text?.en;
  const caption = lang === "km" ? block.caption?.km : block.caption?.en;
  return `
    <div class="blog-block blog-block--image-right">
      ${text ? `<div class="blog-block__text"><p>${text}</p></div>` : ""}
      ${
        block.image
          ? `
      <div class="blog-block__image">
        <img src="${block.image}" alt="${caption || ""}" loading="lazy" />
        ${caption ? `<p class="blog-block__caption">${caption}</p>` : ""}
      </div>`
          : ""
      }
    </div>`;
}

// Image LEFT  |  Text RIGHT
function renderImageLeft(block, lang) {
  const text = lang === "km" ? block.text?.km : block.text?.en;
  const caption = lang === "km" ? block.caption?.km : block.caption?.en;
  return `
    <div class="blog-block blog-block--image-left">
      ${
        block.image
          ? `
      <div class="blog-block__image">
        <img src="${block.image}" alt="${caption || ""}" loading="lazy" />
        ${caption ? `<p class="blog-block__caption">${caption}</p>` : ""}
      </div>`
          : ""
      }
      ${text ? `<div class="blog-block__text"><p>${text}</p></div>` : ""}
    </div>`;
}

// Full-width centered image
function renderImageCenter(block, lang) {
  const caption = lang === "km" ? block.caption?.km : block.caption?.en;
  if (!block.image) return "";
  return `
    <div class="blog-block blog-block--image-center">
      <img src="${block.image}" alt="${caption || ""}" loading="lazy" />
      ${caption ? `<p class="blog-block__caption">${caption}</p>` : ""}
    </div>`;
}

// Two side-by-side text columns
function renderTwoColumn(block, lang) {
  const col1 = lang === "km" ? block.text?.km : block.text?.en;
  const col2 = lang === "km" ? block.textCol2?.km : block.textCol2?.en;
  if (!col1 && !col2) return "";
  return `
    <div class="blog-block blog-block--two-column">
      ${col1 ? `<div class="blog-block__col"><p>${col1}</p></div>` : ""}
      ${col2 ? `<div class="blog-block__col"><p>${col2}</p></div>` : ""}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  MAIN LOAD + DISPLAY
// ─────────────────────────────────────────────────────────────

async function loadBlogDetail() {
  const blogId = getBlogIdFromUrl();
  if (!blogId) {
    showErrorMessage("Blog ID not found in URL");
    return;
  }

  try {
    showLoadingState(true);
    const blog = await fetchBlogFromAPI(blogId);
    if (blog) {
      _cachedBlog = blog;
      displayBlogDetail(blog);
      await loadOtherBlogs(blogId, blog.category);
    } else {
      showErrorMessage("Blog not found");
    }
  } catch (error) {
    console.error("Error loading blog:", error);
    showErrorMessage("Error loading blog. Please try again.");
  } finally {
    showLoadingState(false);
  }
}

async function fetchBlogFromAPI(blogId) {
  try {
    const response = await fetch(`/api/blogs/${blogId}`);
    const data = await response.json();
    return data.success && data.blog ? data.blog : null;
  } catch (error) {
    console.error("Error fetching blog:", error);
    return null;
  }
}

function displayBlogDetail(blog) {
  const container = document.getElementById("blogDetailContainer");
  const descContainer = document.getElementById("blogDescContainer");
  if (!container || !descContainer) return;

  const lang = getCurrentLang();
  const title = lang === "km" ? blog.title.km : blog.title.en;
  const preview = lang === "km" ? blog.preview.km : blog.preview.en;
  const category = lang === "km" ? blog.category?.km : blog.category?.en;

  // ── Top hero card ──
  container.innerHTML = `
    <div class="blog-detail-card">
      <div class="blog-detail-image">
        <img src="${blog.image || "/placeholder.svg"}" alt="${title}" loading="lazy" />
      </div>
      <div class="blog-detail-text">
        <h1 class="text-blog-title">${title}</h1>
        <div class="blog-meta-detail">
          ${category ? `<span class="blog-category-tag">${category}</span>` : ""}
          <span class="blog-date">${(typeof blog.date === "object" ? blog.date?.[lang] : blog.date) || ""}</span>
        </div>
        <p class="text-blog-preview">${preview}</p>
      </div>
    </div>`;

  // ── Dynamic content blocks ──
  const blocks = Array.isArray(blog.content) ? blog.content : [];
  const blocksHTML = blocks.map((block) => renderBlock(block, lang)).join("");

  descContainer.innerHTML = `
    <div class="blog-content-section">
      <h2 class="title-desc">${title}</h2>

      <div class="blog-blocks">
        ${blocksHTML || `<p>${lang === "km" ? "មិនមានខ្លឹមសារ។" : "No content available."}</p>`}
      </div>

      <div class="blog-footer">
        <div class="tags-section">
          ${category ? `<span class="tag">${category}</span>` : ""}
          <span class="tag">${lang === "km" ? "កសិកម្ម" : "Farming"}</span>
          <span class="tag">${lang === "km" ? "បច្ចេកទេស" : "Techniques"}</span>
        </div>
        <div class="author-section">
          <p>${lang === "km" ? "ដោយ" : "By"} <strong>KSSEED</strong></p>
          <p>${lang === "km" ? "ធ្វើបច្ចុប្បន្នភាព" : "Updated on"} ${new Date(blog.updatedAt || blog.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>`;

  updatePageMetadata(blog, lang);
}

// ─────────────────────────────────────────────────────────────
//  OTHER BLOGS
// ─────────────────────────────────────────────────────────────

async function loadOtherBlogs(currentBlogId, currentCategory) {
  const grid = document.getElementById("otherBlogsGrid");
  if (!grid) return;

  try {
    grid.innerHTML =
      '<div class="loading-related">Loading related blogs...</div>';
    const category = currentCategory?.en || "";
    const response = await fetch(
      `/api/blogs?limit=100${category ? `&category=${encodeURIComponent(category)}` : ""}`,
    );
    const data = await response.json();

    if (data.success && data.blogs?.length > 0) {
      const otherBlogs = data.blogs
        .filter((b) => b._id !== currentBlogId)
        .slice(0, 3);
      if (otherBlogs.length === 0) {
        grid.innerHTML = '<p class="no-related">No other blogs available</p>';
        return;
      }
      displayOtherBlogs(otherBlogs, grid);
    } else {
      grid.innerHTML = '<p class="no-related">No related blogs found</p>';
    }
  } catch (error) {
    console.error("Error loading other blogs:", error);
    grid.innerHTML = '<p class="error-related">Error loading related blogs</p>';
  }
}

function displayOtherBlogs(blogs, container) {
  const lang = getCurrentLang();
  container.innerHTML = blogs
    .map((blog) => {
      const title = lang === "km" ? blog.title.km : blog.title.en;
      const preview = lang === "km" ? blog.preview.km : blog.preview.en;
      const category = lang === "km" ? blog.category?.km : blog.category?.en;
      const readMore = lang === "km" ? "អានបន្ថែម →" : "Read More →";
      return `
      <a href="blog_detail.html?id=${blog._id}" class="blog-link">
      <div class="blog-card">
        <div class="blog-image">
          <img src="${blog.image || "/placeholder.svg"}" alt="${title}" loading="lazy" />
          ${category ? `<span class="blog-category">${category}</span>` : ""}
        </div>
        <div class="blog-content">
          <div class="blog-meta">
            <span class="blog-date">${(typeof blog.date === "object" ? blog.date?.[lang] : blog.date) || ""}</span>
          </div>
          <h3>${title}</h3>
          <p>${preview}</p>
          <span class="pc-readmore">${readMore}</span>
        </div>
      </div>
      </a>`;
    })
    .join("");
}

// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────

function shareBlog(blogId, title) {
  const lang = getCurrentLang();
  const shareText =
    lang === "km" ? `អាន "${title}" នៅលើ KsSEED` : `Read "${title}" on KsSEED`;
  if (navigator.share) {
    navigator.share({ title, text: shareText, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert(
        lang === "km"
          ? "ភ្ជាប់ត្រូវបានចម្លងទៅក្តារតម្បៀតខ្ទាស់!"
          : "Link copied to clipboard!",
      );
    });
  }
}

function updatePageMetadata(blog, lang) {
  const title = lang === "km" ? blog.title.km : blog.title.en;
  const desc = lang === "km" ? blog.preview.km : blog.preview.en;
  document.title = `${title} - KsSEED Blog`;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = desc;

  const ogTags = {
    "og:title": title,
    "og:description": desc,
    "og:image": blog.image || window.location.origin + "/placeholder.svg",
    "og:url": window.location.href,
    "og:type": "article",
    "og:site_name": "KsSEED",
  };
  Object.entries(ogTags).forEach(([property, content]) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("property", property);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  });
}

function showLoadingState(show) {
  const c1 = document.getElementById("blogDetailContainer");
  const c2 = document.getElementById("blogDescContainer");
  const c3 = document.getElementById("otherBlogsGrid");
  if (show) {
    if (c1) c1.innerHTML = '<div class="blog-loading">Loading blog...</div>';
    if (c2) c2.innerHTML = "";
    if (c3) c3.innerHTML = "";
  }
}

function showErrorMessage(message) {
  const container = document.getElementById("blogDetailContainer");
  if (!container) return;
  const lang = localStorage.getItem("ksseed-language");
  container.innerHTML = `
    <div class="blog-error">
      <h2>${message}</h2>
      <p>${lang === "km" ? "សូមព្យាយាមម្តងទៀត ឬត្រលប់ទៅទំព័របច្ចុប្បន្នលម្អិត។" : "Please try again or return to the blog page."}</p>
      <a href="blog.html" class="btn btn-primary">${lang === "km" ? "ត្រឡប់ទៅប្លុក" : "Back to Blog"}</a>
    </div>`;
}

function onLanguageChange() {
  if (_cachedBlog) {
    displayBlogDetail(_cachedBlog);
    loadOtherBlogs(getBlogIdFromUrl(), _cachedBlog.category);
  }
}

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  window.onLangChange = (function (prev) {
    return function (lang) {
      if (typeof prev === "function") prev(lang);
      onLanguageChange();
    };
  })(window.onLangChange);

  loadBlogDetail();

  document.addEventListener("languageChange", (e) => {
    if (e.detail?.lang) onLanguageChange();
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("print-btn")) window.print();
  });
});
