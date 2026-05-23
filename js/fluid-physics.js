/**
 * Spring-based Pointer Trail Simulation
 * 
 * Drives the hero ASCII hover effect via a multi-joint mass-spring-damper trail model.
 * Matches react-spring gooey blob physics equations to create a fluid, springy trailing blob cursor.
 * 
 * Optimization features:
 * 1. Decoupled from screen refresh rates using a fixed-time-step accumulator loop (1ms physics ticks).
 * 2. Simulates completely in isotropic pixel coordinates to maintain perfect aspect ratio stability.
 * 3. Rasterizes particles to a low-res density grid, applying bilinear interpolation on sampling for smooth lookups.
 */
window.FluidPhysics = (function () {
  let ready = false;
  
  // Resolution of the simulation grid
  const simW = 32;
  const simH = 24;
  
  // Float32 array storage for cell density values (0.0 to 1.0)
  let densityGrid = new Float32Array(simW * simH);

  // Physics simulation state variables
  let active = false;
  let targetX = 0;
  let targetY = 0;
  let globalIntensity = 0.0; // Fades grid active state in/out
  let lastTime = 0;
  let accumulator = 0;       // Fixed timestep accumulator
  let currentScale = 1.0;    // Pointer trail radius scale factor

  // 2-point joint trail configuration matching react-spring configs:
  // - Particle 0 (Fast): tension 1200, friction 40, mass 1.0 (tracks pointer aggressively)
  // - Particle 1 (Slow): mass 10.0, tension 200, friction 50 (follows particle 0 with heavy lag/inertia)
  // - Radii values represent fractions of screen height
  let particles = [
    { x: 0, y: 0, vx: 0, vy: 0, mass: 1.0,  tension: 1200, friction: 40, radius: 0.13 },
    { x: 0, y: 0, vx: 0, vy: 0, mass: 10.0, tension: 200,  friction: 50, radius: 0.10 }
  ];

  /**
   * Bootstraps the physics API.
   */
  function init() {
    ready = true;
  }

  function isReady() {
    return ready;
  }

  /**
   * Sets new target position coordinates for the lead particle to follow.
   * Snaps particles directly to the pointer on first entry to prevent drawing long drag lines.
   */
  function pointerMoveHero(px, py) {
    if (!ready) return;
    targetX = px;
    targetY = py;

    if (!active) {
      particles.forEach(p => {
        p.x = targetX;
        p.y = targetY;
        p.vx = 0;
        p.vy = 0;
      });
      active = true;
      lastTime = performance.now();
      accumulator = 0;
    }
  }

  /**
   * Triggers fade-out phase when pointer exits interactive bounds.
   */
  function pointerReset() {
    active = false;
  }

  /**
   * Runs fixed-timestep physics updates and rasterizes trailing particles onto the density grid.
   */
  function prepareDensityReadback() {
    if (!ready) return;

    // Smoothly fade the global trail intensity based on active state
    if (active) {
      globalIntensity += (1.0 - globalIntensity) * 0.15;
    } else {
      globalIntensity += (0.0 - globalIntensity) * 0.08;
    }

    // Clear previous density readings
    densityGrid.fill(0);

    if (globalIntensity < 0.001) {
      // Maintain lastTime so we don't have massive delta-t on reactivation
      lastTime = performance.now();
      return;
    }

    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;

    const now = performance.now();
    if (lastTime === 0) {
      lastTime = now;
    }
    let elapsed = now - lastTime;
    lastTime = now;

    // Guard against massive frame drops (tab backgrounding, window moves)
    if (elapsed > 100) elapsed = 100;

    // Scaling Logic: Shrink cursor blob by 2.0x when hovering below the hero landing page section
    let targetScale = 1.0;
    const hero = document.getElementById('hero-section');
    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      if (targetY > heroRect.bottom) {
        targetScale = 0.5; // 2x shrink factor
      }
    }
    // Interpolate scale transitions smoothly using exponent mapping
    const lerpFactor = 1.0 - Math.exp(-0.01 * elapsed);
    currentScale += (targetScale - currentScale) * lerpFactor;

    // Add elapsed time to accumulator
    accumulator += elapsed;

    const dt = 0.001; // Fixed delta-t (1ms step in seconds)
    const msPerStep = 1.0;

    // Run the spring physics equations inside a fixed-timestep loop
    while (accumulator >= msPerStep) {
      accumulator -= msPerStep;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Particle 0 follows mouse pointer, subsequent joints follow previous particle
        const tx = (i === 0) ? targetX : particles[i - 1].x;
        const ty = (i === 0) ? targetY : particles[i - 1].y;

        // Perform Hooke's Law spring force calculation: F = -k*x - c*v
        const dx = tx - p.x;
        const dy = ty - p.y;

        const fx = p.tension * dx - p.friction * p.vx;
        const fy = p.tension * dy - p.friction * p.vy;

        // Acceleration: a = F / m
        const ax = fx / p.mass;
        const ay = fy / p.mass;

        // Integrate acceleration into velocity: v = v + a * dt
        p.vx += ax * dt;
        p.vy += ay * dt;

        // Integrate velocity into position: x = x + v * dt
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Keep particles bounded inside viewport boundaries
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }
    }

    // Rasterize the gooey gooey blob particles onto the simulation density grid
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Radius in viewport pixels
      const rPixels = p.radius * h * currentScale;

      // Position in grid coordinates
      const centerGx = (p.x / w) * simW;
      const centerGy = (1.0 - (p.y / h)) * simH; // invert Y coordinate axis for raster mapping

      // Radius in grid columns/rows
      const xRadiusCells = (rPixels / w) * simW;
      const yRadiusCells = (rPixels / h) * simH;

      // Establish bounding box grid limits to avoid looping over entire grid
      const minGx = Math.max(0, Math.floor(centerGx - xRadiusCells - 1));
      const maxGx = Math.min(simW - 1, Math.ceil(centerGx + xRadiusCells + 1));
      const minGy = Math.max(0, Math.floor(centerGy - yRadiusCells - 1));
      const maxGy = Math.min(simH - 1, Math.ceil(centerGy + yRadiusCells + 1));

      // Calculate radial field intensity values inside bounding box cells
      for (let iy = minGy; iy <= maxGy; iy++) {
        const cellY = (1.0 - (iy + 0.5) / simH) * h;
        const dy = cellY - p.y;
        for (let ix = minGx; ix <= maxGx; ix++) {
          const cellX = ((ix + 0.5) / simW) * w;
          const dx = cellX - p.x;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < rPixels) {
            const idx = iy * simW + ix;
            // Cosine-inspired gooey falloff field equation: influence = (1 - d^2)^2
            const normDist = dist / rPixels;
            const influence = (1.0 - normDist * normDist) * (1.0 - normDist * normDist);
            densityGrid[idx] += influence * globalIntensity;
          }
        }
      }
    }

    // Clamp density values at a maximum threshold of 1.0
    for (let i = 0; i < densityGrid.length; i++) {
      if (densityGrid[i] > 1.0) {
        densityGrid[i] = 1.0;
      }
    }
  }

  function gridDensity(ix, iy) {
    if (ix < 0 || ix >= simW || iy < 0 || iy >= simH) return 0;
    return densityGrid[iy * simW + ix];
  }

  /**
   * Samples density values at fractional coordinates using bilinear interpolation.
   * Creates a high-fidelity continuous field representation of the underlying low-res grid.
   */
  function sample(heroX, heroY, heroW, heroH) {
    if (!heroW || !heroH) return 0;

    const cx = heroX / heroW;
    const cy = heroY / heroH;

    // Shift coordinates by half-pixel to map cell centers correctly
    const gx = cx * simW - 0.5;
    const gy = (1.0 - cy) * simH - 0.5;

    const gxF = Math.floor(gx);
    const gyF = Math.floor(gy);

    // Get fractional remainder values
    const tx = gx - gxF;
    const ty = gy - gyF;

    const getDensity = (x, y) => {
      if (x < 0 || x >= simW || y < 0 || y >= simH) return 0;
      return densityGrid[y * simW + x];
    };

    // Grab 4 adjacent cell samples
    const c00 = getDensity(gxF, gyF);
    const c10 = getDensity(gxF + 1, gyF);
    const c01 = getDensity(gxF, gyF + 1);
    const c11 = getDensity(gxF + 1, gyF + 1);

    // Interpolate top and bottom boundaries
    const top = c00 * (1.0 - tx) + c10 * tx;
    const bottom = c01 * (1.0 - tx) + c11 * tx;

    // Final vertical interpolation
    return top * (1.0 - ty) + bottom * ty;
  }

  function getSimSize() {
    return { width: simW, height: simH };
  }

  const api = {
    init,
    isReady,
    pointerMoveHero,
    pointerReset,
    sample,
    gridDensity,
    getSimSize,
    prepareDensityReadback,
  };

  // Run initialization on page load
  window.addEventListener('load', () => {
    init();
  });

  return api;
})();
