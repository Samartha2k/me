/**
 * Portfolio Website - Main Application Script
 * 
 * Handles core UI/UX interaction components:
 * 1. Phone & Email buttons with single-tap clipboard copy functionality.
 * 2. Visual confirmation tooltips on successful clipboard transactions.
 * 3. Tab switching and content transitions (Photography, Projects, Awards).
 * 4. Lazy-loaded image reveal transitions using Intersection Observer.
 * 5. CSS `:target` hash-based lightboxes. Custom hash clearing to prevent window scrolling.
 */

// ==========================================
// CLIPBOARD AND COMMUNICATIONS FUNCTIONALITY
// ==========================================

/**
 * Copies plain text to the system clipboard and displays a visual confirmation bubble.
 * 
 * @param {HTMLElement} button - The trigger button containing the success tooltip
 * @param {string} textToCopy - The string value to write to clipboard
 */
function handleCopyToClipboard(button, textToCopy) {
  const copiedMessage = button.querySelector('.copied-message');

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      // Toggle CSS visual state classes
      copiedMessage.classList.add('show');
      setTimeout(() => {
        copiedMessage.classList.remove('show');
      }, 1200); // Autohide confirmation bubble after 1.2s
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
}

/**
 * Initializes single-click copying on the telephone icon button.
 */
function initPhoneButton() {
  const phoneBtn = document.getElementById('phone-btn');
  if (!phoneBtn) return;

  const phoneTooltip = phoneBtn.querySelector('.tooltip-text');

  phoneBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const phoneNumber = phoneTooltip.textContent.trim();
    handleCopyToClipboard(phoneBtn, phoneNumber);
  });
}

/**
 * Initializes clipboard copying on the email icon button and triggers
 * a mailto link action after a brief delay.
 */
function initEmailButton() {
  const emailBtn = document.getElementById('email-btn');
  if (!emailBtn) return;

  const emailTooltip = emailBtn.querySelector('.tooltip-text');

  emailBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const emailAddress = emailTooltip.textContent.trim();

    // Perform copy action first
    handleCopyToClipboard(emailBtn, emailAddress);

    // Trigger local email client mailto protocol after brief delay to allow copy UI to trigger
    setTimeout(() => {
      window.location.href = `mailto:${emailAddress}`;
    }, 180);
  });
}

// ==========================================
// TAB SWITCHING NAVIGATION
// ==========================================

/**
 * Bootstraps horizontal tab switching buttons.
 * Syncs tab item states with the corresponding container panel selectors.
 */
function initTabNavigation() {
  const tabItems = document.querySelectorAll('.tab-item');
  const tabContents = document.querySelectorAll('.tab-content');

  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Remove active classes from all tab nodes
      tabItems.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Mark selected tab as active
      tab.classList.add('active');

      // Unhide target container block
      const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// ==========================================
// SCROLL-TRIGGERED GALLERY ANIMATIONS
// ==========================================

/**
 * Attaches scroll observers to masonry grid items.
 * Staggers animations on viewport entry so images slide in fluidly.
 */
function initGalleryAnimations() {
  const galleryItems = document.querySelectorAll('.masonry a');

  // Loop through all anchor elements in photography grids
  galleryItems.forEach((element, index) => {
    element.classList.add('reveal');
    // Stagger animation transition delay offsets to prevent items animating at identical times
    const delay = (index % 12) * 10; // cycle delay loops every 12 elements
    element.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  // Options configuration for viewport scroll visibility thresholds
  const observerOptions = {
    root: null, // observe relative to viewport bounds
    rootMargin: '0px 0px -10% 0px', // trigger offset line slightly inside bottom of page
    threshold: 0.15 // element is considered visible when 15% is inside viewport
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Toggle CSS class to run reveal transitions
        entry.target.classList.add('is-visible');
        // Unobserve element to prevent transition recycling on scroll-up/down
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Bind observer to all target photography items
  galleryItems.forEach(element => observer.observe(element));
}

// ==========================================
// CSS TARGET LIGHTBOX SCROLL PATCH
// ==========================================

/**
 * Fixes CSS hash lightboxes.
 * Overrides standard close buttons to prevent the page viewport from jumping back to the top of screen.
 */
function initLightboxClose() {
  const closeButtons = document.querySelectorAll('.lightbox .close');
  
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Writing a space character ' ' to location.hash clears the target
      // state without resetting page scroll heights.
      window.location.hash = ' ';
    });
  });

  // Attach backdrop click listener to allow closing lightboxes by tapping empty background regions
  const lightboxes = document.querySelectorAll('.lightbox');
  lightboxes.forEach(lightbox => {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        e.preventDefault();
        window.location.hash = ' ';
      }
    });
  });
}

// ==========================================
// RANDOMIZED DEFAULT TAB LOAD
// ==========================================

/**
 * Randomly opens either the Photography tab or the Projects tab on load (50-50 chance).
 * If the user lands with a hash for a photography image (e.g. #img3), photography is kept active.
 */
function randomizeDefaultTab() {
  if (window.location.hash && window.location.hash.startsWith('#img')) {
    return;
  }

  if (Math.random() < 0.5) {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // Clear active states
    tabItems.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    // Activate Projects tab
    const projectsTab = Array.from(tabItems).find(t => t.dataset.tab === 'projects');
    if (projectsTab) projectsTab.classList.add('active');

    const projectsContent = document.querySelector('[data-content="projects"]');
    if (projectsContent) projectsContent.classList.add('active');
  }
}

// ==========================================
// BOOTSTRAP INITIALIZATION
// ==========================================

/**
 * Run core components bootstrap sequencing.
 */
function init() {
  randomizeDefaultTab();
  initTabNavigation();
  initPhoneButton();
  initEmailButton();
  initGalleryAnimations();
  initLightboxClose();
}

// Attach initial trigger listener
document.addEventListener('DOMContentLoaded', init);
