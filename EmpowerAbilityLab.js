// EmpowerAbilityLab.js
(function () {
  'use strict';

  // ---------- Helpers ----------
  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  const isVisible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="switch"]'
  ].join(',');

  // 1) Menubar + routing
  function initMenubarAndRouting() {
    const menubar = qs('.nav-list[role="menubar"]');
    if (!menubar) {
      console.info('No menubar (.nav-list[role="menubar"]) found — skipping menubar init.');
      return;
    }

    const items = qsa('.nav-link', menubar).filter(Boolean);

    if (!items.length) {
      console.info('No .nav-link items found inside menubar.');
      return;
    }

    // Roving tabindex 
    items.forEach((btn, i) => {
      btn.setAttribute('role', 'menuitem'); // ensure role
      btn.setAttribute('tabindex', i === 0 ? '0' : '-1');
      // keyboard activation: Enter/Space activates route
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
      // click -> navigate
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        if (route) {
          navigateTo(route);
        }
        // updated roving tabindex: making this item tabbable
        setRoving(items, items.indexOf(btn));
      });
    });

    // Arrow navigation on menubar (left/right/home/end)
    menubar.addEventListener('keydown', (e) => {
      const activeIndex = items.findIndex(it => it.getAttribute('tabindex') === '0');
      let nextIndex = -1;
      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (activeIndex + 1) % items.length;
          break;
        case 'ArrowLeft':
          nextIndex = (activeIndex - 1 + items.length) % items.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = items.length - 1;
          break;
        default:
          break;
      }
      if (nextIndex >= 0) {
        e.preventDefault();
        setRoving(items, nextIndex);
      }
    });

    function setRoving(list, idx) {
      list.forEach((el, i) => el.setAttribute('tabindex', i === idx ? '0' : '-1'));
      const el = list[idx];
      if (el && typeof el.focus === 'function') el.focus();
    }

    // Simple in-page routing: show section[data-route-panel="<route>"]
    const panels = qsa('[data-route-panel]');
    function navigateTo(route) {
      if (!route) return;
      panels.forEach(p => {
        if (p.getAttribute('data-route-panel') === route) {
          p.removeAttribute('hidden');
          p.style.display = ''; // CSS handles layout
        } else {
          p.setAttribute('hidden', 'true');
          p.style.display = 'none';
        }
      });

      // updated aria-current on nav items
      items.forEach(it => {
        if (it.getAttribute('data-route') === route) {
          it.setAttribute('aria-current', 'page');
        } else {
          it.removeAttribute('aria-current');
        }
      });

      // moves focus to main content and set focusable for screenreaders
      const main = qs('#main-content');
      if (main) {
        main.focus();
      }
    }

    // Initialize: reveals first panel that matches any nav with aria-current or default to first nav route
    const current = items.find(it => it.getAttribute('aria-current') === 'page');
    if (current) {
      navigateTo(current.getAttribute('data-route'));
    } else {
      // default to first nav's route
      const firstRoute = items[0].getAttribute('data-route');
      if (firstRoute) navigateTo(firstRoute);
    }
  }

  // 2) Modal (dynamic)
  function initModal() {
    // trigger in interactive card: the button with class .button-secondary
    const modalTrigger = qs('.interactive-card [class*="button-secondary"], .interactive-preview .button-secondary');
    if (!modalTrigger) {
      console.info('No modal trigger (.button-secondary) found in interactive area — skipping modal init.');
      return;
    }

    // Create modal DOM when needed
    function buildModal() {
      const overlay = document.createElement('div');
      overlay.className = 'empower-modal-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'empower-modal';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'empower-modal-heading');
      dialog.setAttribute('tabindex', '-1');

      const content = document.createElement('div');
      content.className = 'empower-modal__content';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'empower-modal__close';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';

      const heading = document.createElement('h2');
      heading.id = 'empower-modal-heading';
      heading.textContent = 'Interactive Modal Preview';

      const para = document.createElement('p');
      para.textContent = 'This is a demonstration modal with focus trap. Press Escape to close or click outside the dialog.';

      // add example focusable controls inside modal
      const exampleInput = document.createElement('input');
      exampleInput.type = 'text';
      exampleInput.placeholder = 'Type here';

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.textContent = 'Action';

      content.appendChild(closeBtn);
      content.appendChild(heading);
      content.appendChild(para);
      content.appendChild(exampleInput);
      content.appendChild(actionBtn);
      dialog.appendChild(content);
      overlay.appendChild(dialog);

      // hook behaviors
      function open() {
        document.body.appendChild(overlay);
        // hides main app for assistive tech
        const main = qs('#main-content');
        if (main) main.setAttribute('aria-hidden', 'true');

        // focus management
        const focusables = getFocusable(dialog);
        (focusables.length ? focusables[0] : dialog).focus();

        // listeners
        overlay.addEventListener('click', overlayClick);
        document.addEventListener('keydown', onKeyDown);
        closeBtn.addEventListener('click', close);
      }

      function close() {
        // remove listeners
        overlay.removeEventListener('click', overlayClick);
        document.removeEventListener('keydown', onKeyDown);
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        const main = qs('#main-content');
        if (main) main.removeAttribute('aria-hidden');
        // restore focus to trigger
        modalTrigger.focus();
      }

      function overlayClick(e) {
        // if click outside dialog content (i.e., target is overlay), close
        if (e.target === overlay) close();
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.key === 'Tab') {
          // focus trap inside dialog
          const focusables = getFocusable(dialog);
          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;
          if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          }
        }
      }

      function getFocusable(container) {
        return qsa(FOCUSABLE, container).filter(isVisible);
      }

      return { open, close };
    }

    let modalInstance = null;
    modalTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (!modalInstance) modalInstance = buildModal();
      modalInstance.open();
    });

    modalTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        modalTrigger.click();
      }
    });
  }

  // 3) Switch component 
  function initSwitches() {
    const switches = qsa('.interactive-preview [role="switch"], .toggle[role="switch"], span.toggle[role="switch"]');
    if (!switches.length) {
      console.info('No switches found (role="switch") — skipping switch init.');
      return;
    }

    switches.forEach(s => {
      // ensure attributes
      if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '0');
      if (!s.hasAttribute('aria-checked')) s.setAttribute('aria-checked', 'false');

      // initializes visual text if present
      updateSwitchText(s);

      function toggle() {
        const current = s.getAttribute('aria-checked') === 'true';
        s.setAttribute('aria-checked', String(!current));
        updateSwitchText(s);
        s.dispatchEvent(new CustomEvent('empower:switch', { detail: { checked: !current } }));
      }

      function updateSwitchText(el) {
        try {
          const checked = el.getAttribute('aria-checked') === 'true';
          // keeps simple visible label
          el.textContent = checked ? 'On' : 'Off';
        } catch (err) {
        }
      }

      s.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
      });

      s.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  // 4) Show/Hide textarea for checkbox (uses aria-controls + aria-expanded)  
  // SHOULD WORK BUT NEEDS TO BE TESTED (BRYAN)
  function initShowHideTextareas() {
      
    // Switch toggle
    const switchBtn = document.getElementById("updates-switch");
    const switchImg = document.getElementById("switch-img");
    const updatesValue = document.getElementById("updates-value");

    switchBtn.addEventListener("click", () => {
      const isOn = switchBtn.getAttribute("aria-checked") === "true";
      switchBtn.setAttribute("aria-checked", !isOn);
      updatesValue.value = !isOn;
      switchImg.src = !isOn ? "images/switch-on.png" : "images/switch-off.png";
    });

    // Show conditional text area only when "invite speaker" is checked
    const speakerCheckbox = document.getElementById("topic-speaker");
    const details = document.getElementById("event-details");

    speakerCheckbox.addEventListener("change", () => {
      const expanded = speakerCheckbox.checked;
      details.hidden = !expanded;
      speakerCheckbox.setAttribute("aria-expanded", expanded);
    });

    // Form validation + notification
    const form = document.getElementById("schedule-form");
    const status = document.getElementById("form-status");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;

      // Clear previous messages
      status.textContent = "";
      document.querySelectorAll(".error").forEach(el => el.textContent = "");

      // Validate email
      const email = document.getElementById("email");
      if (!email.value.trim() || !email.checkValidity()) {
        document.getElementById("email-error").textContent = "A valid email is required.";
        valid = false;
      }

      // Validate topic
      const topics = [...document.querySelectorAll("input[name='topic']:checked")];
      if (topics.length === 0) {
        document.getElementById("topic-error").textContent = "Select at least one topic.";
        valid = false;
      }

      // Validate event description if that checkbox is selected
      if (speakerCheckbox.checked) {
        const eventText = document.getElementById("event-text");
        if (!eventText.value.trim()) {
          document.getElementById("event-text-error").textContent =
            "Please describe your event for speaker requests.";
          valid = false;
        }
      }

      // Notify user
      if (!valid) {
        status.textContent = "There were errors with your submission. Please review the form.";
        return;
      }

      status.textContent = "Thank you! Your request has been submitted successfully.";
      form.reset();
      details.hidden = true;
    });
  }

  //  Boot 
  function knowledgeRunner() {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        initMenubarAndRouting();
        initModal();
        initSwitches();
        initShowHideTextareas();
      } catch (err) {
        console.error('EmpowerAbilityLab.js initialization error:', err);
      }
    });
  }

  // expose for testing
  window.EmpowerAbilityLab = {
    initMenubarAndRouting,
    initModal,
    initSwitches,
    initShowHideTextareas
  };

  knowledgeRunner();
})();
