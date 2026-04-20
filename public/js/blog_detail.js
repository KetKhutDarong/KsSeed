// blog_detail.js - For blog_detail.html
// Works with MongoDB API

// Get blog ID from URL parameter
function getBlogIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Main function to load and display blog
async function loadBlogDetail() {
  const blogId = getBlogIdFromUrl();

  if (!blogId) {
    showErrorMessage("Blog ID not found in URL");
    return;
  }

  try {
    // Show loading state
    showLoadingState(true);

    // Fetch blog from MongoDB API
    const blog = await fetchBlogFromAPI(blogId);

    if (blog) {
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

// Fetch blog from MongoDB API
async function fetchBlogFromAPI(blogId) {
  try {
    const response = await fetch(`/api/blogs/${blogId}`);
    const data = await response.json();

    if (data.success && data.blog) {
      return data.blog;
    }
    return null;
  } catch (error) {
    console.error("Error fetching blog:", error);
    return null;
  }
}

// Display blog detail
function displayBlogDetail(blog) {
  const container = document.getElementById("blogDetailContainer");
  const descContainer = document.getElementById("blogDescContainer");

  if (!container || !descContainer) {
    console.error("Blog detail containers not found");
    return;
  }

  const currentLang = localStorage.getItem("ksseed-language") || "en";
  const title = currentLang === "km" ? blog.title.km : blog.title.en;
  const preview = currentLang === "km" ? blog.preview.km : blog.preview.en;
  const category = currentLang === "km" ? blog.category?.km : blog.category?.en;
  const content = currentLang === "km" ? blog.content.km : blog.content.en;

  // Format content with paragraphs
  const formattedContent = content
    .split("\n")
    .filter((para) => para.trim())
    .map((para) => `<p>${para}</p>`)
    .join("");

  // Main blog card
  container.innerHTML = `
    <div class="blog-detail-card">
      <div class="blog-detail-image">
        <img src="${blog.image || "/placeholder.svg"}" 
             alt="${title}"
             loading="lazy" />
      </div>
      <div class="blog-detail-text">
        <h1 class="text-blog-title">${title}</h1>
        <div class="blog-meta-detail">
          ${category ? `<span class="blog-category-tag">${category}</span>` : ""}
          <span class="blog-date">${blog.date || "No date"}</span>
          <span class="blog-read-time">${blog.readTime || 0} min read</span>
        </div>
        <p class="text-blog-preview">${preview}</p>
      </div>
    </div>
  `;

  // Detailed content
  descContainer.innerHTML = `
    <div class="blog-content-section">
      <h2 class="title-desc">${title}</h2>
      <div class="blog-content-text">
        ${formattedContent}
      </div>
      <div class="blog-footer">
        <div class="tags-section">
          ${category ? `<span class="tag">${category}</span>` : ""}
          <span class="tag">${currentLang === "km" ? "កសិកម្ម" : "Farming"}</span>
          <span class="tag">${currentLang === "km" ? "បច្ចេកទេស" : "Techniques"}</span>
        </div>
        <div class="author-section">
          <p>${currentLang === "km" ? "ដោយ" : "By"} <strong>KsSEED Team</strong></p>
          <p>${currentLang === "km" ? "អាន់ថ្ងៃចុងក្រោយ" : "Updated on"} ${new Date(blog.updatedAt || blog.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  `;

  // Update page metadata
  updatePageMetadata(blog, currentLang);
}

// Load other related blogs
async function loadOtherBlogs(currentBlogId, currentCategory) {
  const grid = document.getElementById("otherBlogsGrid");

  if (!grid) {
    console.error("Other blogs grid not found");
    return;
  }

  try {
    // Show loading for related blogs
    grid.innerHTML =
      '<div class="loading-related">Loading related blogs...</div>';

    // Fetch other blogs (same category if possible)
    const category = currentCategory?.en || "";
    const response = await fetch(
      `/api/blogs?limit=100${category ? `&category=${category}` : ""}`,
    );
    const data = await response.json();

    if (data.success && data.blogs && data.blogs.length > 0) {
      // Filter out current blog
      const otherBlogs = data.blogs
        .filter((blog) => blog._id !== currentBlogId)
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

// Display other blogs
function displayOtherBlogs(blogs, container) {
  const currentLang = localStorage.getItem("ksseed-language") || "en";

  container.innerHTML = blogs
    .map((blog) => {
      const title = currentLang === "km" ? blog.title.km : blog.title.en;
      const preview = currentLang === "km" ? blog.preview.km : blog.preview.en;
      const category =
        currentLang === "km" ? blog.category?.km : blog.category?.en;
      const readMoreText = currentLang === "km" ? "អានបន្ថែម →" : "Read More →";

      return `
      <div class="blog-card">
        <div class="blog-image">
          <img src="${blog.image || "/placeholder.svg"}" 
               alt="${title}"
               loading="lazy" />
          ${category ? `<span class="blog-category">${category}</span>` : ""}
        </div>
        <div class="blog-content">
          <div class="blog-meta">
            <span class="blog-date">${blog.date || "No date"}</span>
            <span class="blog-read">${blog.readTime || 0} min read</span>
          </div>
          <h3>${title}</h3>
          <p>${preview}</p>
          <a href="blog_detail.html?id=${blog._id}" class="blog-link">
            ${readMoreText}
          </a>
        </div>
      </div>
    `;
    })
    .join("");
}

// Share blog function
function shareBlog(blogId, title) {
  const currentLang = localStorage.getItem("ksseed-language") || "en";
  const shareText =
    currentLang === "km"
      ? `អាន "${title}" នៅលើ KsSEED`
      : `Read "${title}" on KsSEED`;
  const shareUrl = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: title,
      text: shareText,
      url: shareUrl,
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      const message =
        currentLang === "km"
          ? "ភ្ជាប់ត្រូវបានចម្លងទៅក្តារតម្បៀតខ្ទាស់!"
          : "Link copied to clipboard!";
      alert(message);
    });
  }
}

// Update page metadata for SEO
function updatePageMetadata(blog, lang) {
  const title = lang === "km" ? blog.title.km : blog.title.en;
  const description = lang === "km" ? blog.preview.km : blog.preview.en;

  // Update page title
  document.title = `${title} - KsSEED Blog`;

  // Update meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = description;

  // Update Open Graph tags
  updateOpenGraphTags(blog, title, description);
}

// Update Open Graph tags for social sharing
function updateOpenGraphTags(blog, title, description) {
  const metaTags = {
    "og:title": title,
    "og:description": description,
    "og:image": blog.image || window.location.origin + "/placeholder.svg",
    "og:url": window.location.href,
    "og:type": "article",
    "og:site_name": "KsSEED",
  };

  Object.entries(metaTags).forEach(([property, content]) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("property", property);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  });
}

// Show loading state
function showLoadingState(show) {
  const container = document.getElementById("blogDetailContainer");
  const descContainer = document.getElementById("blogDescContainer");
  const otherContainer = document.getElementById("otherBlogsGrid");

  if (show) {
    if (container)
      container.innerHTML = '<div class="blog-loading">Loading blog...</div>';
    if (descContainer) descContainer.innerHTML = "";
    if (otherContainer) otherContainer.innerHTML = "";
  }
}

// Show error message
function showErrorMessage(message) {
  const container = document.getElementById("blogDetailContainer");
  if (container) {
    container.innerHTML = `
      <div class="blog-error">
        <h2>${message}</h2>
        <p>${
          localStorage.getItem("ksseed-language") === "km"
            ? "សូមព្យាយាមម្តងទៀត ឬត្រលប់ទៅទំព័របច្ចុប្បន្នលម្អិត។"
            : "Please try again or return to the blog page."
        }</p>
        <a href="blog.html" class="btn btn-primary">
          ${
            localStorage.getItem("ksseed-language") === "km"
              ? "ត្រឡប់ទៅប្លុក"
              : "Back to Blog"
          }
        </a>
      </div>
    `;
  }
}

// Language change handler
function onLanguageChange() {
  const blogId = getBlogIdFromUrl();
  if (blogId) {
    // Reload the page to get content in new language
    window.location.reload();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Load blog detail
  loadBlogDetail();

  // Listen for language changes
  document.addEventListener("languageChange", (event) => {
    if (event.detail && event.detail.lang) {
      localStorage.setItem("language", event.detail.lang);
      onLanguageChange();
    }
  });

  // Add print button event listener
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("print-btn")) {
      window.print();
    }
  });
});
