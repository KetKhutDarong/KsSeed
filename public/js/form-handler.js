// form-handler.js - Ensure "loading" modal stays visible for a minimum time so it's smooth
// Newsletter now sends ONLY email. Contact still sends full fields.

document.addEventListener("DOMContentLoaded", () => {
  const BACKEND_URL = window.location.origin;

  const alertMessages = {
    en: {
      missingFields: "Please fill in all required fields",
      sending: "Sending...",
      pleaseWait: "Please wait",
      messageSent: "Message Sent",
      messageSuccess: "Your message has been sent successfully!",
      error: "Error",
      sendError: "Failed to send message. Please try again.",
      networkError: "Network Error",
      tryAgainLater: "Please try again later",
      invalidEmail: "Please enter a valid email address",
      subscribing: "Subscribing...",
      subscribed: "Subscribed!",
      thankYouSubscribe: "Thank you for subscribing to our newsletter!",
      alreadySubscribed: "This email is already on our mailing list!",
      subscribeError: "Unable to subscribe. Please try again.",
      confirmText: "OK",
    },
    km: {
      missingFields: "សូមបំពេញគ្រប់ព័ត៌មានដែលត្រូវការ",
      sending: "កំពុងផ្ញើ...",
      pleaseWait: "សូមរង់ចាំ",
      messageSent: "ផ្ញើដោយជោគជ័យ",
      messageSuccess: "សារ​របស់​អ្នក​ត្រូវ​បាន​ផ្ញើ​ដោយ​ជោគ​ជ័យ!",
      error: "កំហុស",
      sendError: "មិនអាចផ្ញើសារបាន។ សូមព្យាយាមម្តងទៀត។",
      networkError: "កំហុសបណ្តាញ",
      tryAgainLater: "សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ",
      invalidEmail: "សូមបញ្ចូលអ៊ីមែលដែលត្រឹមត្រូវ",
      subscribing: "កំពុងជាវ...",
      subscribed: "បានជាវដោយជោគជ័យ!",
      thankYouSubscribe: "សូមអរគុណសម្រាប់ការជាវព្រឹត្តិប័ត្រព័ត៌មានរបស់យើង!",
      alreadySubscribed: "អ៊ីមែលនេះបានជាវរួចហើយ!",
      subscribeError: "មិនអាចជាវបាន។ សូមព្យាយាមម្តងទៀត។",
      confirmText: "យល់ព្រម",
    },
  };

  let currentLang = "en";

  const fontMapping = {
    en: "'Poppins', sans-serif",
    km: "'Hanuman', sans-serif",
  };

  // Replace window.alert to use custom modal if available
  window.alert = function (message) {
    console.log("Browser alert intercepted:", message);
    if (window.customAlert) {
      if (typeof window.customAlert.removePreviousModals === "function") {
        window.customAlert.removePreviousModals();
      }
      setTimeout(() => {
        window.customAlert.info("Alert", String(message), {
          autoClose: true,
          closeTime: 3000,
        });
      }, 60);
    }
    return true;
  };

  // Inject modal CSS (uses your :root colors; adjust in global CSS if needed)
  if (!document.getElementById("custom-alert-css")) {
    const css = `
    :root{
      --primary-green: #4caf50;
      --primary-yellow: #ffd54f;
      --white: #ffffff;
      --dark-gray: #333333;
      --border-radius: 12px;
      --backdrop: rgba(12, 17, 25, 0.65);
    }
    .custom-alert-modal { position: fixed; inset: 0; display:none; align-items:center; justify-content:center; z-index:12000; backdrop-filter: blur(4px); background:var(--backdrop); opacity:0; transition:opacity 220ms ease;}
    .custom-alert-modal.active { display:flex; opacity:1; }
    .custom-alert-container { width:92%; max-width:540px; border-radius:calc(var(--border-radius) + 2px); overflow:hidden; box-shadow: 0 18px 50px rgba(2,6,23,0.6); background: linear-gradient(180deg, rgba(26,26,46,0.98), rgba(14,18,36,0.98)); border:1px solid rgba(255,255,255,0.04); transform: translateY(10px) scale(.98); transition: transform 260ms cubic-bezier(.2,.9,.3,1), opacity 200ms; opacity:0; }
    .custom-alert-modal.active .custom-alert-container { transform: translateY(0) scale(1); opacity:1; }
    .custom-alert-header { padding:18px 20px; display:flex; align-items:center; justify-content:center; position:relative; gap:12px; color:var(--white); }
    .custom-alert-header h3 { margin:0; font-size:1.15rem; font-weight:700; display:flex; gap:10px; align-items:center; }
    .close-alert { position:absolute; right:14px; top:50%; transform:translateY(-50%); width:36px; height:36px; border-radius:50%; background: rgba(255,255,255,0.06); border:none; color:var(--white); display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .custom-alert-body { padding:26px 28px 30px; text-align:center; }
    .alert-icon { font-size:3.2rem; display:inline-flex; align-items:center; justify-content:center; width:72px; height:72px; margin:0 auto 18px; border-radius:50%; background: rgba(255,255,255,0.03); }
    .alert-icon.success { color:var(--primary-green); }
    .alert-icon.error { color:#ff6b6b; }
    .custom-alert-body p { color:#e6e6e9; font-size:1rem; margin:0 0 18px; line-height:1.5; }
    .custom-alert-actions { display:flex; gap:12px; justify-content:center; margin-top:6px; }
    .custom-alert-btn { padding:10px 20px; border-radius:10px; border:none; font-weight:700; cursor:pointer; }
    .custom-alert-btn.primary { background: linear-gradient(90deg, var(--primary-green) 0%, #3aa341 100%); color:var(--white); box-shadow: 0 8px 22px rgba(74,197,99,0.18); }
    .loading-dots { display:flex; gap:8px; justify-content:center; margin:12px 0 16px; }
    .loading-dot { width:10px; height:10px; border-radius:50%; background:var(--primary-green); animation: bounce 1.2s infinite; }
    .loading-dot:nth-child(1) { animation-delay:-0.24s; } .loading-dot:nth-child(2) { animation-delay:-0.12s; }
    .subBtn{background: linear-gradient(90deg, #4d96ff 0%, #256ed7 100%); color:var(--white); box-shadow: 0 8px 22px rgba(74,197,99,0.18);}
    @keyframes bounce { 0%,80%,100% { transform: scale(0) } 40% { transform: scale(1) } }
    @media (max-width:420px) { .custom-alert-container { max-width:94%; border-radius:12px; } .alert-icon { width:64px; height:64px; } .custom-alert-body { padding:18px; } }
    `;
    const s = document.createElement("style");
    s.id = "custom-alert-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // --- ModalAlert class (updated language handling & confirm text) ---
  class ModalAlert {
    constructor() {
      this.currentLang = "en";
      this.activeModal = null;
      this.lastFocused = null;
      this.keyHandler = null;
      this.createContainer();
      // Minimum visible time for loading modals (milliseconds)
      this.minLoadingMs = 600;
    }

    // Accepts values like "en", "en-US", "km", etc.
    setLanguage(lang) {
      try {
        this.currentLang = String(lang || "en").toLowerCase();
      } catch (e) {
        this.currentLang = "en";
      }
    }

    createContainer() {
      if (!document.getElementById("custom-alert-container")) {
        const wrapper = document.createElement("div");
        wrapper.id = "custom-alert-container";
        document.body.appendChild(wrapper);
      }
    }

    removePreviousModals() {
      document.querySelectorAll(".custom-alert-modal").forEach((m) => {
        try {
          m.remove();
        } catch (e) {}
      });
      this.activeModal = null;
      document.body.style.overflow = "auto";
      if (this.keyHandler) {
        document.removeEventListener("keydown", this.keyHandler);
        this.keyHandler = null;
      }
    }

    darkenColor(color) {
      try {
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const darken = (v) => Math.max(0, v - 40);
        return `#${darken(r).toString(16).padStart(2, "0")}${darken(g).toString(16).padStart(2, "0")}${darken(b).toString(16).padStart(2, "0")}`;
      } catch (e) {
        return color;
      }
    }

    focusableElements(modal) {
      return modal.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
    }

    trapFocus(modal) {
      const focusables = Array.from(this.focusableElements(modal));
      if (focusables.length === 0) return null;
      let idx = 0;
      focusables[0].focus();
      const handler = (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          if (e.shiftKey)
            idx = (idx - 1 + focusables.length) % focusables.length;
          else idx = (idx + 1) % focusables.length;
          focusables[idx].focus();
        }
      };
      modal.addEventListener("keydown", handler);
      return () => modal.removeEventListener("keydown", handler);
    }

    // showAlert returns an object whose close() returns a Promise that resolves when the modal is fully removed
    showAlert(type, title, message, options = {}) {
      const { autoClose = false, closeTime = 3000, onClose = null } = options;
      const id = `alert-${Date.now()}`;

      // Clear previous modals
      this.removePreviousModals();

      const iconMap = {
        success: "ri-checkbox-circle-line",
        error: "ri-close-circle-line",
        warning: "ri-error-warning-line",
        info: "ri-information-line",
        loading: "ri-loader-4-line",
      };
      const colorMap = {
        success: "var(--primary-green)",
        error: "#ff6b6b",
        warning: "var(--primary-yellow)",
        info: "#4d96ff",
        loading: "var(--primary-green)",
      };

      // Normalize and use base language (e.g. "en" from "en-US")
      const baseLang = (this.currentLang || "en").split("-")[0];
      // Get confirm text from alertMessages using getAlertMessage
      const confirmText = getAlertMessage("confirmText");

      const html = `
      <div class="custom-alert-modal" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" aria-describedby="${id}-desc">
        <div class="custom-alert-container" role="document">
          <div class="custom-alert-header" style="background: linear-gradient(90deg, ${colorMap[type]} 0%, ${this.darkenColor(colorMap[type].replace("var(--primary-green)", "#4caf50"))} 100%);">
            <h3 id="${id}-title"><i class="${iconMap[type]}"></i> ${title}</h3>
            <button class="close-alert" aria-label="Close dialog"><span aria-hidden="true">✕</span></button>
          </div>
          <div class="custom-alert-body">
            ${type === "loading" ? `<div class="loading-dots" aria-hidden="true"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div><p id="${id}-desc">${message}</p>` : `<div class="alert-icon ${type}"><i class="${iconMap[type]}"></i></div><p id="${id}-desc">${message}</p><div class="custom-alert-actions"><button class="custom-alert-btn subBtn" data-action="confirm">${confirmText}</button></div>`}
          </div>
        </div>
      </div>
    `;

      const container = document.getElementById("custom-alert-container");
      container.insertAdjacentHTML("beforeend", html);
      const modal = document.getElementById(id);

      // record creation timestamp for loading min duration
      const createdAt = Date.now();
      modal.dataset.createdAt = String(createdAt);

      // Save last focused element and apply font (use baseLang for font mapping)
      this.lastFocused = document.activeElement;
      modal.style.fontFamily = fontMapping[baseLang] || fontMapping.en;

      setTimeout(() => {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
      }, 10);

      this.activeModal = modal;

      let trapCleanup = null;

      const closeNow = () => {
        if (!modal) return;
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
        if (trapCleanup) trapCleanup();
        if (this.keyHandler) {
          document.removeEventListener("keydown", this.keyHandler);
          this.keyHandler = null;
        }
        setTimeout(() => {
          try {
            modal.remove();
          } catch (e) {}
        }, 300);
        try {
          if (
            this.lastFocused &&
            typeof this.lastFocused.focus === "function"
          ) {
            this.lastFocused.focus({ preventScroll: true });
          }
        } catch (e) {}
        this.activeModal = null;
        if (onClose) onClose();
      };

      // close() enforces minimum visible time for loading modals
      const close = () => {
        return new Promise((resolve) => {
          if (!modal) return resolve();
          const isLoading = type === "loading";
          if (!isLoading) {
            closeNow();
            resolve();
            return;
          }
          const created = Number(modal.dataset.createdAt) || Date.now();
          const elapsed = Date.now() - created;
          const remaining = Math.max(0, this.minLoadingMs - elapsed);
          if (remaining > 0) {
            setTimeout(() => {
              closeNow();
              resolve();
            }, remaining);
          } else {
            closeNow();
            resolve();
          }
        });
      };

      // Attach listeners
      const closeBtn = modal.querySelector(".close-alert");
      const confirmBtn = modal.querySelector('[data-action="confirm"]');
      if (closeBtn)
        closeBtn.addEventListener("click", () => {
          close();
        });
      if (confirmBtn)
        confirmBtn.addEventListener("click", () => {
          close();
        });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });

      // ESC to close
      this.keyHandler = (e) => {
        if (!this.activeModal) return;
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
      };
      document.addEventListener("keydown", this.keyHandler);

      // focus trap
      trapCleanup = this.trapFocus(modal);

      // auto close for success type
      if (autoClose && type === "success") {
        setTimeout(() => {
          if (modal && modal.classList.contains("active")) {
            close();
          }
        }, closeTime);
      }

      return {
        close, // returns Promise
        update: (newMessage) => {
          const p = modal.querySelector(`#${id}-desc`);
          if (p) p.textContent = newMessage;
        },
      };
    } // end showAlert

    success(title, message, options = {}) {
      return this.showAlert("success", title, message, options);
    }
    error(title, message, options = {}) {
      return this.showAlert("error", title, message, options);
    }
    warning(title, message, options = {}) {
      return this.showAlert("warning", title, message, options);
    }
    info(title, message, options = {}) {
      return this.showAlert("info", title, message, options);
    }
    loading(title, message = "", options = {}) {
      return this.showAlert("loading", title, message, options);
    }
  } // end ModalAlert

  // initialize alert system
  const customAlert = new ModalAlert();
  window.customAlert = customAlert;

  // LANGUAGE HANDLING helpers
  function getCurrentLanguage() {
    return (
      document.body.getAttribute("data-lang") ||
      localStorage.getItem("ksseed-language") ||
      "en"
    );
  }
  function updateCurrentLanguage() {
    const newLang = getCurrentLanguage();
    if (newLang !== currentLang) {
      currentLang = newLang;
      customAlert.setLanguage(currentLang);
    }
  }
  updateCurrentLanguage();
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.attributeName === "data-lang") updateCurrentLanguage();
    });
  }).observe(document.body, { attributes: true });

  function getAlertMessage(key) {
    return alertMessages[currentLang]?.[key] || alertMessages.en[key] || key;
  }

  // tolerant field retrieval
  function getFieldValue(form, candidates = []) {
    const fd = new FormData(form);
    for (const name of candidates) {
      const v = fd.get(name);
      if (v !== null && String(v).trim() !== "") return String(v).trim();
    }
    for (const name of candidates) {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && el.value && String(el.value).trim() !== "")
        return String(el.value).trim();
    }
    for (const name of candidates) {
      const el = form.querySelector(`#${name}`);
      if (el && el.value && String(el.value).trim() !== "")
        return String(el.value).trim();
    }
    for (const name of candidates) {
      const el = form.querySelector(`[data-field="${name}"]`);
      if (el && el.value && String(el.value).trim() !== "")
        return String(el.value).trim();
    }
    return "";
  }
  function isValidEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  // ---------------- NEWSLETTER handler (EMAIL ONLY) ----------------
  const newsletterForm = document.getElementById("newsletterForm");
  if (newsletterForm) {
    newsletterForm.dataset.customHandler = "true";

    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // ONLY collect email for newsletter
      const email = getFieldValue(newsletterForm, [
        "email",
        "newsletterEmail",
        "newsletter_email",
        "e",
      ]);

      if (!isValidEmail(email)) {
        customAlert.removePreviousModals();
        customAlert.warning(
          getAlertMessage("invalidEmail"),
          getAlertMessage("invalidEmail"),
          { autoClose: true, closeTime: 3000 },
        );
        return false;
      }

      const payload = { email };

      let loadingAlert = null;
      try {
        // show loading (returns object whose close() returns a Promise)
        loadingAlert = customAlert.loading(getAlertMessage("subscribing"), "");
        // send request
        const response = await fetch(`${BACKEND_URL}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // parse result safely
        let result;
        try {
          result = await response.json();
        } catch (err) {
          result = { success: false, message: "Invalid server response" };
        }

        // ensure loading modal stays at least minLoadingMs
        if (loadingAlert && loadingAlert.close) {
          try {
            await loadingAlert.close();
          } catch (err) {
            /* ignore */
          }
          loadingAlert = null;
        }

        // show final modal
        if (response.ok && result.success) {
          customAlert.success(
            getAlertMessage("subscribed"),
            getAlertMessage("thankYouSubscribe"),
            { autoClose: true, closeTime: 3000 },
          );
          newsletterForm.reset();
        } else {
          const msg = (result.message || "").toLowerCase();
          if (
            msg.includes("already") ||
            msg.includes("duplicate") ||
            msg.includes("exists")
          ) {
            customAlert.info(
              getAlertMessage("alreadySubscribed"),
              getAlertMessage("alreadySubscribed"),
              { autoClose: true, closeTime: 3000 },
            );
          } else {
            customAlert.error(
              getAlertMessage("error"),
              result.message || getAlertMessage("subscribeError"),
              { autoClose: true, closeTime: 3000 },
            );
          }
        }
      } catch (err) {
        // If network error, ensure loading modal closed smoothly then show error
        if (loadingAlert && loadingAlert.close) {
          try {
            await loadingAlert.close();
          } catch (e) {}
        }
        customAlert.error(
          getAlertMessage("networkError"),
          getAlertMessage("tryAgainLater"),
          { autoClose: true, closeTime: 3000 },
        );
      }
      return false;
    });
  }

  // ---------------- CONTACT handler ----------------
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.dataset.customHandler = "true";

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = getFieldValue(contactForm, [
        "name",
        "contactName",
        "yourName",
        "fullName",
      ]);
      const email = getFieldValue(contactForm, ["email", "contactEmail", "e"]);
      const phone = getFieldValue(contactForm, [
        "phone",
        "contactPhone",
        "tel",
      ]);
      const subject =
        getFieldValue(contactForm, ["subject", "contactSubject"]) ||
        "General Inquiry";
      const message = getFieldValue(contactForm, [
        "message",
        "contactMessage",
        "msg",
        "yourMessage",
      ]);

      if (!name || !email || !phone || !message) {
        customAlert.removePreviousModals();
        customAlert.warning(
          getAlertMessage("missingFields"),
          getAlertMessage("missingFields"),
          { autoClose: true, closeTime: 3000 },
        );
        return false;
      }

      if (!isValidEmail(email)) {
        customAlert.removePreviousModals();
        customAlert.warning(
          getAlertMessage("invalidEmail"),
          getAlertMessage("invalidEmail"),
          { autoClose: true, closeTime: 3000 },
        );
        return false;
      }

      const payload = { name, email, phone, subject, message };

      let loadingAlert = null;
      try {
        loadingAlert = customAlert.loading(
          getAlertMessage("sending"),
          getAlertMessage("pleaseWait"),
        );

        const response = await fetch(`${BACKEND_URL}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let result;
        try {
          result = await response.json();
        } catch (err) {
          result = { success: false, message: "Invalid server response" };
        }

        // ensure loading modal remains for minimum time
        if (loadingAlert && loadingAlert.close) {
          try {
            await loadingAlert.close();
          } catch (err) {}
          loadingAlert = null;
        }

        if (response.ok && result.success) {
          customAlert.success(
            getAlertMessage("messageSent"),
            getAlertMessage("messageSuccess"),
            { autoClose: true, closeTime: 3000 },
          );
          contactForm.reset();
        } else {
          customAlert.error(
            getAlertMessage("error"),
            result.message || getAlertMessage("sendError"),
            { autoClose: true, closeTime: 3000 },
          );
        }
      } catch (err) {
        if (loadingAlert && loadingAlert.close) {
          try {
            await loadingAlert.close();
          } catch (e) {}
        }
        customAlert.error(
          getAlertMessage("networkError"),
          getAlertMessage("tryAgainLater"),
          { autoClose: true, closeTime: 3000 },
        );
      }

      return false;
    });
  }

  console.log(
    "✅ Form handler initialized (newsletter sends only email; loading modal min duration enforced)",
  );
});
