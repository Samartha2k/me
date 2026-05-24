/**
 * 2D Depth Parallax — Hero Section
 * 
 * Uses Three.js to construct a plane geometry displaced along the Z-axis by a depth map texture.
 * When the pointer (mouse or touch) or device gyroscope moves, the mesh rotates in 3D, creating
 * an interactive parallax depth illusion of the subject.
 * 
 * ╔══════════════════════════════════════════╗
 * ║  TUNE THESE VALUES                       ║
 * ╠══════════════════════════════════════════╣
 * ║  depthIntensity   → Z displacement       ║
 * ║  meshDetail       → vertex grid density  ║
 * ║  cameraDistance   → camera Z position    ║
 * ║  parallaxStrength → mouse rotation amt   ║
 * ║  lerpSpeed        → mouse smoothing      ║
 * ║  offsetX          → shift left/right     ║
 * ║  offsetY          → shift up/down        ║
 * ╚══════════════════════════════════════════╝
 */
const PARALLAX = {
  depthIntensity: 30,      // Maximum distance vertices are displaced forward/backward
  meshDetail: 256,         // Density of the grid. Higher = smoother mesh but more performance intensive
  cameraDistance: 260,     // Z position of perspective camera
  parallaxStrength: 0.12,  // Rotation strength multiplier for pointer movement
  lerpSpeed: 0.055,        // Linear interpolation speed for rotation smoothing (0 = frozen, 1 = instant)
  offsetX: 12,             // Lateral offset adjustments in Three units (+ = right, - = left)
  offsetY: -7,             // Vertical offset adjustments in Three units (+ = up, - = down)
  mobileOffsetX: 0,        // Mobile X axis offset (+ = right, - = left)
  mobileOffsetY: -5,       // Mobile Y axis offset (+ = up, - = down)
};

(function () {
  // Three.js core constructs
  let scene, camera, renderer, mesh;
  // Texture and image assets
  let originalImg, depthImg, origTexture;
  // Mouse position tracking (lerped position, and destination target)
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  // DOM Containers
  let container, hero;
  // Reveal animation progress (for dynamic 3D depth emergence)
  let revealProgress = 0;

  /**
   * Initializes the Three.js WebGL canvas, lighting, camera, and hooks up event listeners.
   */
  function init() {
    container = document.getElementById('parallax-canvas-container');
    hero = document.getElementById('hero-section');
    if (!container || !hero) return;

    // Create scene
    scene = new THREE.Scene();

    // Setup perspective camera (45 degree field of view, aspect ratio updated on resize)
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.z = PARALLAX.cameraDistance;

    // WebGL Renderer with alpha transparency and antialiasing
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio to 2 for performance
    renderer.outputEncoding = THREE.sRGBEncoding; // Enforce correct color gamut rendering
    container.appendChild(renderer.domElement);

    // Add ambient white light to illuminate the portrait texture
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    // Pointer event listeners
    hero.addEventListener('mousemove', onMouseMove);
    hero.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('resize', onResize);

    // Register mobile gyroscope listeners with iOS 13+ permission protocol
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const requestGyro = () => {
        DeviceOrientationEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', onDeviceOrientation);
            }
          })
          .catch(console.error);
        
        // Remove event triggers once permission dialog is requested
        window.removeEventListener('click', requestGyro);
        window.removeEventListener('touchend', requestGyro);
      };
      window.addEventListener('click', requestGyro);
      window.addEventListener('touchend', requestGyro);
    } else {
      // Direct registration for Android/non-iOS modern mobile browsers
      window.addEventListener('deviceorientation', onDeviceOrientation);
    }

    loadImages();
  }

  /**
   * Translates mouse coordinates into normalized window bounds [-1.0, 1.0].
   */
  function onMouseMove(e) {
    const r = hero.getBoundingClientRect();
    mouse.targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouse.targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }

  /**
   * Translates mobile touch coordinates into normalized window bounds [-1.0, 1.0].
   */
  function onTouchMove(e) {
    const t = e.touches[0];
    const r = hero.getBoundingClientRect();
    mouse.targetX = ((t.clientX - r.left) / r.width - 0.5) * 2;
    mouse.targetY = ((t.clientY - r.top) / r.height - 0.5) * 2;
  }

  /**
   * Handles gyroscope device orientation updates.
   * Maps device tilt (beta/gamma axes) to camera parallax target positions.
   */
  function onDeviceOrientation(e) {
    if (e.beta === null || e.gamma === null) return;
    
    // beta represents front-to-back tilt: neutral around 60 deg (normal holding angle), active range [30, 90]
    let beta = e.beta;
    // gamma represents left-to-right tilt: neutral around 0 deg, active range [-30, 30]
    let gamma = e.gamma;
    
    // Clamp coordinates to bounds to prevent extreme camera rotation
    beta = Math.max(30, Math.min(90, beta));
    gamma = Math.max(-30, Math.min(30, gamma));
    
    // Normalize coordinates to [-1.0, 1.0] range
    // beta: 30deg -> -1.0, 60deg -> 0.0, 90deg -> 1.0
    // gamma: -30deg -> -1.0, 0deg -> 0.0, 30deg -> 1.0
    mouse.targetX = gamma / 30;
    mouse.targetY = (beta - 60) / 30;
  }

  /**
   * Asynchronously loads original texture image and depth map.
   * Rebuilds the mesh and updates the aspect ratio once assets are loaded.
   */
  function loadImages() {
    let origDone = false, depthDone = false;
    const loader = new THREE.TextureLoader();

    function tryBuild() {
      if (!origDone || !depthDone) return;
      
      // Enforce aspect ratio parity in the wrapping container
      container.style.aspectRatio = `${originalImg.width} / ${originalImg.height}`;
      requestAnimationFrame(() => {
        sizeRenderer();
        buildMesh();
        animate();
        
        container.classList.add('ready');
        window.threeReady = true;
        window.dispatchEvent(new Event('three-ready'));
      });
    }

    // Load original portrait image as texture
    loader.load('assets/portrait.png', (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      origTexture = tex;
      
      const img = new Image();
      img.onload = () => { originalImg = img; origDone = true; tryBuild(); };
      img.src = 'assets/portrait.png';
    }, undefined, (e) => console.error('assets/portrait.png failed', e));

    // Load depth map image
    loader.load('assets/depth_map.png', (_tex) => {
      const img = new Image();
      img.onload = () => { depthImg = img; depthDone = true; tryBuild(); };
      img.src = 'assets/depth_map.png';
    }, undefined, (e) => console.error('assets/depth_map.png failed', e));
  }

  /**
   * Builds the displaced 3D plane mesh.
   * Reads depth map brightness at each vertex coordinate to offset vertex position along the Z axis.
   */
  function buildMesh() {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    const aspect = originalImg.width / originalImg.height;
    const detail = PARALLAX.meshDetail;

    // Create plane matching original image dimensions
    const geo = new THREE.PlaneGeometry(200 * aspect, 200, detail, detail);

    // Draw depth map into temporary canvas to read raw color pixel values
    const tmp = document.createElement('canvas');
    tmp.width = detail + 1;
    tmp.height = detail + 1;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(depthImg, 0, 0, tmp.width, tmp.height);
    const { data } = ctx.getImageData(0, 0, tmp.width, tmp.height);

    // Mutate vertices: offset Z coordinate by depth brightness (white = close, black = far)
    const verts = geo.attributes.position.array;
    for (let i = 0; i < verts.length; i += 3) {
      const xi = (i / 3) % (detail + 1);
      const yi = Math.floor((i / 3) / (detail + 1));
      // Read Red channel brightness (0-255)
      const depth = data[(yi * (detail + 1) + xi) * 4] / 255;
      // Displace Z component
      verts[i + 2] = depth * PARALLAX.depthIntensity;
    }
    
    // Notify Three.js to re-upload modified vertex buffer
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    // Create material with standard shading properties (transparent to fade in smoothly in WebGL)
    const mat = new THREE.MeshStandardMaterial({
      map: origTexture,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.0,
    });

    const isMobile = window.innerWidth <= 750;
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = isMobile ? PARALLAX.mobileOffsetX : PARALLAX.offsetX;
    mesh.position.y = isMobile ? PARALLAX.mobileOffsetY : PARALLAX.offsetY;
    
    // Start the mesh flat and scaled down in Z space, then animate it to full size/depth in loop
    mesh.scale.set(0.9, 0.9, 0.0);
    revealProgress = 0;
    
    scene.add(mesh);
  }

  /**
   * Sizes the WebGL viewport and updates camera projection matrices when the container resizes.
   */
  function sizeRenderer() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    if (mesh) {
      const isMobile = window.innerWidth <= 750;
      mesh.position.x = isMobile ? PARALLAX.mobileOffsetX : PARALLAX.offsetX;
      mesh.position.y = isMobile ? PARALLAX.mobileOffsetY : PARALLAX.offsetY;
    }
  }

  function onResize() { sizeRenderer(); }

  /**
   * Main render loop.
   * Smoothly interpolates (lerps) rotation values towards target coordinates.
   */
  function animate() {
    requestAnimationFrame(animate);
    if (!mesh) return;
    
    // Smooth cubic ease-out reveal animation for 3D depth and scale
    if (revealProgress < 1.0) {
      revealProgress += 0.02; // Over ~50 frames (~800ms)
      if (revealProgress > 1.0) revealProgress = 1.0;
      
      const easeProgress = 1 - Math.pow(1 - revealProgress, 3); // cubic ease out
      mesh.scale.x = 0.9 + easeProgress * 0.1;
      mesh.scale.y = 0.9 + easeProgress * 0.1;
      mesh.scale.z = easeProgress;
      
      // Animate material opacity in WebGL directly (much faster than CSS filters)
      mesh.material.opacity = easeProgress;
    }

    // Linear interpolation for smooth trailing camera behavior
    mouse.x += (mouse.targetX - mouse.x) * PARALLAX.lerpSpeed;
    mouse.y += (mouse.targetY - mouse.y) * PARALLAX.lerpSpeed;

    // Rotate mesh around axes based on lerped coordinate position
    mesh.rotation.y = mouse.x * PARALLAX.parallaxStrength;
    mesh.rotation.x = -mouse.y * PARALLAX.parallaxStrength;

    // Render Scene
    renderer.render(scene, camera);
  }

  // Expose init globally so it can be deferred until the loader is ready
  window.initDepthParallax = init;
})();
