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
   * 1) Menubar + Routing (Roving Tabindex, History API, Focus Management, Page Title)
   */
  function initMenubarAndRouting() {
    const menubar = qs('.nav-list[role="menubar"]');
    const main = qs('#main-content');
    if (!menubar || !main) {
      console.error('Missing menubar or main content — skipping routing init.');
      return;
    }

    const items = qsa('.nav-link', menubar).filter(Boolean);
    const panels = qsa('[data-route-panel]');

    if (!items.length || !panels.length) {
      console.warn('Missing navigation items or route panels.');
      return;
    }

    /**
     * Updates the tabindex for the Roving Tabindex pattern (only for arrow key navigation).
     * @param {HTMLElement[]} list - Array of navigations links.
     * @param {number} idx - Index of the item to set tabindex="0" and focus.
     */
    function setRoving(list, idx) {
      list.forEach((el, i) => el.setAttribute('tabindex', i === idx ? '0' : '-1'));
      const el = list[idx];
      if (el && typeof el.focus === 'function') el.focus();
    }

    /**
     * Resets all nav items to be in normal tab order (tabindex="0").
     */
    function resetTabOrder(list) {
      list.forEach((el) => el.setAttribute('tabindex', '0'));
    }

    /**
     * Executes the SPA navigation.
     * @param {string} route - The route key (e.g., 'home', 'services').
     * @param {boolean} [pushState=true] - Whether to add a new entry to the browser history.
     */
    function navigateTo(route, pushState = true) {
      if (!route) return;

      // 1. Show/Hide Panel
      const targetPanel = panels.find(p => p.getAttribute('data-route-panel') === route);

      panels.forEach(p => {
        if (p === targetPanel) {
          p.removeAttribute('hidden');
          p.style.display = ''; // Restore CSS display
        } else {
          p.setAttribute('hidden', 'true');
          p.style.display = 'none';
        }
      });

      // 2. Update Nav ARIA state (keep all items in tab order)
      items.forEach(it => {
        if (it.getAttribute('data-route') === route) {
          it.setAttribute('aria-current', 'page');
        } else {
          it.removeAttribute('aria-current');
        }
        // Keep all items in normal tab order
        it.setAttribute('tabindex', '0');
      });


      // 3. History API (URL and Back/Forward Sync)
      const path = `#${route}`;
      if (pushState) {
        window.history.pushState({ route }, ROUTE_TITLES[route] || 'Empower Ability Labs', path);
      }
      
      // 4. Update Page Title
      document.title = ROUTE_TITLES[route] || 'Empower Ability Labs';

      // 5. Focus Management (Shift focus to the page's main heading)
      const targetHeading = targetPanel ? qs('h1, h2', targetPanel) : null;
      if (targetHeading) {
        // Use heading if available, otherwise use main content area
        targetHeading.setAttribute('tabindex', '-1'); // Make heading focusable
        targetHeading.focus();
        targetHeading.removeAttribute('tabindex'); // Remove tabindex so it's not permanently in tab order
      } else {
        main.focus();
      }
    }

    // Nav item click event
    items.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        navigateTo(route);
      });
      // Keyboard activation (Enter/Space on menuitem) handled below, but click works too
    });

    // Track if we're in arrow key navigation mode
    let arrowKeyMode = false;

    // Arrow navigation on menubar (left/right/home/end) - Roving Tabindex implementation
    // Only applies roving tabindex when arrow keys are used, Tab key works normally
    menubar.addEventListener('keydown', (e) => {
      // If Tab is pressed, reset to normal tab order immediately
      if (e.key === 'Tab') {
        resetTabOrder(items);
        arrowKeyMode = false;
        return; // Let Tab work normally
      }

      // Only handle arrow keys, Home, End
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
        return; // Let other keys work normally
      }

      e.preventDefault(); // Prevent default scrolling for arrow keys
      arrowKeyMode = true;
      
      // Find currently focused item
      const activeIndex = items.findIndex(it => it === document.activeElement);
      const currentFocused = activeIndex >= 0 ? activeIndex : 0;
      let nextIndex = -1;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (currentFocused + 1) % items.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentFocused - 1 + items.length) % items.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = items.length - 1;
          break;
      }
      
      if (nextIndex >= 0 && nextIndex !== currentFocused) {
        // Apply roving tabindex for arrow navigation
        setRoving(items, nextIndex);
      }
    });

    // Reset tab order when focus leaves the menubar
    menubar.addEventListener('focusout', (e) => {
      // If focus moved outside the menubar, reset all items to normal tab order
      if (!menubar.contains(e.relatedTarget)) {
        resetTabOrder(items);
        arrowKeyMode = false;
      }
    });

    // Also reset when focus enters menubar via Tab (not arrow keys)
    menubar.addEventListener('focusin', (e) => {
      if (!arrowKeyMode && e.target.classList.contains('nav-link')) {
        resetTabOrder(items);
      }
    });

    // History API: Handle back/forward button
    window.addEventListener('popstate', (e) => {
      const route = e.state ? e.state.route : (window.location.hash.substring(1) || items[0].getAttribute('data-route'));
      navigateTo(route, false); // Don't push a new state
    });

    // Initialize all nav items to be in normal tab order
    resetTabOrder(items);

    // Initial load: determine starting route
    const initialRoute = window.location.hash.substring(1) || items[0].getAttribute('data-route');
    navigateTo(initialRoute, false); // Don't push state on initial load
  }

  /**
   * 2) Modal (dynamic) with Focus Trap and ESC close
   */
  function initModal() {
    // The button that triggers the modal
    const modalTrigger = qsa('#meet-community-btn, #interactive [class*="button-secondary"]');
    if (!modalTrigger) {
      console.info('No modal trigger (.button-secondary) found in interactive area — skipping modal init.');
      return;
    }

    // Modal CSS/DOM additions for presentation:
    // This is not in the provided CSS, but is needed for a functional modal.
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
        width: 450px;
        position: relative;
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
      }
      .empower-modal__content {
          display: grid;
          gap: 1rem;
      }
    `;
    const styleTag = document.createElement('style');
    styleTag.textContent = modalStyles;
    document.head.appendChild(styleTag);


    let modalInstance = null; // Stores the single modal object
    let previouslyFocused = null;


// Preview modal for home 
 function buildModal() {
      const overlay = document.createElement('div');
      overlay.className = 'empower-modal-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'empower-modal';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'empower-modal-heading');
      dialog.setAttribute('tabindex', '-1'); // For initial focus if no focusable children

      const content = document.createElement('div');
      content.className = 'empower-modal__content';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'empower-modal__close';
      closeBtn.setAttribute('aria-label', 'Close interactive modal');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';

      const heading = document.createElement('h2');
      heading.id = 'empower-modal-heading';
      heading.textContent = 'Community Steering Committee';

      const para = document.createElement('p');
      para.textContent = 'We get an aha! moments from product managers who try our services for the first time. We offered many lab days, workshops and offered usability testing services to many companies and organizations including:'; 
      
      // Add example focusable controls inside modal
const list = document.createElement('ul'); 
const companies = ['McGill University', 'Walmart.ca', 'Apple.ca', 'Google.ca', 'Government of Canada'];

companies.forEach(company => {
  const li = document.createElement('li');
  li.textContent = company;
  list.appendChild(li); // Now 'list' exists!
});





      // exampleInput.type = 'text';
      // exampleInput.placeholder = 'Type here';
      // exampleInput.className = 'form-input';

      // const actionBtn = document.createElement('button');
      // actionBtn.type = 'button';
      // actionBtn.textContent = 'Take Action';
      // actionBtn.className = 'button-primary';

      content.appendChild(closeBtn);
      content.appendChild(heading);
      content.appendChild(para);
      content.appendChild(exampleInput);
      content.appendChild(actionBtn);
      dialog.appendChild(content);
      overlay.appendChild(dialog);

      // Utility to find all focusable elements within the modal
      function getFocusable(container) {
        return qsa(FOCUSABLE, container).filter(isVisible);
      }

      function open() {
        previouslyFocused = document.activeElement; // Save reference to the element that triggered the modal
        
        document.body.appendChild(overlay);
        
        // Hide main application content for screen readers
        const main = qs('#main-content');
        if (main) main.setAttribute('aria-hidden', 'true');

        // Initial focus management: focus first element or the dialog itself
        const focusables = getFocusable(dialog);
        (focusables.length ? focusables[0] : dialog).focus();

        // Add event listeners
        overlay.addEventListener('click', overlayClick);
        document.addEventListener('keydown', onKeyDown);
        closeBtn.addEventListener('click', close);
      }

      function close() {
        // Remove listeners
        overlay.removeEventListener('click', overlayClick);
        document.removeEventListener('keydown', onKeyDown);
        
        // Remove modal from DOM
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        
        // Restore main content accessibility
        const main = qs('#main-content');
        if (main) main.removeAttribute('aria-hidden');
        
        // Restore focus to the trigger button
        if (previouslyFocused) previouslyFocused.focus();
      }

      function overlayClick(e) {
        // Close if the click target is the overlay itself (i.e., not a child element)
        if (e.target === overlay) close();
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.key === 'Tab') {
          // Focus trap inside dialog
          const focusables = getFocusable(dialog);
          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;
          
          if (!e.shiftKey && active === last) {
            // Tab from last element loops to first
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && active === first) {
            // Shift+Tab from first element loops to last
            e.preventDefault();
            last.focus();
          }
        }
      }

      return { open, close };
    }















    // Creates the modal DOM structure and its methods
    // function buildModal() {
    //   const overlay = document.createElement('div');
    //   overlay.className = 'empower-modal-overlay';
    //   overlay.setAttribute('role', 'presentation');

    //   const dialog = document.createElement('div');
    //   dialog.className = 'empower-modal';
    //   dialog.setAttribute('role', 'dialog');
    //   dialog.setAttribute('aria-modal', 'true');
    //   dialog.setAttribute('aria-labelledby', 'empower-modal-heading');
    //   dialog.setAttribute('tabindex', '-1'); // For initial focus if no focusable children

    //   const content = document.createElement('div');
    //   content.className = 'empower-modal__content';

    //   const closeBtn = document.createElement('button');
    //   closeBtn.className = 'empower-modal__close';
    //   closeBtn.setAttribute('aria-label', 'Close interactive modal');
    //   closeBtn.type = 'button';
    //   closeBtn.textContent = 'Close';

    //   const heading = document.createElement('h2');
    //   heading.id = 'empower-modal-heading';
    //   heading.textContent = 'Interactive Modal Preview';

    //   const para = document.createElement('p');
    //   para.textContent = 'This is a demonstration modal with a focus trap. Press **Escape** to close, click the close button, or click outside the dialog.';

    //   // Add example focusable controls inside modal
    //   const exampleInput = document.createElement('input');
    //   exampleInput.type = 'text';
    //   exampleInput.placeholder = 'Type here';
    //   exampleInput.className = 'form-input';

    //   const actionBtn = document.createElement('button');
    //   actionBtn.type = 'button';
    //   actionBtn.textContent = 'Take Action';
    //   actionBtn.className = 'button-primary';

    //   content.appendChild(closeBtn);
    //   content.appendChild(heading);
    //   content.appendChild(para);
    //   content.appendChild(exampleInput);
    //   content.appendChild(actionBtn);
    //   dialog.appendChild(content);
    //   overlay.appendChild(dialog);

    //   // Utility to find all focusable elements within the modal
    //   function getFocusable(container) {
    //     return qsa(FOCUSABLE, container).filter(isVisible);
    //   }

    //   function open() {
    //     previouslyFocused = document.activeElement; // Save reference to the element that triggered the modal
        
    //     document.body.appendChild(overlay);
        
    //     // Hide main application content for screen readers
    //     const main = qs('#main-content');
    //     if (main) main.setAttribute('aria-hidden', 'true');

    //     // Initial focus management: focus first element or the dialog itself
    //     const focusables = getFocusable(dialog);
    //     (focusables.length ? focusables[0] : dialog).focus();

    //     // Add event listeners
    //     overlay.addEventListener('click', overlayClick);
    //     document.addEventListener('keydown', onKeyDown);
    //     closeBtn.addEventListener('click', close);
    //   }

    //   function close() {
    //     // Remove listeners
    //     overlay.removeEventListener('click', overlayClick);
    //     document.removeEventListener('keydown', onKeyDown);
        
    //     // Remove modal from DOM
    //     if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        
    //     // Restore main content accessibility
    //     const main = qs('#main-content');
    //     if (main) main.removeAttribute('aria-hidden');
        
    //     // Restore focus to the trigger button
    //     if (previouslyFocused) previouslyFocused.focus();
    //   }

    //   function overlayClick(e) {
    //     // Close if the click target is the overlay itself (i.e., not a child element)
    //     if (e.target === overlay) close();
    //   }

    //   function onKeyDown(e) {
    //     if (e.key === 'Escape') {
    //       e.preventDefault();
    //       close();
    //       return;
    //     }
    //     if (e.key === 'Tab') {
    //       // Focus trap inside dialog
    //       const focusables = getFocusable(dialog);
    //       if (focusables.length === 0) {
    //         e.preventDefault();
    //         return;
    //       }
    //       const first = focusables[0];
    //       const last = focusables[focusables.length - 1];
    //       const active = document.activeElement;
          
    //       if (!e.shiftKey && active === last) {
    //         // Tab from last element loops to first
    //         e.preventDefault();
    //         first.focus();
    //       } else if (e.shiftKey && active === first) {
    //         // Shift+Tab from first element loops to last
    //         e.preventDefault();
    //         last.focus();
    //       }
    //     }
    //   }

    //   return { open, close };
    // }

    // Modal Trigger handler
    modalTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (!modalInstance) modalInstance = buildModal();
      modalInstance.open();
    });

    // Allow Enter/Space on the button to open the modal
    modalTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        modalTrigger.click();
      }
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
    initFooterYear();
    initMenubarAndRouting();
    initModal();
    initSwitches(); // Initializes interactive switches
    initForm(); // Initializes form switch, conditional UI, and validation
  });

})();
