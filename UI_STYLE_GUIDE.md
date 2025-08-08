# [RE]Print Studios UI Style Guide

## Core Principles
1. **Clean & Minimal** - No decorative elements, focus on functionality
2. **Consistent** - Same patterns across all pages and modules
3. **Professional** - Corporate aesthetic suitable for creative agencies
4. **No Emojis** - Text and icons only, no emoji characters in UI

## Typography
- **Font Family**: Montserrat (300, 400, 500, 600, 700)
- **Base Font Size**: 16px (1rem)
- **Line Height**: 1.5-1.6 for body text
- **Headings**:
  - h1: 2.5rem (40px), weight 300
  - h2: 2rem (32px), weight 400
  - h3: 1.5rem (24px), weight 500
  - h4: 1.25rem (20px), weight 500
  - h5: 1rem (16px), weight 600
  - h6: 0.875rem (14px), weight 600

## Color Palette
```css
/* Primary Colors */
--primary-blue: #0057FF;
--yellow: #F7C600;
--green-success: #27AE60;
--red-error: #E63946;

/* Neutral Colors */
--bone-white: #F9F6F1;
--charcoal: #333333;
--graphite: #666666;
--light-gray: #E5E5E5;
--border-gray: #DDDDDD;

/* Semantic Colors */
--color-success: var(--green-success);
--color-warning: var(--yellow);
--color-error: var(--red-error);
--color-info: var(--primary-blue);
```

## Spacing System
Use multiples of 4px:
- 4px (0.25rem)
- 8px (0.5rem)
- 12px (0.75rem)
- 16px (1rem)
- 24px (1.5rem)
- 32px (2rem)
- 48px (3rem)
- 64px (4rem)

## Component Standards

### Buttons
```css
.btn-primary {
  background: var(--primary-blue);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: white;
  color: var(--charcoal);
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 500;
  border: 1px solid var(--border-gray);
  cursor: pointer;
  transition: all 0.2s ease;
}

/* No icon fonts or emojis - use text only or SVG icons */
```

### Cards
```css
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid var(--border-gray);
}
```

### Forms
```css
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--charcoal);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-gray);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-blue);
}
```

### Tables
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.data-table th {
  text-align: left;
  padding: 16px;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--graphite);
  border-bottom: 2px solid var(--border-gray);
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--light-gray);
}

.data-table tr:hover {
  background: var(--bone-white);
}
```

### Navigation
```css
.admin-nav {
  background: white;
  border-bottom: 1px solid var(--border-gray);
  padding: 0;
}

.nav-link {
  display: inline-block;
  padding: 20px 24px;
  color: var(--graphite);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
}

.nav-link:hover {
  color: var(--charcoal);
  background: var(--bone-white);
}

.nav-link.active {
  color: var(--primary-blue);
  border-bottom-color: var(--primary-blue);
}
```

## Page Layout Structure

### Standard Admin Page
```html
<div class="admin-container">
  <!-- Header -->
  <header class="admin-header">
    <h1 class="page-title">[Page Title]</h1>
    <nav class="admin-nav">
      <!-- Navigation tabs -->
    </nav>
  </header>

  <!-- Main Content -->
  <main class="admin-content">
    <!-- Page Header -->
    <div class="content-header">
      <h2>Section Title</h2>
      <div class="header-actions">
        <button class="btn-primary">Primary Action</button>
      </div>
    </div>

    <!-- Filters/Search -->
    <div class="content-filters">
      <!-- Filter controls -->
    </div>

    <!-- Data/Content Area -->
    <div class="content-body">
      <!-- Tables, cards, or other content -->
    </div>
  </main>
</div>
```

## Modal Standards
```css
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.modal.active {
  display: block;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  margin: 50px auto;
  max-width: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-gray);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--graphite);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.modal-close:hover {
  background: var(--light-gray);
}
```

## Status Indicators
Use background colors and text, no emoji indicators:
```css
.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-block;
}

.status-active { 
  background: #E7F5EC; 
  color: var(--green-success); 
}

.status-pending { 
  background: #FFF4D6; 
  color: #B7791F; 
}

.status-inactive { 
  background: #F5F5F5; 
  color: var(--graphite); 
}

.status-error { 
  background: #FDEAEA; 
  color: var(--red-error); 
}
```

## Loading States
```css
.loading {
  text-align: center;
  padding: 48px;
  color: var(--graphite);
}

.spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 3px solid var(--light-gray);
  border-top-color: var(--primary-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Empty States
```css
.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--graphite);
}

.empty-state h3 {
  color: var(--charcoal);
  margin-bottom: 8px;
}

.empty-state p {
  margin-bottom: 24px;
}
```

## Responsive Design
- Desktop first approach
- Breakpoints:
  - Large: 1200px+
  - Medium: 768px - 1199px
  - Small: < 768px

## Accessibility
- All interactive elements must have visible focus states
- Maintain WCAG AA color contrast ratios
- Use semantic HTML elements
- Provide text alternatives for icons
- Ensure keyboard navigation works

## Icon Usage
- Use SVG icons or icon fonts (like Lucide)
- No emoji characters in production UI
- Icons should be 16px, 20px, or 24px
- Always pair icons with text labels for clarity

## Animation Guidelines
- Keep animations subtle and functional
- Use CSS transitions for hover/focus states
- Duration: 0.2s - 0.3s for micro-interactions
- Easing: ease or ease-in-out
- Avoid animations that could cause motion sickness

## Do's and Don'ts

### DO:
- Use consistent spacing
- Maintain visual hierarchy
- Keep interfaces clean and uncluttered
- Use proper semantic HTML
- Test on multiple screen sizes
- Use CSS variables for colors

### DON'T:
- Use emojis in UI elements
- Create one-off styles
- Use inline styles
- Mix different design patterns
- Use decorative fonts
- Add unnecessary animations