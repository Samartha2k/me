# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Style

**Important**: The developer prefers casual, direct communication. Feel free to use profanity and informal language when interacting. The developer will do the same. Keep responses straightforward and cut the bullshit - just get to the point and solve problems efficiently.

## Project Overview

This is a static portfolio website for Samarth Agrawal featuring photography and contact information. The site is built with vanilla HTML, CSS, and JavaScript with no framework dependencies.

## File Structure

```
me-main/
├── fonts/                      # Self-hosted web fonts
│   ├── BitcountSingle-Regular.woff2
│   ├── BitcountSingle-Regular.woff
│   ├── Montserrat-Light.woff2
│   ├── Montserrat-Light.woff
│   ├── Montserrat-Regular.woff2
│   ├── Montserrat-Regular.woff
│   └── README.md              # Font installation instructions
├── index.html                 # Main HTML structure
├── style.css                  # All styling and animations
├── app.js                     # Clipboard and gallery animations
├── ascii-hover.js             # ASCII portrait hover mask
├── depth-parallax.js          # Three.js hero portrait
├── damn.webp                  # Profile photograph
├── logo.png                   # Logo (PNG format)
├── logo.svg                   # Logo (SVG format)
└── CLAUDE.md                  # This file
```

## Architecture

**Single-Page Application**: A static portfolio website with four main sections:
- **Hero Section**: Scrolling text animation with profile image and glow effect
- **Photography Gallery**: Masonry-style responsive grid using CSS columns (4/3/2/1 columns based on viewport)
- **Lightbox System**: Pure CSS lightbox implementation using `:target` pseudo-class and hash-based navigation
- **Contact Section**: Interactive contact buttons with clipboard functionality

## Technical Details

### CSS (style.css)

The stylesheet is organized into logical sections:
- **Font Definitions**: Self-hosted @font-face declarations with `font-display: swap` for optimal loading
- **Reset & Base Styles**: Global box-sizing and body styles with fade-in animation
- **Hero Section**: Scrolling text and face glow effects
- **Photography Section**: Section header styling
- **Masonry Gallery**: CSS column-based layout with reveal animations using CSS custom properties
- **Lightbox**: Fixed overlay with image display and navigation
- **Contact Section**: Button grid with hover effects, tooltips, and copied message
- **Responsive Design**: Media queries at 500px, 600px, 750px, and 1100px breakpoints

**Key CSS Techniques**:
- Self-hosted web fonts with `@font-face` and `font-display: swap` for instant loading
- CSS custom properties (`--reveal-ty`, `--reveal-scale`, etc.) for animation control
- CSS `column-count` for masonry layout (no JS grid library needed)
- `:target` pseudo-class for lightbox show/hide functionality
- `will-change` property for optimized animations
- `prefers-reduced-motion` media query for accessibility

### JavaScript (app.js)

The JavaScript is organized into three main sections:
1. **Clipboard Functionality**: Handles copying phone/email to clipboard with visual feedback
2. **Gallery Animations**: IntersectionObserver-based reveal animations with staggered timing
3. **Initialization**: DOMContentLoaded event listener that bootstraps all functionality

**Key Functions**:
- `handleCopyToClipboard(button, textToCopy)`: Reusable clipboard handler
- `initPhoneButton()`: Phone number copy functionality
- `initEmailButton()`: Email copy + mailto functionality
- `initGalleryAnimations()`: IntersectionObserver setup for scroll-based reveals
- `init()`: Main initialization function

### HTML (index.html)

Clean semantic HTML structure with:
- Proper meta tags including description
- External stylesheet and script references
- Gallery images with hash-based lightbox navigation
- Contact buttons with SVG icons and tooltip/copied message elements

## Development

**Font Setup**: Before running the site, download the required fonts to the `fonts/` folder. See `fonts/README.md` for detailed instructions. The site will work without fonts but will fall back to system fonts.

**Testing Locally**: Simply open `index.html` in a web browser. No build process or local server required.

**Deployment**: Deploy all files (HTML, CSS, JS, fonts folder, and image assets) to any static hosting service. The site has no backend requirements and no external dependencies.

## Common Tasks

### Modifying Gallery Photos

To add/remove photos, edit `index.html`:
1. Add `<a>` tag with image in the `.masonry` div (around line 25)
2. Create corresponding lightbox div with navigation links (around line 50)
3. Update navigation links in adjacent lightboxes to maintain circular navigation

### Updating Contact Information

Phone and email are defined in `index.html`:
- Tooltip text in button elements (look for `.tooltip-text` spans)
- The `app.js` automatically reads from these tooltips

### Customizing Animations

Animation timing can be adjusted in `style.css`:
- Page fade-in: `fadeIn` animation (line 24)
- Hero text scroll: `scroll-left` animation (line 63)
- Gallery reveals: `--reveal-delay` property and transition timing (lines 170-178)
- Hover effects: various `transition` properties throughout

### Responsive Breakpoints

Adjust media queries in `style.css`:
- 1100px: 3-column gallery
- 750px: 2-column gallery
- 600px: Smaller contact buttons
- 500px: 1-column gallery, larger hero text

## Browser Compatibility

Requires modern browser support for:
- CSS Grid and Flexbox
- CSS Custom Properties
- IntersectionObserver API
- Clipboard API
- ES6+ JavaScript
