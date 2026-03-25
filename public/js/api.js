// api.js - Updated API helper for MongoDB (Render + Local)

// ✅ Auto-detect backend URL
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5502"
    : "https://ksseedcambodian.onrender.com";

// Fetch all products
async function fetchProducts(page = 1, limit = 12) {
  try {
    const response = await fetch(
      `${API_BASE}/api/products?page=${page}&limit=${limit}`,
    );
    const data = await response.json();

    if (data.success) {
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching products:", error);
    return null;
  }
}

// Fetch single product by key
async function fetchProductByKey(productKey) {
  try {
    const response = await fetch(`${API_BASE}/api/products/${productKey}`);
    const data = await response.json();

    if (data.success) {
      return data.product;
    }
    console.error("Product not found:", data.message);
    return null;
  } catch (error) {
    console.error("Network error:", error);
    return null;
  }
}

// Fetch specific variant
async function fetchProductVariant(productKey, variantIndex) {
  try {
    const response = await fetch(
      `${API_BASE}/api/products/${productKey}/variants/${variantIndex}`,
    );
    const data = await response.json();

    if (data.success) {
      return data.variant;
    }
    return null;
  } catch (error) {
    console.error("Network error:", error);
    return null;
  }
}

// Search products
async function searchProducts(query) {
  try {
    const response = await fetch(
      `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
    );
    const data = await response.json();

    if (data.success) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.error("Network error:", error);
    return [];
  }
}

// Get categories
async function fetchCategories() {
  try {
    const response = await fetch(`${API_BASE}/api/categories`);
    const data = await response.json();

    if (data.success) {
      return data.categories;
    }
    return [];
  } catch (error) {
    console.error("Network error:", error);
    return [];
  }
}

// Increment view count
async function incrementViewCount(productKey, variantIndex) {
  try {
    const response = await fetch(
      `${API_BASE}/api/products/${productKey}/variants/${variantIndex}/view`,
      {
        method: "POST",
      },
    );
    const data = await response.json();
    return data.success ? data.views : null;
  } catch (error) {
    console.error("Error incrementing view:", error);
    return null;
  }
}

// Send contact form
async function sendContactForm(formData) {
  try {
    const response = await fetch(`${API_BASE}/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error sending contact:", error);
    return { success: false, message: "Network error" };
  }
}

// Subscribe to newsletter
async function subscribeNewsletter(email) {
  try {
    const response = await fetch(`${API_BASE}/api/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error subscribing:", error);
    return { success: false, message: "Network error" };
  }
}
