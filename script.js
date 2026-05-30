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
