# Samarth Agrawal — Interactive Portfolio Website

An interactive, immersive static portfolio website featuring portfolio photography, science projects, and national awards. Built with vanilla HTML5, CSS3, and JavaScript, showcasing advanced real-time physics, high-performance canvas rendering, 3D WebGL meshes, and hardware sensor integration.

---

## 🚀 Key Features

### 1. 3D Body Depth Parallax (Three.js WebGL)
- **Visuals**: A high-resolution photo (`portrait.png`) mapped onto a detailed 3D grid and displaced in real-time along the Z-axis by a custom grayscale depth map (`depth_map.png`).
- **Interactions**: Subtle, smooth camera tracking driven by linear interpolation (lerping) that responds to mouse hover and touch drag.
- **Mobile Gyroscope Controls**: Calibrated device orientation tracker mapping mobile device tilt (`beta` and `gamma` axes) directly to camera rotation target coordinates, with an interaction-locked iOS 13+ permission protocol.

### 2. Spring-Physics Gooey Trail (`FluidPhysics`)
- **Physics**: Implements a double-mass-spring-damper joint model matching standard `react-spring` kinetics.
  - **Lead Particle (Fast)**: Tension: 1200, Friction: 40, Mass: 1.0 (tracks pointer aggressively).
  - **Trailing Joint (Slow)**: Mass: 10.0, Tension: 200, Friction: 50 (follows lead with high inertia).
- **Smooth Boundaries**: Fixed 1ms timestep physics loops run independently of the screen refresh rate.
- **Dynamic Sizing**: Smoothly scales pointer radius by **2.0x smaller** when moving past the landing hero boundary into content panels.

### 3. Dynamic ASCII Pixelation Mask (`AsciiHover`)
- **Graphics Pipeline**: Captures layout positions of DOM elements (fonts, borders, button grids, SVG paths, WebGL canvas) and downsamples coordinates onto a canvas rendering target.
- **Color Gradients**: Re-calculates and boosts color channels using custom saturation multipliers and HSL tint shifts.
- **CORS Bypass**: Self-contains base64 fallback images inside `js/fallback-images.js` to enable smooth offline testing and bypass local `file://` cross-origin security blocks.

### 4. UI/UX Refinements
- **Masonry Grid**: Pure CSS column-count responsive image masonry that adapts layout sizing to any viewport.
- **Lazy Reveals**: Staggered, scroll-triggered sliding transitions using the `IntersectionObserver` API.
- **CSS Lightbox**: Pure CSS image zoom/lightbox overlay triggered via `:target` hashes, with custom JS intercepts to clear window location hashes without resetting scroll depths.
- **Clipboard copying**: Quick copying of phone/email values to the clipboard with tooltip feedback.

---

## 📁 Project Directory Structure

```
me-main/
├── css/
│   └── style.css            # Layout grids, lightboxes, animations, responsive breakpoints
├── fonts/
│   ├── BitcountSingle-Regular.woff2  # Self-hosted monospace typography for scrolling titles
│   ├── Montserrat-Light.woff2         # Self-hosted light sans-serif body font
│   └── Montserrat-Regular.woff2       # Self-hosted regular sans-serif body font
├── js/
│   ├── app.js               # Clipboard, tab switcher, IntersectionObserver reveals
│   ├── ascii-hover.js       # Downsampled canvas rasterizer and HSL color matrix sampler
│   ├── depth-parallax.js    # Three.js camera controller and WebGL vertex displacer
│   ├── fallback-images.js   # Isolated base64 image data strings for offline CORS bypass
│   └── fluid-physics.js     # Mass-spring-damper math and simulation density grid
├── depth_map.png            # Portrait Z-axis height map (white = close, black = far)
├── portrait.png             # Main portrait high-res texture
├── logo.png                 # Logo (PNG format)
├── logo.svg                 # Logo (vector format)
├── index.html               # Semantic HTML layout and DOM structure
└── README.md                # Project documentation
```

---

## 💻 Local Setup & Hosting Guidelines

1. **Local Server (Recommended)**:
   Since Three.js textures and pixel sampling query cross-origin buffers, it is recommended to run the project using a local dev server to prevent CORS security errors:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node (http-server)
   npx http-server -p 8000
   ```
   Open `http://localhost:8000` in your web browser.

2. **Offline Mode (file://)**:
   If loading directly via `file:///path/to/index.html` in a web browser:
   - Three.js will block image loads due to strict local origin policies.
   - The canvas pixel sampler will seamlessly fall back to local base64 strings defined in `js/fallback-images.js` to preserve the ASCII gooey masking effect.

---

## 📝 Developer Guidelines

- **Style URL Resolution**: Remember that asset references inside `@font-face` blocks are relative to `css/style.css` (e.g. `../fonts/`).
- **JavaScript Resource Paths**: Native file requests inside JavaScript load relative to the main HTML document root (e.g. `portrait.png`).
- **Physics Constant Tweaks**: Customize the tension/friction values of the physics engine at the top of `js/fluid-physics.js` or camera parameters at the top of `js/depth-parallax.js`.
