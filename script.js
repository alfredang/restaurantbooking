/* =====================================================================
   Dragon Gate · 龙门 — script.js
   - Mobile navigation toggle
   - Fade-in-on-scroll via IntersectionObserver
   - Client-side reservation form validation + confirmation
   ===================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initScrollFadeIn();
    initDateConstraint();
    initReservationForm();
    initLeadForm();
    initThemeToggle();
    initChatbot();
  });

  /* ------------------------ Mobile navigation ----------------------- */
  function initMobileNav() {
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      const isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close the menu after a link is tapped (mobile)
    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* --------------------- Fade-in on scroll -------------------------- */
  function initScrollFadeIn() {
    const targets = document.querySelectorAll(".fade-in");
    if (!targets.length) return;

    // Graceful fallback if IntersectionObserver is unavailable
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("visible"); });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ----------- Prevent selecting a date in the past ----------------- */
  function initDateConstraint() {
    const dateInput = document.getElementById("date");
    if (!dateInput) return;
    const today = new Date();
    // Build a local YYYY-MM-DD string (avoids UTC off-by-one)
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = yyyy + "-" + mm + "-" + dd;
  }

  /* --------------------- Reservation form --------------------------- */
  function initReservationForm() {
    const form = document.getElementById("reservationForm");
    if (!form) return;

    const confirmation = document.getElementById("confirmation");
    const confirmationText = document.getElementById("confirmationText");
    const newReservationBtn = document.getElementById("newReservation");

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validation rules per field: returns an error string or "" if valid.
    const validators = {
      name: function (v) {
        return v.trim() ? "" : "Please enter your full name.";
      },
      email: function (v) {
        if (!v.trim()) return "Please enter your email address.";
        return EMAIL_RE.test(v.trim()) ? "" : "Please enter a valid email address.";
      },
      phone: function (v) {
        return v.trim() ? "" : "Please enter a contact number.";
      },
      guests: function (v) {
        const n = Number(v);
        if (!v.trim() || Number.isNaN(n)) return "Please enter the number of guests.";
        if (n < 1) return "At least one guest is required.";
        return "";
      },
      date: function (v) {
        return v ? "" : "Please choose a date.";
      },
      time: function (v) {
        return v ? "" : "Please choose a time.";
      },
    };

    /** Show / clear the inline error for a single field. */
    function setError(name, message) {
      const field = form.elements[name];
      const errorEl = document.getElementById("error-" + name);
      if (errorEl) errorEl.textContent = message;
      if (field) {
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
      }
    }

    // Live-clear an error once the user corrects a field.
    Object.keys(validators).forEach(function (name) {
      const field = form.elements[name];
      if (!field) return;
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") {
          setError(name, validators[name](field.value));
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault(); // never actually submit to a server

      let firstInvalid = null;

      Object.keys(validators).forEach(function (name) {
        const field = form.elements[name];
        const message = validators[name](field.value);
        setError(name, message);
        if (message && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // ---- Success: build a friendly confirmation message ----
      const name = form.elements.name.value.trim();
      const guests = Number(form.elements.guests.value);
      const dateStr = formatDate(form.elements.date.value);
      const timeStr = formatTime(form.elements.time.value);
      const guestWord = guests === 1 ? "guest" : "guests";

      confirmationText.textContent =
        "Thank you, " + name + ". Your table at Dragon Gate for " +
        guests + " " + guestWord + " on " + dateStr + " at " + timeStr +
        " has been received. Our maître d' will confirm by email shortly.";

      form.reset();
      form.hidden = true;
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Allow the guest to start a new reservation.
    if (newReservationBtn) {
      newReservationBtn.addEventListener("click", function () {
        confirmation.hidden = true;
        form.hidden = false;
        initDateConstraint(); // reset the min date
        form.elements.name.focus();
      });
    }
  }

  /* ------------ Spoken confirmation (Web Speech API) -------------- */
  // Reusable hook: speaks a short confirmation aloud, if supported.
  function speakConfirmation(message) {
    if (!("speechSynthesis" in window)) return;
    // Stop anything already queued/speaking so we don't overlap.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  /* -------------------- Contact / enquiry form -------------------- */
  function initLeadForm() {
    const form = document.getElementById("lead-form");
    if (!form) return;

    const confirmation = document.getElementById("lead-confirmation");
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validation rules per field: returns an error string or "" if valid.
    const validators = {
      "lead-name": function (v) {
        return v.trim().length >= 2 ? "" : "Please enter your full name.";
      },
      "lead-email": function (v) {
        if (!v.trim()) return "Please enter your email address.";
        return EMAIL_RE.test(v.trim()) ? "" : "Please enter a valid email address.";
      },
      "lead-phone": function (v) {
        // Optional: only validate when something was entered.
        if (!v.trim()) return "";
        return /^[\d\s()+-]{7,}$/.test(v.trim())
          ? ""
          : "Please enter a valid phone number.";
      },
      "lead-interest": function (v) {
        return v ? "" : "Please select a subject.";
      },
      "lead-message": function (v) {
        return v.trim().length >= 10
          ? ""
          : "Please enter a message of at least 10 characters.";
      },
    };

    /** Show / clear the inline error for a single field. */
    function setError(name, message) {
      const field = form.elements[name];
      const errorEl = document.getElementById("error-" + name);
      if (errorEl) errorEl.textContent = message;
      if (field) {
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
      }
    }

    // Live-clear an error once the user corrects a field.
    Object.keys(validators).forEach(function (name) {
      const field = form.elements[name];
      if (!field) return;
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") {
          setError(name, validators[name](field.value));
        }
      });
    });

    // FormSubmit AJAX endpoint — sends enquiries to this inbox.
    const FORMSUBMIT_ENDPOINT =
      "https://formsubmit.co/ajax/angch@tertiaryinfotech.com";

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      let firstInvalid = null;

      Object.keys(validators).forEach(function (name) {
        const field = form.elements[name];
        const message = validators[name](field.value);
        setError(name, message);
        if (message && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // ---- POST to FormSubmit, then reveal the confirmation panel ----
      const payload = {
        name: form.elements["lead-name"].value.trim(),
        email: form.elements["lead-email"].value.trim(),
        phone: form.elements["lead-phone"].value.trim(),
        subject:
          "Dragon Gate enquiry — " +
          form.elements["lead-interest"].value,
        interest: form.elements["lead-interest"].value,
        message: form.elements["lead-message"].value.trim(),
        _template: "table",
        _captcha: "false",
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("FormSubmit responded " + res.status);
          return res.json();
        })
        .then(function () {
          form.reset();
          form.hidden = true;
          confirmation.hidden = false;
          confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
          // Speak an audible confirmation of the successful enquiry.
          speakConfirmation(
            "Hurray, thank you for submission. We will get back to you in one business day."
          );
        })
        .catch(function () {
          setError(
            "lead-message",
            "Sorry, we couldn't send your message. Please try again or email reserve@dragongate.sg."
          );
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        });
    });

    // Allow the guest to send another message.
    const newBtn = document.getElementById("lead-new-message");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        confirmation.hidden = true;
        form.hidden = false;
        Object.keys(validators).forEach(function (name) {
          setError(name, "");
        });
        form.elements["lead-name"].focus();
      });
    }
  }

  /* ------------------------- Theme toggle --------------------------- */
  function initThemeToggle() {
    var STORAGE_KEY = "dg-theme";
    var btn = document.getElementById("themeToggle");
    if (!btn) return;

    /** Return the currently active theme from the html attribute. */
    function activeTheme() {
      return document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    }

    /** Apply a theme and update the button's aria state + icon/label. */
    function applyTheme(theme) {
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      var isDark = theme === "dark";
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute(
        "aria-label",
        isDark ? "Switch to light theme" : "Switch to dark theme"
      );
      var icon = btn.querySelector(".nav__theme-toggle__icon");
      if (icon) {
        // Sun = light mode active (click to go dark); Moon = dark mode active
        icon.textContent = isDark ? "☽" : "☀"; // ☽ / ☀
      }
    }

    // Initialise: the no-FOUC script may have already set data-theme;
    // read that state rather than re-computing so we stay consistent.
    applyTheme(activeTheme());

    // Toggle on click, persist to localStorage.
    btn.addEventListener("click", function () {
      var next = activeTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        // Private browsing may deny writes — silently ignore.
      }
    });

    // React to OS-level preference changes only when the user has NOT
    // made an explicit choice (no saved preference).
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq && typeof mq.addEventListener === "function") {
      mq.addEventListener("change", function (e) {
        try {
          if (localStorage.getItem(STORAGE_KEY)) return; // user chose explicitly
        } catch (err) { /* ignore */ }
        applyTheme(e.matches ? "dark" : "light");
      });
    }
  }

  /* --------------------------- Chatbot ------------------------------ */
  /*
    RAG over FAQ.md via a local FastAPI + ChromaDB backend.
    Backend: backend/server.py (uvicorn server:app --port 8000)
    Override the endpoint by setting window.CHATBOT_API_URL before
    DOMContentLoaded — handy if you reverse-proxy under /api.
  */
  function initChatbot() {
    const API_URL = window.CHATBOT_API_URL || "http://127.0.0.1:8000/query";

    const fab    = document.getElementById("chatbotFab");
    const panel  = document.getElementById("chatbotPanel");
    const closeBtn = document.getElementById("chatbotClose");
    const form   = document.getElementById("chatbotForm");
    const input  = document.getElementById("chatbotInput");
    const log    = document.getElementById("chatbotLog");
    if (!fab || !panel || !form || !input || !log) return;

    function appendMsg(role, text, opts) {
      const div = document.createElement("div");
      div.className = "chatbot-msg chatbot-msg--" + role;
      if (opts && opts.typing) div.classList.add("chatbot-msg--typing");
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }

    function greet() {
      if (log.childElementCount > 0) return;
      appendMsg(
        "bot",
        "Welcome to Dragon Gate. I can answer questions about our menu, " +
        "hours, location, reservations, and dietary options. What would " +
        "you like to know?"
      );
    }

    function openPanel() {
      panel.hidden = false;
      fab.setAttribute("aria-expanded", "true");
      greet();
      setTimeout(function () { input.focus(); }, 50);
    }

    function closePanel() {
      panel.hidden = true;
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    }

    fab.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) closePanel();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      appendMsg("user", q);
      input.value = "";

      const thinking = appendMsg("bot", "Thinking…", { typing: true });

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          thinking.remove();
          if (data && data.confident && data.answer) {
            appendMsg(
              "bot",
              data.answer + "\n\n— from FAQ: " + data.question
            );
          } else {
            appendMsg(
              "bot",
              "I'm not sure I have that in my notes. For specifics, please " +
              "call +65 6228 8888 or email reserve@dragongate.sg and our " +
              "maître d' will be happy to help."
            );
          }
        })
        .catch(function () {
          thinking.remove();
          appendMsg(
            "bot",
            "Sorry — I can't reach the concierge service right now. Please " +
            "make sure the backend is running (uvicorn server:app --port 8000) " +
            "or contact us at reserve@dragongate.sg."
          );
        });
    });
  }

  /* ----------------------- Formatting helpers ----------------------- */
  function formatDate(value) {
    // value is "YYYY-MM-DD"; render as e.g. "Friday, 12 June 2026"
    const parts = value.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatTime(value) {
    // value is "HH:MM" (24h); render as e.g. "7:30 PM"
    const parts = value.split(":");
    let h = Number(parts[0]);
    const m = parts[1];
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return h + ":" + m + " " + period;
  }
})();
