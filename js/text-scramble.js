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
      const end = Math.floor(Math.random() * 15) + 10; // Fast scramble (10-25 frames)
      this.queue.push({ from, to, start, end });
    }
    
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }

  update() {
    let output = '';
    let complete = 0;
    
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span style="opacity: 0.4">${char}</span>`;
      } else {
        output += from;
      }
    }
    
    this.el.innerHTML = output;
    
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
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
    // Re-calculate start offset now that custom fonts are active
    updateScrollOffset();
    
    // Brief initial delay before scramble begins (fast timestamp)
    setTimeout(() => {
      scramble.setText(targetText).then(() => {
        // Once scramble is complete, hold for 300ms then fade out the screen and fade in the content
        setTimeout(() => {
          updateScrollOffset(); // Final check before fade
          screen.classList.add('fade-out');
          document.body.classList.add('loaded');
          
          // Restore scroll locks
          document.body.style.overflow = '';
          document.removeEventListener('touchmove', preventScroll);
          document.removeEventListener('wheel', preventScroll);
          
          // Trigger a resize event to ensure canvas and parallax elements layout correctly
          window.dispatchEvent(new Event('resize'));

          // Wait for 400ms fade transition to complete, then lower z-index of scrolling text
          setTimeout(() => {
            document.body.classList.add('loader-finished');
          }, 400);
        }, 300);
      });
    }, 250);
  };

  let scrambleStarted = false;
  const triggerStart = () => {
    if (scrambleStarted) return;
    scrambleStarted = true;
    startScramble();
  };

  // Wait for fonts (Bitcount Single) to load so that the scrambling looks correct from the start
  if (document.fonts) {
    document.fonts.ready.then(triggerStart);
  }
  
  // Fallback trigger on window load
  window.addEventListener('load', triggerStart);
  
  // Safety fallback timeout of 2.5 seconds
  setTimeout(triggerStart, 2500);
});
