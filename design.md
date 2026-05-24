# Portfolio Design System & Styling Guide

This document outlines the design philosophy and styling guidelines for the portfolio website's content pages, specifically the **Monochrome & "Circly" (highly rounded) Light Theme**.

---

## 🎨 Core Design Principles

### 1. Monochrome Palette
All page components leverage a clean, stark black-and-white visual identity matching the center tabs of the landing page.
- **Backgrounds**: Pure white (`#ffffff`) for body/page backgrounds, soft light gray (`#f9f9f9` or `#f6f6f6`) for card containers, and light gray (`#f1f1f1`) for headers.
- **Text**: Deep gray/black (`#111111` / `#222222`) for maximum readability, and medium gray (`#555555` / `#777777`) for secondary text/muted metadata.
- **Accents**: Pure black (`#000000` / `#222222`) for solid primary tags, buttons, and visual focus elements. Colors (red, green, blue) are stripped out in favor of grayscale boundaries, except for very subtle, high-opacity border highlights on warning/solved boxes if needed.

### 2. "Circly" (Highly Rounded) Geometry
Interfaces feel friendly, modern, and cohesive by using circular and highly rounded border radii:
- **Card Containers**: `24px` border-radius (e.g., `.section-card`, `.system-card`).
- **Showcase Images / Large Figures**: `20px` border-radius.
- **Alert / Highlight Boxes**: `16px` border-radius.
- **Icons & Avatars**: `50%` border-radius (completely circular).
- **Pills, Badges & Buttons**: `50px` border-radius (fully rounded capsules for `.tech-tag`, `.service-badge`, `.system-tag`, and `.back-link`).

### 3. Clean Typography
- **Display / Headers**: `'Bitcount Single'` (paired with `'Courier New'`, monospace fallbacks) for large titles, years, and section headers.
- **Body / Content**: `'Montserrat'` (paired with `Arial`, sans-serif fallbacks) for paragraphs, bulleted lists, metadata tags, and navigation links.

---

## 📁 Directory Structure & File Association

To add a new project case study page:
1. Create a root-level HTML file (`[project-name].html`).
2. Include the shared styles:
   - `css/variables.css` (loads font files and base variables).
   - `css/project-detail.css` (implements the monochrome & circly light theme).
3. Place page-specific image assets in `assets/photos/`.

---

## 💻 CSS Snippets

### Standard Card Panel
```css
.card {
  background: #f9f9f9;
  border: 1px solid #e5e5e5;
  border-radius: 24px;
  padding: 35px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.015);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.04);
}
```

### Pill Tag / Badge
```css
.pill-tag {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 50px;
  background: #222222;
  color: #ffffff;
  font-size: 0.8rem;
  transition: background-color 0.2s ease;
}
.pill-tag:hover {
  background-color: #444444;
}
```
