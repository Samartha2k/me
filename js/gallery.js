/**
 * Photography Gallery Dynamic Loader (Direct URL Version)
 * 
 * Reads the direct photo URLs from GALLERY_CONFIG and populates the masonry container
 * and lightboxes dynamically. Automatically optimizes Cloudinary URLs.
 */
(function () {
  const config = window.GALLERY_CONFIG;
  if (!config || !config.photos) {
    console.error("[GALLERY] Configuration not found or missing photos array.");
    return;
  }

  function optimizeImageUrl(url, width) {
    if (!url || typeof url !== 'string') return url;

    if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
      const parts = url.split('/image/upload/');
      const baseUrl = parts[0] + '/image/upload/';
      let fileSegment = parts[1];

      const firstSlashIndex = fileSegment.indexOf('/');
      if (firstSlashIndex !== -1) {
        const firstSegment = fileSegment.substring(0, firstSlashIndex);
        if (firstSegment.includes(',') || /^[a-z]_[a-z0-9]/.test(firstSegment)) {
          fileSegment = fileSegment.substring(firstSlashIndex + 1);
        }
      }
      return `${baseUrl}f_auto,q_auto,w_${width},c_scale/${fileSegment}`;
    } else if (url.includes('images.pexels.com')) {
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?auto=compress,format&cs=tinysrgb&w=${width}`;
    }
    return url;
  }

  function handleLightboxLazyLoad() {
    const hash = window.location.hash;
    if (hash) {
      const activeLightbox = document.querySelector(hash);
      if (activeLightbox && activeLightbox.classList.contains('lightbox')) {
        const img = activeLightbox.querySelector('img');
        if (img && img.dataset.src && img.src !== img.dataset.src) {
          img.src = img.dataset.src;
        }

        // Preload next image
        const nextBtn = activeLightbox.querySelector('.nav.next');
        if (nextBtn) {
          const nextHash = nextBtn.getAttribute('href');
          if (nextHash && nextHash.startsWith('#')) {
            const nextLightbox = document.querySelector(nextHash);
            if (nextLightbox) {
              const nextImg = nextLightbox.querySelector('img');
              if (nextImg && nextImg.dataset.src && nextImg.src !== nextImg.dataset.src) {
                nextImg.src = nextImg.dataset.src;
              }
            }
          }
        }

        // Preload prev image
        const prevBtn = activeLightbox.querySelector('.nav.prev');
        if (prevBtn) {
          const prevHash = prevBtn.getAttribute('href');
          if (prevHash && prevHash.startsWith('#')) {
            const prevLightbox = document.querySelector(prevHash);
            if (prevLightbox) {
              const prevImg = prevLightbox.querySelector('img');
              if (prevImg && prevImg.dataset.src && prevImg.src !== prevImg.dataset.src) {
                prevImg.src = prevImg.dataset.src;
              }
            }
          }
        }
      }
    }
  }

  // Bind hashchange and load events to trigger lazy loading
  window.addEventListener('hashchange', handleLightboxLazyLoad);
  window.addEventListener('load', handleLightboxLazyLoad);

  function renderGallery() {
    const masonry = document.querySelector('.masonry');
    if (!masonry) {
      console.warn("[GALLERY] Masonry container not found. Skipping gallery render.");
      return;
    }

    // Clear existing static placeholder elements inside the masonry grid
    masonry.innerHTML = '';

    // Remove any static lightboxes already parsed in the body
    document.querySelectorAll('.lightbox').forEach(el => el.remove());

    const photos = config.photos;

    photos.forEach((photo, index) => {
      let id = `img${index + 1}`;
      let rawThumbUrl = '';
      let rawFullUrl = '';
      let alt = `Photo ${index + 1}`;

      if (typeof photo === 'string') {
        rawThumbUrl = photo;
        rawFullUrl = photo;
      } else {
        id = photo.id || id;
        rawThumbUrl = photo.thumb || photo.url;
        rawFullUrl = photo.full || photo.url;
        alt = photo.alt || alt;
      }

      // Optimize image URLs dynamically using the helper
      const thumbUrl = optimizeImageUrl(rawThumbUrl, 500);
      const fullUrl = optimizeImageUrl(rawFullUrl, 1600);

      // 2. Build and append the masonry thumbnail grid item
      const link = document.createElement('a');
      link.href = `#${id}`;

      const img = document.createElement('img');
      img.setAttribute('crossorigin', 'anonymous');
      img.src = thumbUrl;
      img.alt = alt;
      img.loading = 'lazy';

      link.appendChild(img);
      masonry.appendChild(link);

      // 3. Compute circular navigation index references
      const prevIndex = (index - 1 + photos.length) % photos.length;
      const nextIndex = (index + 1) % photos.length;

      const getPrevId = () => {
        const prevPhoto = photos[prevIndex];
        if (typeof prevPhoto === 'string') {
          return `img${prevIndex + 1}`;
        }
        return prevPhoto.id || `img${prevIndex + 1}`;
      };

      const getNextId = () => {
        const nextPhoto = photos[nextIndex];
        if (typeof nextPhoto === 'string') {
          return `img${nextIndex + 1}`;
        }
        return nextPhoto.id || `img${nextIndex + 1}`;
      };

      const prevId = getPrevId();
      const nextId = getNextId();

      // 4. Build and append the lightbox overlay element to the body
      const lightbox = document.createElement('div');
      lightbox.id = id;
      lightbox.className = 'lightbox';

      // Load 1x1 base64 placeholder initially, store high-res in data-src
      lightbox.innerHTML = `
        <a href="#" class="close" aria-label="Close lightbox">&times;</a>
        <a href="#${prevId}" class="nav prev" aria-label="Previous image">❮</a>
        <img crossorigin="anonymous" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${fullUrl}" alt="${alt}" />
        <a href="#${nextId}" class="nav next" aria-label="Next image">❯</a>
      `;

      document.body.appendChild(lightbox);
    });

    console.log(`[GALLERY] Dynamic render complete. Loaded ${photos.length} photos.`);
    
    // Trigger lazy load check for initial URL hash
    handleLightboxLazyLoad();
  }

  // Execute the layout render as early as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderGallery);
  } else {
    renderGallery();
  }
})();
