// EmpowerAbilityLab.js
(function () {
  'use strict';

  // ---------- Helpers ----------
  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  // Checks if an element is visible (accounts for display: none and visibility: hidden)
  const isVisible = el => !!(el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');

  // List of standard focusable elements
  const FOCUSABLE = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="switch"]' // Include custom switch component
  ].join(',');

  const ROUTE_TITLES = {
    'home': 'Home | Empower Ability Labs',
    'services': 'Services | Empower Ability Labs',
    'schedule': 'Schedule a Call | Empower Ability Labs',
    'interactive': 'Interactive Tools | Empower Ability Labs'
  };

  /**
   * Initialize skip link to work with both Space and Enter keys
   */
  function initSkipLink() {
    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.getElementById('main-content');
    
    if (!skipLink || !mainContent) {
      console.info('Skip link or main content not found — skipping skip link init.');
      return;
    }

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Set focus on main content
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      
      // Optional: Remove tabindex after focus to prevent it from being 
      // permanently in the tab order
      mainContent.addEventListener('blur', function removeTempTabindex() {
        mainContent.removeAttribute('tabindex');
        mainContent.removeEventListener('blur', removeTempTabindex);
      }, { once: true });
    });
  }

  function initMenubarAndRouting() {
    const items = qsa('.nav-link'); 
    const panels = qsa('[data-route-panel]');
    const main = qs('#main-content');

    if (!items.length || !panels.length) {
      console.warn('Missing navigation items or route panels.');
      return;
    }

    // Force buttons to be tabbable
    items.forEach(btn => {
      btn.setAttribute('tabindex', '0'); 
      btn.removeAttribute('role'); 
    });

    /**
     * Executes the SPA navigation.
     * @param {string} route - The route key.
     * @param {boolean} pushState - Update URL history?
     * @param {boolean} moveFocus - Should we jump focus to the content? (New Parameter)
     */
    function navigateTo(route, pushState = true, moveFocus = true) {
      if (!route) return;

      // 1. Show/Hide Panel
      const targetPanel = panels.find(p => p.getAttribute('data-route-panel') === route);

      panels.forEach(p => {
        if (p === targetPanel) {
          p.removeAttribute('hidden');
          p.style.display = ''; 
        } else {
          p.setAttribute('hidden', 'true');
          p.style.display = 'none'; 
        }
      });

      // 2. Update Nav State
      items.forEach(it => {
        if (it.getAttribute('data-route') === route) {
          it.setAttribute('aria-current', 'page');
        } else {
          it.removeAttribute('aria-current');
        }
      });

      // 3. History API
      const path = `#${route}`;
      if (pushState) {
        window.history.pushState({ route }, ROUTE_TITLES[route] || 'Empower Ability Labs', path);
      }

      // 4. Update Page Title
      document.title = ROUTE_TITLES[route] || 'Empower Ability Labs';

      // 5. Focus Management (The Fix is Here)
      // Only move focus if 'moveFocus' is true
      if (moveFocus) {
        const targetHeading = targetPanel ? qs('h1, h2', targetPanel) : null;
        if (targetHeading) {
          targetHeading.setAttribute('tabindex', '-1'); 
          targetHeading.focus();
          targetHeading.removeAttribute('tabindex'); 
        } else if (main) {
          main.focus();
        }
      }
    }

    // CLICK EVENT: moveFocus = true
    items.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        navigateTo(route, true, true); // True: Move focus because I clicked
      });
    });

    // BACK BUTTON: moveFocus = true
    window.addEventListener('popstate', (e) => {
      const route = e.state ? e.state.route : (window.location.hash.substring(1) || items[0].getAttribute('data-route'));
      navigateTo(route, false, true); // True: Move focus because context changed
    });

    // INITIAL LOAD: moveFocus = false
    const initialRoute = window.location.hash.substring(1) || items[0].getAttribute('data-route');
    // False: Do NOT move focus on refresh. Let the user start at the top.
    navigateTo(initialRoute, false, false); 
  }

  /**
   * 2) Modal (dynamic) with Focus Trap and ESC close
   */
  function initModal() {
    // 1. Select ALL triggers
    const modalTriggers = qsa('#meet-community-btn, #interactive [class*="button-secondary"]');
    
    if (!modalTriggers.length) {
      console.info('No modal triggers found — skipping modal init.');
      return;
    }

    // 2. Add Modal CSS
    if (!document.getElementById('empower-modal-styles')) {
        const modalStyles = `
        .empower-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(16, 37, 66, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        .empower-modal {
            background-color: var(--color-surface-alt);
            padding: 2rem;
            border-radius: var(--radius-md);
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
            max-width: 90vw;
            width: 500px;
            position: relative;
            max-height: 90vh;
            overflow-y: auto;
        }
        .empower-modal__close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            padding: 0.5rem 1rem;
            border-radius: 999px;
            background: transparent;
            border: 2px solid var(--color-ink);
            cursor: pointer;
            font-weight: 600;
        }
        .empower-modal__content {
            display: grid;
            gap: 1rem;
        }
        .empower-modal__content ul {
            padding-left: 1.5rem; 
        }
        /* Visual focus indicator for list items */
        .empower-modal__content li:focus {
            outline: 2px solid var(--color-focus);
            outline-offset: 2px;
            background-color: rgba(244, 162, 97, 0.1); /* Light highlight */
            border-radius: 4px;
        }
        `;
        const styleTag = document.createElement('style');
        styleTag.id = 'empower-modal-styles';
        styleTag.textContent = modalStyles;
        document.head.appendChild(styleTag);
    }

    let modalInstance = null; 
    let previouslyFocused = null;

    // 3. Define Build Function
    function buildModal() {
      const overlay = document.createElement('div');
      overlay.className = 'empower-modal-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'empower-modal';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'empower-modal-heading');
      dialog.setAttribute('aria-describedby', 'empower-modal-desc');
      dialog.setAttribute('tabindex', '-1'); 

      const content = document.createElement('div');
      content.className = 'empower-modal__content';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'empower-modal__close';
      closeBtn.setAttribute('aria-label', 'Close community modal');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';

      // --- Content ---
      const heading = document.createElement('h2');
      heading.id = 'empower-modal-heading';
      heading.textContent = 'Community Steering Committee';
      heading.setAttribute('tabindex', '-1'); 

      const para = document.createElement('p');
      para.id = 'empower-modal-desc';
      para.textContent = 'We get an aha! moments from product managers who try our services for the first time. We offered many lab days, workshops and offered usability testing services to many companies and organizations including:'; 

      const list = document.createElement('ul');
      // Removed tabindex from UL so it is not a "group" stop
      list.setAttribute('aria-label', 'List of participating companies');
      
      const companies = ['McGill University', 'Walmart.ca', 'Apple.ca', 'Google.ca', 'Government of Canada'];
      
      companies.forEach(company => {
        const li = document.createElement('li');
        li.textContent = company;
        // ADDED: Tabindex 0 to EACH item so VoiceOver stops on them individually
        li.setAttribute('tabindex', '0'); 
        list.appendChild(li); 
      });

      content.appendChild(closeBtn);
      content.appendChild(heading);
      content.appendChild(para);
      content.appendChild(list); 
      dialog.appendChild(content);
      overlay.appendChild(dialog);

      // --- Focus Management ---
      function getFocusable(container) {
        // This picks up: Heading, Close Button, AND all the List Items
        return qsa(FOCUSABLE, container).filter(isVisible);
      }

      function open() {
        previouslyFocused = document.activeElement; 
        document.body.appendChild(overlay);
        const main = qs('#main-content');
        if (main) main.setAttribute('aria-hidden', 'true');
        
        // Initial Focus: Heading
        // VoiceOver reads Heading -> Description
        heading.focus();

        overlay.addEventListener('click', overlayClick);
        document.addEventListener('keydown', onKeyDown);
        // Strict Trap Listener
        document.addEventListener('focus', trapFocus, true);
        
        closeBtn.addEventListener('click', close);
      }

      function close() {
        overlay.removeEventListener('click', overlayClick);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('focus', trapFocus, true);
        
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        const main = qs('#main-content');
        if (main) main.removeAttribute('aria-hidden');
        if (previouslyFocused) previouslyFocused.focus();
      }

      // Prevents focus from escaping
      function trapFocus(e) {
        if (dialog && !dialog.contains(e.target)) {
            e.stopPropagation();
            dialog.focus(); 
        }
      }

      function overlayClick(e) {
        if (e.target === overlay) close();
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.key === 'Tab') {
          const focusables = getFocusable(dialog);
          if (focusables.length === 0) { e.preventDefault(); return; }
          
          const first = focusables[0]; // Usually Close Button or Heading
          const last = focusables[focusables.length - 1]; // The last List Item
          
          // Shift + Tab (Backwards)
          if (e.shiftKey) {
            // If at start, loop to last list item
            if (document.activeElement === first || document.activeElement === heading || document.activeElement === dialog) {
              e.preventDefault();
              last.focus();
            }
          } 
          // Tab (Forwards)
          else {
            // If at last list item, loop to start
            if (document.activeElement === last) {
              e.preventDefault();
              // Try focusing the close button if available, otherwise first element
              (focusables[0] === heading && focusables.length > 1) ? focusables[1].focus() : focusables[0].focus();
            }
          }
        }
      }

      return { open, close };
    }

    // 4. Attach Listeners
    modalTriggers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!modalInstance) modalInstance = buildModal();
            modalInstance.open();
        });

        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });
  }

  /**
   * 3) ARIA-compliant Toggle/Switch component
   */
  function initSwitches() {
    // Find switches in both interactive area and the form
    const switches = qsa('.interactive-preview [role="switch"], #updates-switch');
    if (!switches.length) {
      console.info('No switches found (role="switch") — skipping switch init.');
      return;
    }

    switches.forEach(s => {
      // Ensure role and state are set
      s.setAttribute('role', 'switch');
      if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '0');
      if (!s.hasAttribute('aria-checked')) s.setAttribute('aria-checked', 'false');

      /**
       * Toggles the state of the switch.
       */
      function toggle() {
        const current = s.getAttribute('aria-checked') === 'true';
        const newState = !current;
        s.setAttribute('aria-checked', String(newState));

        // Handle visual update specific to the simple 'Off'/'On' switch
        if (s.classList.contains('toggle')) {
          s.textContent = newState ? 'On' : 'Off';
        }

        // Handle the switch in the form, which uses images
        if (s.id === 'updates-switch') {
          const switchImg = document.getElementById("switch-img");
          const updatesValue = document.getElementById("updates-value");
          if (switchImg) {
            switchImg.src = newState ? "images/switch-on.png" : "images/switch-off.png";
            switchImg.alt = newState ? "Updates switch is on" : "Updates switch is off";
          }
          if (updatesValue) {
            updatesValue.value = String(newState); // Update the hidden form value
          }
        }

        // Custom event for external logic (optional)
        s.dispatchEvent(new CustomEvent('empower:switch', { detail: { checked: newState } }));
      }

      // Toggle on click
      s.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
      });

      // Toggle on Enter or Space
      s.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      });

      // Initialize the visual state for the interactive toggle (form switch initialized in part 4)
      if (s.classList.contains('toggle')) {
        toggle(); // Run once to set initial visual state based on aria-checked
        toggle(); // Run again to restore initial state and set text content
      }
    });
  }

  /**
   * 4) Conditional UI (Show/Hide textarea) + Form Validation
   */
  function initForm() {
    const form = document.getElementById("schedule-form");
    const status = document.getElementById("form-status");
    const speakerCheckbox = document.getElementById("topic-speaker");
    const eventDetails = document.getElementById("event-details");
    const eventText = document.getElementById("event-text");
    const formToggleCheckbox = qs('#interactive .interactive-preview input[type="checkbox"]');
    const formToggleTextarea = qs('#interactive #feedback-sample');

    if (!form) {
      console.info('No schedule form found — skipping form init.');
      return;
    }

    // --- Conditional UI: Form 'Schedule a Call' Page ---
    // Show conditional text area only when "invite speaker" is checked
    speakerCheckbox.addEventListener("change", () => {
      const expanded = speakerCheckbox.checked;
      eventDetails.hidden = !expanded; // Use the hidden attribute for true hiding
      // Update ARIA-expanded state on the control
      speakerCheckbox.setAttribute("aria-expanded", String(expanded));

      // Clear event text if un-checked
      if (!expanded) {
        eventText.value = '';
        document.getElementById("event-text-error").textContent = ""; // Clear error
      }
    });

    // --- Conditional UI: 'Interactive Tools' Page ---
    if (formToggleCheckbox && formToggleTextarea) {
      formToggleCheckbox.addEventListener("change", () => {
        const expanded = formToggleCheckbox.checked;
        formToggleTextarea.hidden = !expanded;
        formToggleCheckbox.setAttribute("aria-expanded", String(expanded));
      });
    }

    // --- Form Validation ---

    // Validates the phone field against the pattern
    function validatePhone(input) {
      const phonePattern = new RegExp(input.getAttribute('pattern'));
      return !input.value || phonePattern.test(input.value); // Valid if empty or matches pattern
    }

    /**
     * Shows error messages next to the field and returns true if field is valid.
     * @param {HTMLElement} input - The form control element.
     * @param {string} msg - The error message to display.
     * @returns {boolean} - true if valid, false if invalid.
     */
    function showFieldValidation(input, msg) {
      const errorEl = document.getElementById(input.id + "-error");
      if (!errorEl) return true; // Can't show error, so assume valid

      if (msg) {
        errorEl.textContent = msg;
        input.setAttribute('aria-invalid', 'true');
        return false;
      } else {
        errorEl.textContent = '';
        input.removeAttribute('aria-invalid');
        return true;
      }
    }

    // Attach blur listeners for immediate feedback on critical fields
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");

    email.addEventListener('blur', () => {
      showFieldValidation(email, email.value.trim() && email.checkValidity() ? '' : "A valid email is required.");
    });

    phone.addEventListener('blur', () => {
      showFieldValidation(phone, validatePhone(phone) ? '' : "Phone number must be in the format 613-123-1234.");
    });


    // Submit handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      let firstErrorField = null;

      // 1. Clear previous messages
      status.textContent = "";
      qsa(".error").forEach(el => el.textContent = "");
      qsa('input, textarea').forEach(el => el.removeAttribute('aria-invalid'));

      // 2. Validate Email (required + format)
      if (!email.value.trim() || !email.checkValidity()) {
        showFieldValidation(email, "A valid email is required.");
        valid = false;
        if (!firstErrorField) firstErrorField = email;
      }

      // 3. Validate Phone (pattern)
      if (!validatePhone(phone)) {
        showFieldValidation(phone, "Phone number must be in the format 613-123-1234.");
        valid = false;
        if (!firstErrorField) firstErrorField = phone;
      }

      // 4. Validate Topic (at least one checkbox checked)
      const topics = qsa("input[name='topic']:checked");
      const topicErrorEl = document.getElementById("topic-error");
      const topicFieldset = qs('.form-fieldset'); // Closest fieldset or relevant element
      if (topics.length === 0) {
        topicErrorEl.textContent = "Select at least one topic.";
        topicFieldset.setAttribute('aria-invalid', 'true');
        valid = false;
        if (!firstErrorField) firstErrorField = topicFieldset;
      } else {
        topicFieldset.removeAttribute('aria-invalid');
      }

      // 5. Validate Event Description if checkbox is selected
      if (speakerCheckbox.checked && !eventText.value.trim()) {
        showFieldValidation(eventText, "Please describe your event for speaker requests.");
        valid = false;
        if (!firstErrorField) firstErrorField = eventText;
      }

      // 6. Focus on first error and announce failure
      if (!valid) {
        if (firstErrorField) firstErrorField.focus();
        // Announce error count in ARIA live region
        status.setAttribute('class', 'form-status error-status');
        status.textContent = "Submission failed: Please correct the highlighted errors.";
      } else {
        // 7. Successful Submission
        status.setAttribute('class', 'form-status success-status');
        status.textContent = "Thank you! Your call has been successfully scheduled. We will be in touch soon.";

        // Reset form and UI elements
        form.reset();
        eventDetails.hidden = true;
        speakerCheckbox.setAttribute("aria-expanded", "false");

        // Reset the updates switch
        const switchBtn = document.getElementById("updates-switch");
        const switchImg = document.getElementById("switch-img");
        const updatesValue = document.getElementById("updates-value");
        switchBtn.setAttribute("aria-checked", "false");
        updatesValue.value = "false";
        switchImg.src = "images/switch-off.png";
      }
    });
  }

  /**
   * 5) Update footer year on load
   */
  function initFooterYear() {
    const yearSpan = qs('[data-current-year]');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }


  // Initialize all components
  document.addEventListener('DOMContentLoaded', () => {
    initSkipLink();        // NEW: Initialize skip link
    initFooterYear();
    initMenubarAndRouting();
    initModal();
    initSwitches();
    initForm();
  });

})();
