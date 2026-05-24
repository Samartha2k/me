/**
 * ASCII hover — page-wide circle pixelated mask using a lightweight mouse trail.
 * Dynamically captures page elements (text, images, and backgrounds) and renders
 * a circle-pixelated ASCII dot-matrix trail under the cursor.
 */
const ASCII_CFG = {
  densityThreshold: 0.04,
  densityEdge:      0.07,
  fontSize:         9.5,  // Set to 9.5 (mean of 8 and 11) for balanced pixel size
  circleScale:      0.85, // Set to 0.85 to prevent overlapping and fish-scale clipping, ensuring perfectly discrete circles
  lineSpacing:      0.85,
  contrast:         0.8,  // Keep contrast at 0.8 as requested
  satBoost:         2.2,
  shadowHue:        220,
  highlightHue:     35,
  tintStrength:     0.25, // Set to 0.25 as planned
};

// Fallback low-resolution images are loaded from js/fallback-images.js to prevent
// tainting local canvas renders and bypass CORS protocols when hosting on file://.
// This splits data from execution logic to keep the codebase organized.

(function () {
  let overlayCanvas, overlayCtx;
  let sampleCanvas, sampleCtx;
  let scratchCanvas, scratchCtx;
  let threeCanvas = null;
  let mouse = { x: -999, y: -999 };
  let mouseMoved = false;
  let hero, contactSection;
  let activeImageRects = [];
  let activeCardRects = [];
  let isThreeCanvasSafe = null;
  const safeImageCache = new Map();
  const svgCache = new Map(); // Key: Cache key (e.g. svgHTML + '_' + color), Value: Image object or null if loading
  const fallbackImageElements = new Map();
  if (typeof FALLBACK_IMAGES !== 'undefined') {
    for (const [key, base64] of Object.entries(FALLBACK_IMAGES)) {
      const img = new Image();
      img.src = base64;
      fallbackImageElements.set(key, img);
    }
  }

  function getPhotoName(src) {
    if (!src) return null;
    const match = src.match(/photo-\d+/);
    return match ? match[0] : null;
  }

  function getButtonSvgImage(svgEl, color) {
    const rawHTML = svgEl.outerHTML;
    const cacheKey = rawHTML + '_' + color;
    if (svgCache.has(cacheKey)) {
      return svgCache.get(cacheKey);
    }

    svgCache.set(cacheKey, null);

    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.style.color = color;
    clone.setAttribute('fill', color);

    // Compute thickness based on viewBox width (defaulting to 24)
    const viewBox = clone.getAttribute('viewBox');
    let viewBoxWidth = 24;
    if (viewBox) {
      const parts = viewBox.trim().split(/\s+/);
      if (parts.length === 4) {
        const w = parseFloat(parts[2]);
        if (!isNaN(w) && w > 0) {
          viewBoxWidth = w;
        }
      }
    }
    const thickness = 1.5 * (viewBoxWidth / 24);

    clone.querySelectorAll('*').forEach(child => {
      const tagName = child.tagName.toLowerCase();
      if (['path', 'rect', 'circle', 'polygon', 'ellipse', 'line', 'polyline'].includes(tagName)) {
        const fillAttr = child.getAttribute('fill');
        const strokeAttr = child.getAttribute('stroke');
        
        let hasFill = (fillAttr && fillAttr !== 'none');
        let hasStroke = (strokeAttr && strokeAttr !== 'none');
        
        if (!fillAttr && !strokeAttr) {
          hasFill = true;
          child.setAttribute('fill', color);
        }
        
        if (fillAttr === 'currentColor') {
          child.setAttribute('fill', color);
          hasFill = true;
        }
        if (strokeAttr === 'currentColor') {
          child.setAttribute('stroke', color);
          hasStroke = true;
        }
        
        if (child.style.fill === 'currentColor') {
          child.style.fill = color;
          hasFill = true;
        }
        if (child.style.stroke === 'currentColor') {
          child.style.stroke = color;
          hasStroke = true;
        }

        // Apply visual thickening so details survive downsampling
        if (hasStroke) {
          const existingStrokeWidth = parseFloat(child.getAttribute('stroke-width')) || 1;
          child.setAttribute('stroke-width', Math.max(thickness, existingStrokeWidth * 1.5));
          child.setAttribute('stroke', color);
        } else if (hasFill) {
          child.setAttribute('stroke', color);
          child.setAttribute('stroke-width', thickness);
          child.setAttribute('stroke-linejoin', 'round');
          child.setAttribute('stroke-linecap', 'round');
        }
      }
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    
    // Use data URI to avoid browser/protocol origin limitations on local file:// links
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    const img = new Image();
    img.onload = () => {
      svgCache.set(cacheKey, img);
    };
    img.src = dataUrl;

    return null;
  }

  // Cached live elements list
  let liveTextNodes = [];
  let liveCards = [];
  let liveImages = [];

  function parseBorderRadius(str) {
    if (!str) return 0;
    const parts = str.trim().split(/\s+/).map(p => parseFloat(p) || 0);
    if (parts.length === 0) return 0;
    if (parts.every(v => v === 0)) return 0;
    return parts;
  }

  function drawSimulatedGlobe(ctx, x, y, size) {
    ctx.save();
    
    const globeSize = size * 0.76;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = globeSize / 2;
    const startX = cx - r;
    const startY = cy - r;

    // Create circular clipping path for the globe
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    
    // 1. Fill base ocean background (very dark grey, almost black)
    ctx.fillStyle = '#141414';
    ctx.fillRect(startX, startY, globeSize, globeSize);
    
    // 2. Draw landmasses (light grey/silver) moving left-to-right (rotation)
    ctx.fillStyle = '#b0b0b0';
    
    const speed = Date.now() / 40; // speed of rotation (matching the GIF's rate)
    const offset = speed % (globeSize * 1.5);
    
    ctx.beginPath();
    // Helper to draw landmass shapes
    function drawLandmass(dx) {
      ctx.rect(dx, startY + globeSize * 0.2, globeSize * 0.4, globeSize * 0.5);
      ctx.rect(dx + globeSize * 0.6, startY + globeSize * 0.1, globeSize * 0.45, globeSize * 0.6);
      ctx.rect(dx + globeSize * 1.2, startY + globeSize * 0.35, globeSize * 0.35, globeSize * 0.45);
    }
    
    drawLandmass(startX - globeSize + offset);
    drawLandmass(startX - globeSize + offset - globeSize * 1.5);
    ctx.fill();
    
    // 3. Add 3D Spherical Radial Shadow/Highlight overlay
    const grad = ctx.createRadialGradient(
      cx - r * 0.3, cy - r * 0.3, r * 0.2, // highlight center (top-left relative to center)
      cx, cy, r   // outer edge
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // subtle highlight
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');        // midtones
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');          // shadow (bottom-right)
    
    ctx.fillStyle = grad;
    ctx.fillRect(startX, startY, globeSize, globeSize);
    
    ctx.restore();
  }

  function cleanFont(style, forceThick = false) {
    let weight = style.fontWeight || 'normal';
    if (forceThick) {
      // For the low-res pixel sampler, boost thin fonts (like Montserrat 300) so they don't fade out
      const numericWeight = parseInt(weight, 10);
      if (isNaN(numericWeight) || numericWeight < 600) {
        weight = '700';
      }
    } else {
      // Normalize weights to avoid canvas @font-face matching bugs (e.g. '400' failing to match 'normal')
      if (weight === '400' || weight === '300') {
        weight = 'normal';
      }
    }
    const size = Math.round(parseFloat(style.fontSize)) + 'px';
    let family = style.fontFamily || 'monospace';
    
    return `${weight} ${size} ${family}`;
  }

  function drawTextWithSpacing(ctx, text, x, y, style, parentEl) {
    ctx.save();
    
    const fontSizeVal = parseFloat(style.fontSize) || 16;
    let forceThick = false;
    let strokeW = 0;

    if (parentEl) {
      const isHeadingOrTabOrBtn = parentEl.matches('h1, h2, h3, h4, h5, h6, .tab-item, .button, .tag') || 
                                  parentEl.closest('h1, h2, h3, h4, h5, h6, .tab-item, .button, .tag');
      
      if (isHeadingOrTabOrBtn) {
        forceThick = true;
        strokeW = 1.5;
      } else {
        // Paragraphs / other body text - bold weight but no stroke
        forceThick = true;
        strokeW = 0;
      }
    } else {
      // Fallback
      forceThick = true;
      strokeW = 1.5;
    }

    ctx.font = cleanFont(style, forceThick);
    ctx.textBaseline = 'top';

    if (strokeW > 0) {
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = ctx.fillStyle;
    }

    let letterSpacingStr = style.letterSpacing;
    let spacingPx = 0;
    
    if (letterSpacingStr && letterSpacingStr !== 'normal') {
      if (letterSpacingStr.endsWith('em')) {
        const emVal = parseFloat(letterSpacingStr);
        if (!isNaN(emVal)) {
          spacingPx = emVal * fontSizeVal;
        }
      } else if (letterSpacingStr.endsWith('rem')) {
        const remVal = parseFloat(letterSpacingStr);
        if (!isNaN(remVal)) {
          spacingPx = remVal * 16; // Assumes 16px root font size
        }
      } else {
        const pxVal = parseFloat(letterSpacingStr);
        if (!isNaN(pxVal)) {
          spacingPx = pxVal;
        }
      }
    }

    if (spacingPx !== 0) {
      const letterSpacingPxStr = spacingPx + 'px';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = letterSpacingPxStr;
        ctx.fillText(text, x, y);
        if (strokeW > 0) {
          ctx.strokeText(text, x, y);
        }
        ctx.restore();
        return;
      }
      
      const chars = Array.from(text);
      let curX = x;
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        ctx.fillText(char, curX, y);
        if (strokeW > 0) {
          ctx.strokeText(char, curX, y);
        }
        curX += ctx.measureText(char).width + spacingPx;
      }
    } else {
      ctx.fillText(text, x, y);
      if (strokeW > 0) {
        ctx.strokeText(text, x, y);
      }
    }
    ctx.restore();
  }

  function waitForFluid() {
    if (window.FluidPhysics && FluidPhysics.isReady()) {
      init();
    } else {
      requestAnimationFrame(waitForFluid);
    }
  }

  function isElementVisible(el) {
    if (!el) return false;
    let current = el;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const isTabContent = current.classList.contains('tab-content');
      if (style.display === 'none' || style.visibility === 'hidden' || (!isTabContent && parseFloat(style.opacity) === 0)) {
        return false;
      }
      if (current.offsetParent === null && style.position !== 'fixed' && current.tagName !== 'BODY' && current.tagName !== 'HTML') {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }

  function refreshLiveElements() {
    // 1. Text nodes
    liveTextNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walk.nextNode()) {
      const parent = node.parentElement;
      if (!parent) continue;
      
      // Skip tooltips, copied messages, scripts, styles, overlay canvas, and scrolling text
      if (parent.closest('.tooltip-text') || 
          parent.closest('.copied-message') || 
          parent.closest('script') || 
          parent.closest('style') ||
          parent.closest('#ascii-overlay') ||
          parent.closest('.scrolling-text')) {
        continue;
      }
      
      // Check parent visibility
      if (!isElementVisible(parent)) {
        continue;
      }
      
      const text = node.nodeValue.trim();
      if (text.length > 0) {
        const style = window.getComputedStyle(parent);
        const isInsideContact = !!parent.closest('#contact-me-section');
        const isH2 = parent.tagName.toLowerCase() === 'h2';
        const isTabItem = parent.classList.contains('tab-item');
        const isActive = parent.classList.contains('active');

        const cachedStyle = {
          color: style.color,
          fontSize: style.fontSize,
          letterSpacing: style.letterSpacing,
          fontWeight: style.fontWeight,
          fontFamily: style.fontFamily
        };

        liveTextNodes.push({
          node,
          parent,
          style: cachedStyle,
          isInsideContact,
          isH2,
          isTabItem,
          isActive
        });
      }
    }

    // 2. Cards / interactive elements (including tags, award cards, project images, links, etc.)
    const rawCards = Array.from(document.querySelectorAll('.project-card, .project-image, .project-link, .tag, .award-card, .tab-navigation, #contact-me-section .button, #contact-me-section, .location-badge'))
      .filter(isElementVisible);

    liveCards = rawCards.map(card => {
      const style = window.getComputedStyle(card);
      const isContactSection = !!card.closest('#contact-me-section');
      const isLocationBadge = card.classList.contains('location-badge') || card.classList.contains('location-icon-container');
      const isButton = card.classList.contains('button');
      
      // Extract child SVGs and precompute their colors/cache
      const svgs = Array.from(card.querySelectorAll('svg')).map(svg => {
        const svgStyle = window.getComputedStyle(svg);
        const parentStyleColor = style.color;
        const svgColor = svgStyle.color || parentStyleColor;
        return {
          element: svg,
          color: isContactSection && isButton ? 'rgb(120, 120, 120)' : svgColor
        };
      });

      return {
        element: card,
        id: card.id,
        bgColor: style.backgroundColor,
        borderRadiusStr: style.borderRadius,
        radii: parseBorderRadius(style.borderRadius),
        borderWidth: parseFloat(style.borderWidth) || 0,
        borderColor: style.borderColor,
        borderLeftWidth: parseFloat(style.borderLeftWidth) || 0,
        borderLeftColor: style.borderLeftColor,
        isContactSection: isContactSection,
        isLocationBadge: isLocationBadge,
        isButton: isButton,
        svgs: svgs
      };
    });

    // 3. Images
    liveImages = Array.from(document.querySelectorAll('img')).filter(img => {
      return img.id !== 'ascii-overlay' && !img.closest('#parallax-canvas-container') && isElementVisible(img);
    });

    console.log(`[ASCII-HOVER DEBUG] Refreshed live elements: ${liveTextNodes.length} text nodes, ${liveCards.length} cards, ${liveImages.length} images.`);
  }

  function init() {
    hero = document.getElementById('hero-section');
    contactSection = document.getElementById('contact-me-section');
    if (!hero || !contactSection) return;

    sampleCanvas = document.createElement('canvas');
    sampleCtx    = sampleCanvas.getContext('2d', { willReadFrequently: true });

    scratchCanvas = document.createElement('canvas');
    scratchCtx    = scratchCanvas.getContext('2d');

    overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'ascii-overlay';
    overlayCanvas.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
    document.body.appendChild(overlayCanvas);
    overlayCtx = overlayCanvas.getContext('2d');

    // Attach hover listeners to the entire document
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onLeave);
    document.addEventListener('touchcancel', onLeave);
    window.addEventListener('resize', onResize);
    
    // Throttled scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Refresh elements when clicking (e.g. switching tabs)
    document.addEventListener('click', () => {
      setTimeout(refreshLiveElements, 50);
      setTimeout(refreshLiveElements, 150);
      setTimeout(refreshLiveElements, 350);
      setTimeout(refreshLiveElements, 600);
    });

    // Refresh elements when tab transitions or fade-in animations complete
    document.querySelectorAll('.tab-content').forEach(content => {
      content.addEventListener('animationend', refreshLiveElements);
      content.addEventListener('transitionend', refreshLiveElements);
    });

    // Refresh elements whenever any image loads (e.g. late/lazy loading)
    document.addEventListener('load', (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        refreshLiveElements();
      }
    }, true);

    // Refresh a few times after initialization to catch dynamically rendered layouts
    setTimeout(refreshLiveElements, 200);
    setTimeout(refreshLiveElements, 600);
    setTimeout(refreshLiveElements, 1200);

    // Enable CORS for all images on the page
    enableImageCORS();

    // Programmatically load custom fonts for canvas matching
    if (typeof FontFace !== 'undefined') {
      const bitcountFont = new FontFace('Bitcount Single', 'url(fonts/BitcountSingle-Regular.woff2)');
      bitcountFont.load().then(font => {
        document.fonts.add(font);
        refreshLiveElements();
      }).catch(err => console.warn('Bitcount Single FontFace load failed', err));

      const montserratLight = new FontFace('Montserrat', 'url(fonts/Montserrat-Light.woff2)', { weight: '300' });
      montserratLight.load().then(font => {
        document.fonts.add(font);
        refreshLiveElements();
      }).catch(err => console.warn('Montserrat Light FontFace load failed', err));

      const montserratRegular = new FontFace('Montserrat', 'url(fonts/Montserrat-Regular.woff2)', { weight: '400' });
      montserratRegular.load().then(font => {
        document.fonts.add(font);
        refreshLiveElements();
      }).catch(err => console.warn('Montserrat Regular FontFace load failed', err));
    }

    // Reload list when custom fonts are loaded
    if (document.fonts) {
      document.fonts.ready.then(() => {
        refreshLiveElements();
      });
    }

    onResize();
    requestAnimationFrame(loop);
  }

  function isCrossOrigin(url) {
    try {
      const target = new URL(url, window.location.href);
      return target.origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function isImageSafe(img) {
    if (!img.complete || img.naturalWidth === 0) return false;
    if (safeImageCache.has(img.src)) {
      return safeImageCache.get(img.src);
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    try {
      tempCtx.drawImage(img, 0, 0, 1, 1);
      tempCtx.getImageData(0, 0, 1, 1);
      safeImageCache.set(img.src, true);
      return true;
    } catch (e) {
      safeImageCache.set(img.src, false);
      return false;
    }
  }

  function enableImageCORS() {
    document.querySelectorAll('img').forEach(img => {
      if (img.id === 'ascii-overlay') return;
      if (!isCrossOrigin(img.src)) return;

      const hadCORS = img.hasAttribute('crossorigin');
      if (!hadCORS) {
        img.setAttribute('crossorigin', 'anonymous');
      }

      const src = img.src;
      if (!src.includes('cors=')) {
        img.addEventListener('load', () => {
          refreshLiveElements();
        }, { once: true });

        img.addEventListener('error', function errorHandler() {
          if (!hadCORS) {
            img.removeAttribute('crossorigin');
          }
          img.src = src;
        }, { once: true });

        try {
          const url = new URL(src);
          url.searchParams.set('cors', Date.now());
          img.src = url.toString();
        } catch (e) {
          img.src = src;
        }
      }
    });
  }

  function getThreeCanvas() {
    if (threeCanvas) return threeCanvas;
    const c = document.getElementById('parallax-canvas-container');
    threeCanvas = c && c.querySelector('canvas');
    return threeCanvas;
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouseMoved = true;
    FluidPhysics.pointerMoveHero(mouse.x, mouse.y);
  }

  function onTouchStart(e) {
    const t = e.touches[0];
    if (!t) return;
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouseMoved = true;
    FluidPhysics.pointerMoveHero(mouse.x, mouse.y);
  }

  function onTouchMove(e) {
    const t = e.touches[0];
    if (!t) return;
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouseMoved = true;
    FluidPhysics.pointerMoveHero(mouse.x, mouse.y);
  }

  function onLeave() {
    mouseMoved = false;
    mouse.x = mouse.y = -999;
    if (FluidPhysics && FluidPhysics.isReady()) {
      FluidPhysics.pointerReset();
    }
  }

  function onResize() {
    overlayCanvas.width  = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
    
    scratchCanvas.width  = window.innerWidth;
    scratchCanvas.height = window.innerHeight;
    
    const cellW = ASCII_CFG.fontSize * 0.72;
    const cellH = ASCII_CFG.fontSize * 0.72;
    const targetW = Math.max(1, Math.round(window.innerWidth / cellW));
    const targetH = Math.max(1, Math.round(window.innerHeight / cellH));

    sampleCanvas.width = targetW;
    sampleCanvas.height = targetH;

    refreshLiveElements();
  }

  let scrollTimeout = null;
  function onScroll() {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        refreshLiveElements();
      }, 250);
    }
  }

  function checkThreeCanvasSafe(tc) {
    if (isThreeCanvasSafe !== null) return isThreeCanvasSafe;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    try {
      tempCtx.drawImage(tc, 0, 0, 1, 1);
      tempCtx.getImageData(0, 0, 1, 1);
      isThreeCanvasSafe = true;
      return true;
    } catch (e) {
      isThreeCanvasSafe = false;
      return false;
    }
  }

  function loop() {
    requestAnimationFrame(loop);

    // Disable pixel conversion (ASCII hover overlay) while loading screen is active
    if (!document.body.classList.contains('loaded')) {
      return;
    }

    const ctx = overlayCtx;
    const W = overlayCanvas.width;
    const H = overlayCanvas.height;
    ctx.clearRect(0, 0, W, H);

    const isLightboxActive = document.querySelector('.lightbox:target') !== null;
    if (isLightboxActive) {
      if (FluidPhysics && FluidPhysics.isReady()) {
        FluidPhysics.pointerReset();
      }
      return;
    }

    if (!FluidPhysics || !FluidPhysics.isReady()) return;

    FluidPhysics.prepareDensityReadback();

    const cellW = ASCII_CFG.fontSize * 0.72;
    const cellH = ASCII_CFG.fontSize * 0.72;
    const bounds = getFluidDrawBounds(W, H, cellW, cellH);
    if (!bounds) return;

    // Clear sampleCanvas (keeps background transparent rgba(0,0,0,0))
    sampleCtx.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);

    const scaleX = sampleCanvas.width / W;
    const scaleY = sampleCanvas.height / H;

    // Clear scratchCanvas first so it only contains the live elements
    scratchCtx.clearRect(0, 0, W, H);
    
    // Clear active image bounds cache for this frame
    activeImageRects = [];
    activeCardRects = [];

    // 2a. Draw live scrolling text
    const scrollingH1 = document.querySelector('.scrolling-text h1');
    if (scrollingH1 && scrollingH1.offsetWidth > 0) {
      const r = scrollingH1.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H) {
        const style = window.getComputedStyle(scrollingH1);
        const color = style.color;
        const fontSizeVal = parseFloat(style.fontSize);
        const yOffset = Math.max(0, (r.height - fontSizeVal) / 2);

        scratchCtx.save();
        scratchCtx.fillStyle = color;
        drawTextWithSpacing(
          scratchCtx,
          scrollingH1.textContent.replace(/\u00a0/g, ' '),
          r.left,
          r.top + yOffset,
          style,
          scrollingH1
        );
        scratchCtx.restore();
      }
    }

    // 2b. Draw live cards/buttons dynamically
    liveCards.forEach(card => {
      const el = card.element;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;

      activeCardRects.push({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom
      });

      const bgColor = card.bgColor;
      const radii = card.radii;
      const borderWidth = card.borderWidth;
      let borderColor = card.borderColor;

      // Soften border color for contact section buttons
      if (card.isContactSection && card.isButton) {
        borderColor = 'rgb(100, 100, 100)';
      }

      scratchCtx.save();
      
      // Draw background with rounded corners
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        scratchCtx.fillStyle = bgColor;
        scratchCtx.beginPath();
        if (scratchCtx.roundRect && radii) {
          scratchCtx.roundRect(r.left, r.top, r.width, r.height, radii);
        } else {
          scratchCtx.rect(r.left, r.top, r.width, r.height);
        }
        scratchCtx.fill();
      }

      // Draw border with rounded corners (skip for location badge/icon to prevent random white borders)
      if (!card.isLocationBadge && borderWidth > 0 && borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
        scratchCtx.strokeStyle = borderColor;
        scratchCtx.lineWidth = Math.max(4.5, borderWidth * 2.2);
        scratchCtx.beginPath();
        if (scratchCtx.roundRect && radii) {
          scratchCtx.roundRect(r.left, r.top, r.width, r.height, radii);
        } else {
          scratchCtx.rect(r.left, r.top, r.width, r.height);
        }
        scratchCtx.stroke();
      }

      // Special left border drawing logic (e.g. for .award-card which has border-left but borderWidth is reported as 0)
      if (borderWidth === 0 && card.borderLeftWidth > 0) {
        const borderLeftColor = card.borderLeftColor;
        if (borderLeftColor && borderLeftColor !== 'rgba(0, 0, 0, 0)' && borderLeftColor !== 'transparent') {
          scratchCtx.strokeStyle = borderLeftColor;
          scratchCtx.lineWidth = Math.max(4.5, card.borderLeftWidth * 2.2);
          scratchCtx.beginPath();
          scratchCtx.moveTo(r.left, r.top);
          scratchCtx.lineTo(r.left, r.bottom);
          scratchCtx.stroke();
        }
      }

      // Special check for the contact section card to draw a representative outline
      if (card.id === 'contact-me-section') {
        scratchCtx.strokeStyle = 'rgb(80, 80, 80)';
        scratchCtx.lineWidth = 6;
        scratchCtx.beginPath();
        if (scratchCtx.roundRect && radii) {
          scratchCtx.roundRect(r.left, r.top, r.width, r.height, radii);
        } else {
          scratchCtx.rect(r.left, r.top, r.width, r.height);
        }
        scratchCtx.stroke();
      }

      scratchCtx.restore();

      // Render child SVGs (icons inside buttons) dynamically in the mask
      card.svgs.forEach(svg => {
        const sr = svg.element.getBoundingClientRect();
        if (sr.bottom < 0 || sr.top > H || sr.right < 0 || sr.left > W) return;
        if (sr.width === 0 || sr.height === 0) return;

        const cachedImg = getButtonSvgImage(svg.element, svg.color);
        if (cachedImg) {
          scratchCtx.save();
          scratchCtx.drawImage(cachedImg, sr.left, sr.top, sr.width, sr.height);
          scratchCtx.restore();
        }
      });
    });

    // 2c. Draw live images dynamically
    liveImages.forEach(img => {
      if (img.offsetWidth === 0 && img.offsetHeight === 0) return;
      const r = img.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;
      if (!isElementVisible(img)) return;

      const isGlobe = img.id === 'revolving-globe' || (img.src && img.src.includes('revolving_globe.gif'));

      if (isGlobe) {
        // Track the globe area as an image rect so it is recognized as foreground
        activeImageRects.push({
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom
        });
        // Draw the simulated rotating globe in real-time
        drawSimulatedGlobe(scratchCtx, r.left, r.top, r.width);
      } else if (isImageSafe(img)) {
        activeImageRects.push({
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom
        });

        try {
          scratchCtx.drawImage(img, r.left, r.top, r.width, r.height);
        } catch (e) {}
      } else {
        // CORS fallback for local file:// protocol or blocked origins
        const name = getPhotoName(img.src);
        if (name && fallbackImageElements.has(name)) {
          const fallbackImg = fallbackImageElements.get(name);
          if (fallbackImg.complete && fallbackImg.naturalWidth > 0) {
            activeImageRects.push({
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom
            });
            try {
              scratchCtx.drawImage(fallbackImg, r.left, r.top, r.width, r.height);
            } catch (e) {}
          }
        }
      }
    });

    // 2d. Draw live text nodes dynamically
    const range = document.createRange();
    liveTextNodes.forEach(({ node, parent, style, isInsideContact, isH2, isTabItem, isActive }) => {
      try {
        const val = node.nodeValue;
        const trimmed = val.trim();
        if (trimmed.length === 0) return;

        if (parent.offsetWidth === 0 && parent.offsetHeight === 0) return;

        const startOffset = val.indexOf(trimmed);
        const endOffset = startOffset + trimmed.length;

        range.setStart(node, startOffset);
        range.setEnd(node, endOffset);
        const r = range.getBoundingClientRect();

        if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;
        if (r.width === 0 || r.height === 0) return;

        let color = style.color;
        
        // Soften text colors inside contact section
        if (isInsideContact) {
          if (isH2) {
            color = 'rgb(170, 170, 170)'; // Soft light grey for heading
          } else {
            color = 'rgb(130, 130, 130)'; // Soft grey for paragraph text
          }
        }
        
        const fontSizeVal = parseFloat(style.fontSize);

        const rects = range.getClientRects();
        if (rects.length > 1) {
          // Multi-line wrapped text: draw word-by-word to respect layout wrapping
          const words = val.split(/(\s+)/);
          let currentIndex = 0;

          words.forEach(word => {
            if (word.length === 0) return;
            const wordStart = currentIndex;
            const wordEnd = currentIndex + word.length;
            currentIndex = wordEnd;

            // Only draw non-whitespace words
            if (word.trim().length === 0) return;

            range.setStart(node, wordStart);
            range.setEnd(node, wordEnd);
            
            const wRects = range.getClientRects();
            if (wRects.length === 0) return;
            const wr = wRects[0];

            if (wr.bottom < 0 || wr.top > H || wr.right < 0 || wr.left > W) return;
            if (wr.width === 0 || wr.height === 0) return;

            scratchCtx.save();
            scratchCtx.fillStyle = color;
            drawTextWithSpacing(scratchCtx, word, wr.left, wr.top, style, parent);
            scratchCtx.restore();
          });
        } else {
          // Single-line text: draw all at once
          const yOffset = Math.max(0, (r.height - fontSizeVal) / 2);
          scratchCtx.save();
          scratchCtx.fillStyle = color;
          drawTextWithSpacing(scratchCtx, trimmed.replace(/\u00a0/g, ' '), r.left, r.top + yOffset, style, parent);
          scratchCtx.restore();
        }

        // Draw dotted underline for active tab item (replaces CSS ::after pseudo-element which canvas cannot read)
        if (isTabItem && isActive) {
          const pr = parent.getBoundingClientRect();
          const lineW = pr.width * 0.8;
          const lineX = pr.left + (pr.width - lineW) / 2;
          const lineY = pr.bottom - 2;

          scratchCtx.save();
          scratchCtx.strokeStyle = color; // Match active tab text color
          scratchCtx.lineWidth = 5;
          scratchCtx.beginPath();
          scratchCtx.moveTo(lineX, lineY);
          scratchCtx.lineTo(lineX + lineW, lineY);
          scratchCtx.stroke();
          scratchCtx.restore();
        }
      } catch (e) {}
    });

    // Copy the high-res live elements from scratchCanvas to the downscaled sampleCanvas
    sampleCtx.drawImage(scratchCanvas, 0, 0, sampleCanvas.width, sampleCanvas.height);

    // 3. Draw live Three.js canvas second (rendered on top of scrolling text/backgrounds)
    let threeRect = null;
    const tc = getThreeCanvas();
    if (tc && checkThreeCanvasSafe(tc)) {
      const r = tc.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H && r.right > 0 && r.left < W) {
        threeRect = {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom
        };
        try {
          sampleCtx.drawImage(
            tc,
            r.left * scaleX,
            r.top * scaleY,
            r.width * scaleX,
            r.height * scaleY
          );
        } catch (e) {
          isThreeCanvasSafe = false;
        }
      }
    }

    // Get the pixel data from sampleCanvas (which is transparent rgba(0,0,0,0) by default)
    let tcData = null;
    try {
      tcData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    } catch (e) {
      console.warn("Canvas tainted by cross-origin images. Image pixelation disabled.", e);
    }
    const tcW = sampleCanvas.width;
    const tcH = sampleCanvas.height;

    drawFluidAscii(ctx, W, H, tcData, tcW, tcH, bounds, threeRect);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [hue2rgb(h + 1 / 3) * 255, hue2rgb(h) * 255, hue2rgb(h - 1 / 3) * 255];
  }

  function fieldToAlpha(d) {
    const t = ASCII_CFG.densityThreshold;
    const k = ASCII_CFG.densityEdge;
    const start = Math.max(0, t - k);
    const end = t + k;
    if (d <= start) return 0;
    if (d >= end) return 1;
    const x = (d - start) / (end - start);
    return x * x * (3 - 2 * x);
  }

  function getFluidDrawBounds(W, H, cellW, cellH) {
    const { width: simW, height: simH } = FluidPhysics.getSimSize();
    const cut = ASCII_CFG.densityThreshold * 0.3;
    let minIx = simW, maxIx = -1, minIy = simH, maxIy = -1;

    for (let iy = 0; iy < simH; iy++) {
      for (let ix = 0; ix < simW; ix++) {
        if (FluidPhysics.gridDensity(ix, iy) < cut) continue;
        if (ix < minIx) minIx = ix;
        if (ix > maxIx) maxIx = ix;
        if (iy < minIy) minIy = iy;
        if (iy > maxIy) maxIy = iy;
      }
    }
    if (maxIx < 0) return null;

    const pad = 1;
    minIx = Math.max(0, minIx - pad);
    maxIx = Math.min(simW - 1, maxIx + pad);
    minIy = Math.max(0, minIy - pad);
    maxIy = Math.min(simH - 1, maxIy + pad);

    return {
      col0: Math.floor((minIx / simW) * (W / cellW)),
      col1: Math.ceil(((maxIx + 1) / simW) * (W / cellW)),
      row0: Math.floor((1 - (maxIy + 1) / simH) * (H / cellH)),
      row1: Math.ceil((1 - minIy / simH) * (H / cellH)),
    };
  }

  function drawFluidAscii(ctx, W, H, tcData, tcW, tcH, bounds, threeRect) {
    // Dynamic precise mapping
    const cellW = W / tcW;
    const cellH = H / tcH;

    ctx.save();

    const tabSectionEl = document.getElementById('tab-section');
    const activeTabContentEl = document.querySelector('.tab-content.active');

    const tabSectionRect = tabSectionEl ? tabSectionEl.getBoundingClientRect() : null;
    const activeTabContentRect = activeTabContentEl ? activeTabContentEl.getBoundingClientRect() : null;

    for (let col = bounds.col0; col <= bounds.col1; col++) {
      for (let row = bounds.row0; row <= bounds.row1; row++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;

        const best = fieldToAlpha(FluidPhysics.sample(cx, cy, W, H));
        if (best < 0.004) continue;

        let sectionBg = '#222222'; // Default to dark background
        
        // If cy falls within the tab section or active tab content bounds, set background to white
        if ((tabSectionRect && cy >= tabSectionRect.top && cy <= tabSectionRect.bottom) ||
            (activeTabContentRect && cy >= activeTabContentRect.top && cy <= activeTabContentRect.bottom)) {
          sectionBg = '#ffffff';
        }

        ctx.globalAlpha = best;
        ctx.fillStyle = sectionBg;
        ctx.beginPath();
        const bgRadius = Math.min(cellW, cellH) * 0.72;
        ctx.arc(cx, cy, bgRadius, 0, Math.PI * 2);
        ctx.fill();

        const tcX = Math.min(tcW - 1, Math.max(0, col));
        const tcY = Math.min(tcH - 1, Math.max(0, row));

        let dr, dg, db;
        if (sectionBg === '#222222') {
          dr = 65; dg = 65; db = 72; // Default grey-ish circles in dark section
        } else {
          dr = 220; dg = 220; db = 220; // Default light grey-ish circles in light section
        }

        // If pixel is not transparent, color sample
        if (tcData && tcX >= 0 && tcY >= 0 && tcX < tcW && tcY < tcH) {
          const idx = (tcY * tcW + tcX) * 4;
          const pa = tcData[idx + 3];
          const rVal = tcData[idx];
          const gVal = tcData[idx + 1];
          const bVal = tcData[idx + 2];
          
          let insideThreeCanvas = false;
          let insideImage = false;
          if (threeRect && cx >= threeRect.left && cx <= threeRect.right && cy >= threeRect.top && cy <= threeRect.bottom) {
            insideThreeCanvas = true;
            if (pa >= 200) {
              insideImage = true;
            }
          } else {
            for (let i = 0; i < activeImageRects.length; i++) {
              const ir = activeImageRects[i];
              if (cx >= ir.left && cx <= ir.right && cy >= ir.top && cy <= ir.bottom) {
                insideImage = true;
                break;
              }
            }
          }

          let insideCard = false;
          for (let i = 0; i < activeCardRects.length; i++) {
            const cr = activeCardRects[i];
            if (cx >= cr.left && cx <= cr.right && cy >= cr.top && cy <= cr.bottom) {
              insideCard = true;
              break;
            }
          }

          const lum = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
          let isNotBg = false;
          if (insideImage || insideCard) {
            isNotBg = true;
          } else if (insideThreeCanvas) {
            // Ignore semi-transparent shadows or transparent space on Three.js canvas
            isNotBg = false;
          } else if (sectionBg === '#222222') {
            if (lum > 40 || Math.abs(rVal - gVal) > 10 || Math.abs(gVal - bVal) > 10) isNotBg = true;
          } else {
            if (lum < 240 || Math.abs(rVal - gVal) > 10 || Math.abs(gVal - bVal) > 10) isNotBg = true;
          }

          // ONLY apply coloring and contrast calculations if we have opaque pixel data (pa >= 8) and it is not general background
          if (pa >= 8 && isNotBg) {
            const c = ASCII_CFG.contrast;
            let r = Math.min(255, Math.max(0, (rVal - 128) * c + 128));
            let g = Math.min(255, Math.max(0, (gVal - 128) * c + 128));
            let b = Math.min(255, Math.max(0, (bVal - 128) * c + 128));
            let [h, s, l] = rgbToHsl(r, g, b);
            s = Math.min(1, s * ASCII_CFG.satBoost);
            const tint = ASCII_CFG.tintStrength;
            const tHue = l < 0.5 ? 220 / 360 : 35 / 360;
            h = h + (tHue - h) * (tint * Math.abs(l - 0.5) * 2);
            [dr, dg, db] = hslToRgb(h, s, l).map(Math.round);
          }
        }

        ctx.fillStyle = `rgb(${dr},${dg},${db})`;
        ctx.beginPath();
        const radius = (Math.min(cellW, cellH) / 2) * ASCII_CFG.circleScale;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  window.addEventListener('load', waitForFluid);
})();
