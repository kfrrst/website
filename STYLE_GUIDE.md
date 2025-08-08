# [RE]Print Studios - Style Guide
*Advanced. Interactive. Deceptively Simple.*

---

## 🎨 **Core Philosophy**

[RE]Print Studios embodies sophisticated minimalism through monochromatic design with strategic primary color accents. The aesthetic balances advanced interactivity with visual simplicity, using the signature bracket `[ ]` notation as a key brand element.

### Design Principles
- **Monochromatic Foundation**: Bone white system as the primary palette
- **Subtle Sophistication**: Primary colors used sparingly for maximum impact
- **Bracket Branding**: Consistent use of `[ ]` brackets throughout interface
- **Advanced Simplicity**: Complex functionality presented through clean, intuitive design
- **Adobe-Inspired Restraint**: Professional color application that never overpowers

---

## 🖼️ **Color System**

### Primary Palette (Bone White System)
```css
--bone: #F9F6F1           /* Primary background - warm bone white */
--bone-light: #FCFAF7     /* Elevated elements - lighter bone */
--bone-dark: #F2EDE6      /* Subtle borders - darker bone */
--bone-subtle: #EDE8E0    /* Contrast elements - muted bone */
```

### Monochromatic Grays
```css
--text: #2C2C2C           /* Primary text - warm charcoal */
--text-secondary: #4A4A4A /* Secondary text - medium gray */
--text-tertiary: #6A6A6A  /* Tertiary text - light gray */
--text-muted: #8A8A8A     /* Muted text - very light gray */
```

### Primary Colors (Critical Actions Only)
```css
--blue: #0057FF           /* Primary action blue */
--green: #27AE60          /* Success state */
--yellow: #F7C600         /* Warning/attention */
--red: #E63946            /* Error/danger */
```

### Accent Hints (Extremely Subtle)
```css
--accent-blue: #E8F0FF    /* Subtle blue background */
--accent-green: #E8F5ED   /* Subtle green background */
--accent-yellow: #FEF9E8  /* Subtle yellow background */
--accent-red: #FEE8E8     /* Subtle red background */
```

---

## 📝 **Typography**

### Font Family
```css
font-family: 'Montserrat', sans-serif;
```

### Weight Scale
- **Light (300)**: Body text, descriptions
- **Regular (400)**: Standard interface text
- **Medium (500)**: Form labels, emphasis
- **Semibold (600)**: Subheadings, navigation
- **Bold (700)**: Headings, buttons

### Size Scale
```css
--text-xs: 0.75rem    /* 12px - Small labels */
--text-sm: 0.875rem   /* 14px - Body text */
--text-base: 1rem     /* 16px - Standard text */
--text-lg: 1.125rem   /* 18px - Large body */
--text-xl: 1.25rem    /* 20px - Small headings */
--text-2xl: 1.5rem    /* 24px - Medium headings */
--text-3xl: 2rem      /* 32px - Large headings */
--text-4xl: 2.5rem    /* 40px - Hero text */
```

---

## 🧩 **Component System**

### Buttons

#### Primary Action (Use Sparingly)
```css
.btn-primary {
  background: var(--blue);
  color: var(--bone-light);
  border: 1px solid var(--blue);
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: #0046CC;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 87, 255, 0.3);
}
```

#### Secondary/Default
```css
.btn-secondary {
  background: var(--bone-light);
  color: var(--text);
  border: 1px solid var(--border-light);
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: var(--hover);
  border-color: var(--text);
  transform: translateY(-1px);
}
```

### Cards
```css
.card {
  background: var(--bone-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px var(--shadow);
}

.card:hover {
  border-color: var(--text);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-medium);
}
```

### Form Elements
```css
.form-control {
  background: var(--bone-light);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.75rem;
  font-family: inherit;
  color: var(--text);
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
}
```

---

## 🔧 **Bracket Brand System**

### Core Usage Pattern
All interactive elements and navigation should use the bracket notation:
- `[Menu]` instead of "Menu"
- `[Start Project]` instead of "Start Project"  
- `[Client Login]` instead of "Client Login"
- `[File Sharing]` instead of "File Sharing"

### Implementation
```html
<!-- Navigation -->
<a href="#home">[Home]</a>
<a href="#about">[About]</a>
<a href="#login">[Login]</a>

<!-- Buttons -->
<button class="btn-primary">[Start a Project]</button>
<button class="btn-secondary">[Client Login]</button>

<!-- Feature Labels -->
<h3>[Real-time Chat]</h3>
<h3>[Project Tracking]</h3>
```

### Brand Name Treatment
```html
<h1>[RE]Print Studios</h1>
```
The studio name uses brackets around "RE" to emphasize the reprint/remix concept.

---

## 🎭 **Interaction Design**

### Hover States
- **Subtle elevation**: `transform: translateY(-2px)`
- **Shadow enhancement**: Progressive shadow depth
- **Color transitions**: Smooth 0.3s ease transitions
- **Border emphasis**: Border color shifts to `var(--text)`

### Animation Principles
```css
/* Standard transition */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Entrance animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Magnetic hover effect */
.magnetic-element:hover {
  transform: perspective(1000px) rotateX(var(--rotateX)) rotateY(var(--rotateY)) translateZ(10px);
}
```

---

## 📐 **Spacing System**

### Spacing Scale
```css
--space-xs: 0.25rem   /* 4px */
--space-sm: 0.5rem    /* 8px */
--space-md: 1rem      /* 16px */
--space-lg: 1.5rem    /* 24px */
--space-xl: 2rem      /* 32px */
--space-2xl: 3rem     /* 48px */
--space-3xl: 4rem     /* 64px */
```

### Layout Guidelines
- **Component padding**: Use `--space-lg` (24px) as default
- **Section margins**: Use `--space-2xl` (48px) between major sections
- **Grid gaps**: Use `--space-lg` to `--space-xl` for grid spacing
- **Form element spacing**: Use `--space-md` (16px) between form groups

---

## 🎨 **Status & State Colors**

### Status Badges
```css
.badge-success {
  background: var(--accent-green);
  color: var(--green);
  border: 1px solid var(--green);
}

.badge-warning {
  background: var(--accent-yellow);
  color: var(--yellow);
  border: 1px solid var(--yellow);
}

.badge-error {
  background: var(--accent-red);
  color: var(--red);
  border: 1px solid var(--red);
}

.badge-info {
  background: var(--accent-blue);
  color: var(--blue);
  border: 1px solid var(--blue);
}
```

### Progress Indicators
```css
.progress-bar {
  background: var(--bone-dark);
  border-radius: 2px;
  height: 4px;
  overflow: hidden;
}

.progress-fill {
  background: var(--blue);
  height: 100%;
  transition: width 0.8s ease;
}
```

---

## 📱 **Responsive Guidelines**

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) {
  .container { padding: 1rem; }
  .text-large { font-size: 1.5rem; }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .container { padding: 2rem; }
}

/* Desktop */
@media (min-width: 1025px) {
  .container { padding: 3rem; }
}
```

### Mobile Considerations
- Increase touch targets to minimum 44px
- Simplify navigation to essential bracket elements
- Maintain bone white background consistency
- Ensure primary color elements remain visible and accessible

---

## ♿ **Accessibility Standards**

### Focus States
```css
*:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

/* High contrast support */
@media (prefers-contrast: high) {
  :root {
    --border: #999999;
    --text-muted: #666666;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast Requirements
- **Text on bone backgrounds**: Minimum AA contrast (4.5:1)
- **Primary actions**: AAA contrast when possible
- **Secondary text**: Minimum AA contrast (3:1)

---

## 🎯 **Implementation Guidelines**

### Do's
✅ Use brackets for all interactive elements  
✅ Keep primary colors for critical actions only  
✅ Maintain bone white as the dominant background  
✅ Apply subtle hover states consistently  
✅ Use Montserrat font family throughout  
✅ Implement smooth transitions (0.3s ease)  

### Don'ts
❌ Overuse primary colors  
❌ Use flat white instead of bone white  
❌ Skip bracket notation for interface elements  
❌ Apply heavy shadows or effects  
❌ Use multiple font families  
❌ Create jarring color transitions  

---

## 🔄 **Future Considerations**

### Scalability
- Color system supports new accent hints for additional services
- Component system allows for new bracket-based elements
- Typography scale accommodates various content types
- Responsive system scales to new device types

### Brand Evolution
- Bracket system can expand to include new notation patterns
- Bone white system may include seasonal subtle variations
- Primary colors may be adjusted based on accessibility needs
- Animation system can become more sophisticated while maintaining simplicity

---

*This style guide serves as the definitive reference for all [RE]Print Studios digital interfaces. It ensures consistency across the platform while maintaining the sophisticated, monochromatic aesthetic that defines the brand.*
