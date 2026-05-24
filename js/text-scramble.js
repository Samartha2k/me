/**
 * Text Scramble Loading Screen Animation & Layout Orchestrator
 * Locks viewport scroll, scrambles the name "Samarth" in the hero header,
 * and fades out the loading mask to reveal the page components.
 */

class TextScramble {
  constructor(el, options = {}) {
    this.el = el;
    this.chars = options.chars || '!<>-_\\/[]{}—=+*^?#@%&$';
    this.update = this.update.bind(this);
    this.isResolving = false; // Flag to check when to start resolving target letters
  }

  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = 0;
      // Letters resolve over 15 to 30 frames once resolution is triggered
      const end = Math.floor(Math.random() * 15) + 15;
      this.queue.push({ from, to, start, end });
    }
    
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.isResolving = false;
    this.update();
    return promise;
  }

  reveal() {
    this.isResolving = true;
  }

  update() {
    let output = '';
    let complete = 0;
    
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      
      if (this.isResolving && this.frame >= end) {
        complete++;
        output += to;
      } else {
        // Scrambling phase - display random characters at low opacity
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span style="opacity: 0.4">${char}</span>`;
      }
    }
    
    this.el.innerHTML = output;
    
    if (this.isResolving && complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      if (this.isResolving) {
        this.frame++;
      }
    }
  }

  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

// Orchestrate the loading screen reveal
document.addEventListener('DOMContentLoaded', () => {
  const loader = document.querySelector('.first-word');
  const screen = document.getElementById('loading-screen');
  
  if (!loader || !screen) return;

  const scramble = new TextScramble(loader);
  const targetText = loader.dataset.value || "Samarth";

  // Prevent scroll during loading (Desktop, Mobile, & Tablets)
  const preventScroll = (e) => {
    e.preventDefault();
  };
  
  document.body.style.overflow = 'hidden';
  document.addEventListener('touchmove', preventScroll, { passive: false });
  document.addEventListener('wheel', preventScroll, { passive: false });

  // Dynamically calculate start offset to align the scrolling text's first word with the center
  const updateScrollOffset = () => {
    const firstWord = document.querySelector('.first-word');
    if (firstWord) {
      const firstWordWidth = firstWord.getBoundingClientRect().width;
      const startX = (window.innerWidth / 2) - (firstWordWidth / 2);
      document.documentElement.style.setProperty('--scroll-start-x', `${startX}px`);
    }
  };

  // Run initial offset calculation
  updateScrollOffset();
  
  // Re-calculate on resize
  window.addEventListener('resize', updateScrollOffset);

  const startScramble = () => {
    // Start continuous scrambling immediately
    const scramblePromise = scramble.setText(targetText);
    
    // 1. Minimum animation display time of 1200ms for a premium transition feel
    const minTimePromise = new Promise((resolve) => setTimeout(resolve, 1200));
    
    // 2. Wait for window load event (all images, stylesheets, and assets fully loaded)
    const windowLoadPromise = new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });

    // 3. Safety fallback timeout of 5.5 seconds to prevent getting stuck on extremely slow connections
    const safetyTimeoutPromise = new Promise((resolve) => setTimeout(resolve, 5500));

    // Combine loading promises (no longer blocking on CPU-heavy Three.js mesh building!)
    const assetsReadyPromise = Promise.all([minTimePromise, windowLoadPromise]);

    // Trigger resolution when assets are ready, or upon safety timeout
    Promise.race([assetsReadyPromise, safetyTimeoutPromise]).then(() => {
      updateScrollOffset();
      scramble.reveal();
    });

    scramblePromise.then(() => {
      // Once scramble is complete, hold for 300ms then fade out screen and reveal content
      setTimeout(() => {
        updateScrollOffset(); // Final check before fade
        screen.classList.add('fade-out');
        document.body.classList.add('loaded');
        
        // Initialize Three.js WebGL canvas and build mesh right as the fade-out starts
        if (typeof window.initDepthParallax === 'function') {
          window.initDepthParallax();
        }

        // Start scroll reveal animations for gallery images as the screen fades out
        if (typeof window.initGalleryAnimations === 'function') {
          window.initGalleryAnimations();
        }
        
        // Restore scroll locks
        document.body.style.overflow = '';
        document.removeEventListener('touchmove', preventScroll);
        document.removeEventListener('wheel', preventScroll);
        
        // Trigger a resize event to calculate coordinates properly
        window.dispatchEvent(new Event('resize'));

        // Wait for 400ms fade transition to complete, then lower z-index of scrolling text
        setTimeout(() => {
          document.body.classList.add('loader-finished');
        }, 400);
      }, 300);
    });
  };

  let scrambleStarted = false;
  const triggerStart = () => {
    if (scrambleStarted) return;
    scrambleStarted = true;
    startScramble();
  };

  // Wait for fonts (Bitcount Single) to load so that scrambling starts with the correct geometry
  if (document.fonts) {
    document.fonts.ready.then(triggerStart);
  }
  
  // Fallback trigger on window load
  window.addEventListener('load', triggerStart);
  
  // Safety fallback timeout to trigger scrambling start
  setTimeout(triggerStart, 2500);
});
