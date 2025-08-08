# [RE]Print Studios - AI & Developer Style Reference
*Quick reference for AI agents and developers implementing [RE]Print Studios design system*

---

## 🎨 **Core Design DNA**

### Visual Philosophy
- **Monochromatic bone white system** with strategic primary color usage
- **Adobe-inspired restraint** - colors support, never overpower
- **Advanced simplicity** - complex functionality through clean interfaces
- **Bracket branding** `[ ]` as signature UI element

### Brand Voice & Messaging Style
- **Direct, purposeful language**: Clear statements without fluff
- **Collaborative emphasis**: "Collaborate Collaborate Collaborate" mindset
- **Action-oriented tone**: Take action, bring ideas to life
- **[RE] prefix branding**: [RE]levance, [RE]sourcefulness, [RE]Print
- **Empowerment language**: Shining light, empowering voices, creative journeys
- **Future-forward messaging**: Push boundaries, envision possibilities

### Color Usage Rules
1. **Bone white** (`#F9F6F1`) dominates all backgrounds
2. **Primary colors** only for critical actions and states
3. **Gray scale** for all text hierarchy
4. **Accent hints** extremely subtle, background-only

---

## 📝 **Brand Voice & Content Guidelines**

### Writing Style Patterns
Based on [RE]Print Studios' 11 Design Principles:

#### **Tone Characteristics**
- **Purposeful & Direct**: "Start every project with a clear understanding"
- **Empowering**: "Shining a light on underrepresented voices"
- **Action-Oriented**: "Take action to bring our ideas to life"
- **Collaborative**: "No one has ever done it alone. Plain and simple."
- **Future-Forward**: "Push the boundaries and envision future possibilities"

#### **Content Structure**
```markdown
# Headers use [Brackets] for emphasis
## Section headers can include /directional/ indicators
- Use numbered lists for principles/steps
- Keep sentences concise and impactful
- End with strong, memorable statements
```

#### **Key Messaging Patterns**
- **[RE] Prefix Usage**: [RE]levance, [RE]sourcefulness, [RE]Print
- **Empowerment Language**: "empowering creative journeys", "bring your vision to life"
- **Collaborative Emphasis**: "we collaborate", "let's create together"
- **Simplicity Focus**: "streamlined", "efficient", "clear understanding"

#### **Content Examples**
```html
<!-- Hero messaging -->
<h1>[RE]Print Studios</h1>
<p class="hero-subtext">Empowering Creative Journeys</p>

<!-- Action-oriented buttons -->
<button>[Start a Project]</button>
<button>[Bring Ideas to Life]</button>

<!-- Feature descriptions -->
<h3>[Real-time Collaboration]</h3>
<p>Direct communication throughout your creative journey</p>

<!-- Call-to-action messaging -->
<p>Ready to illuminate your vision? Let's collaborate and create something extraordinary.</p>
```

#### **Avoid These Patterns**
❌ Overly technical jargon  
❌ Passive voice constructions  
❌ Corporate buzzwords  
❌ Lengthy explanations  
❌ Generic design language  

---

## 🎯 **Quick Implementation Guide**

### Essential CSS Variables
```css
:root {
  /* Bone White System */
  --bone: #F9F6F1;
  --bone-light: #FCFAF7;
  --bone-dark: #F2EDE6;
  
  /* Text Hierarchy */
  --text: #2C2C2C;
  --text-secondary: #4A4A4A;
  --text-muted: #8A8A8A;
  
  /* Primary Colors (Use Sparingly!) */
  --blue: #0057FF;
  --green: #27AE60;
  --yellow: #F7C600;
  --red: #E63946;
  
  /* Typography */
  --font-family: 'Montserrat', sans-serif;
}
```

### Component Templates

#### Button Pattern
```html
<!-- Primary action (rare usage) -->
<button class="btn-primary">[Action Name]</button>

<!-- Standard button -->
<button class="btn-secondary">[Action Name]</button>
```

#### Navigation Pattern
```html
<nav>
  <a href="#home">[Home]</a>
  <a href="#projects">[Projects]</a>
  <a href="#login">[Login]</a>
</nav>
```

#### Card Pattern
```html
<div class="card">
  <h3>[Feature Name]</h3>
  <p>Description text without brackets</p>
</div>
```

---

## 🔧 **Bracket System Rules**

### When to Use Brackets `[ ]`
✅ **Interactive elements**: buttons, links, navigation  
✅ **Feature labels**: section headings, service names  
✅ **Brand elements**: `[RE]Print Studios`  
✅ **Action calls**: `[Start Project]`, `[Upload File]`  

### When NOT to Use Brackets
❌ **Body text**: descriptions, paragraphs  
❌ **User-generated content**: project names, messages  
❌ **Data labels**: dates, numbers, status text  
❌ **Error messages**: validation text  

---

## 🎨 **Color Application Matrix**

| Element Type | Background | Border | Text | Hover State |
|--------------|------------|--------|------|-------------|
| **Primary Button** | `var(--blue)` | `var(--blue)` | `var(--bone-light)` | Darker blue + lift |
| **Secondary Button** | `var(--bone-light)` | `var(--border-light)` | `var(--text)` | `var(--hover)` + border |
| **Card** | `var(--bone-light)` | `var(--border-light)` | `var(--text)` | Lift + border emphasis |
| **Form Input** | `var(--bone-light)` | `var(--border)` | `var(--text)` | Blue focus ring |
| **Navigation** | `transparent` | `none` | `var(--text-secondary)` | `var(--text)` |

---

## 📐 **Layout Standards**

### Spacing Scale
```css
--space-xs: 0.25rem   /* 4px - tight spacing */
--space-sm: 0.5rem    /* 8px - compact elements */
--space-md: 1rem      /* 16px - standard gap */
--space-lg: 1.5rem    /* 24px - component padding */
--space-xl: 2rem      /* 32px - section spacing */
--space-2xl: 3rem     /* 48px - major sections */
```

### Grid Guidelines
- **Component padding**: `var(--space-lg)` default
- **Grid gaps**: `var(--space-lg)` to `var(--space-xl)`
- **Section margins**: `var(--space-2xl)` between major areas
- **Form spacing**: `var(--space-md)` between form groups

---

## 🎭 **Interaction Patterns**

### Standard Hover Effect
```css
.interactive-element {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive-element:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-medium);
  border-color: var(--text);
}
```

### Focus State
```css
.focusable:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}
```

---

## 📱 **Responsive Patterns**

### Breakpoints
```css
/* Mobile-first approach */
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  .container { padding: 2rem; }
}

@media (min-width: 1024px) {
  .container { padding: 3rem; }
}
```

---

## ⚡ **Implementation Checklist**

### For New Components
- [ ] Uses bone white background system
- [ ] Applies bracket notation to interactive elements
- [ ] Includes proper hover/focus states
- [ ] Uses Montserrat font family
- [ ] Follows spacing scale
- [ ] Includes responsive considerations
- [ ] Primary colors used sparingly

### For Pages/Sections
- [ ] Maintains monochromatic foundation
- [ ] Bracket notation in navigation
- [ ] Proper text hierarchy with gray scale
- [ ] Consistent component spacing
- [ ] Subtle animations (0.3s ease)
- [ ] Accessibility compliance

---

## 🚫 **Common Mistakes to Avoid**

1. **Color Overuse**: Using primary colors for decoration
2. **Bracket Overuse**: Adding brackets to body text
3. **Wrong White**: Using `#FFFFFF` instead of bone white
4. **Heavy Effects**: Adding drop shadows, gradients, or heavy animations
5. **Font Mixing**: Using fonts other than Montserrat
6. **Spacing Inconsistency**: Not following the spacing scale

---

## 🎯 **Brand Voice in Code**

### HTML Structure Example
```html
<header class="portal-header">
  <nav class="portal-nav">
    <h1>[RE]Print Studios</h1>
    <ul class="nav-links">
      <li><a href="/projects">[Projects]</a></li>
      <li><a href="/files">[Files]</a></li>
      <li><button class="btn-logout">[Logout]</button></li>
    </ul>
  </nav>
</header>

<main class="portal-main">
  <section class="project-overview">
    <h2>[Project Status]</h2>
    <div class="status-cards">
      <div class="card">
        <h3>Empowering your creative vision</h3>
        <p>Track progress, collaborate in real-time, and bring ideas to life through streamlined project management.</p>
        <button class="btn-primary">[View Details]</button>
      </div>
    </div>
  </section>
</main>
```

### Content Messaging Examples
```html
<!-- Landing page hero -->
<section class="hero">
  <h1>[RE]Print Studios</h1>
  <p class="tagline">Empowering Creative Journeys</p>
  <p class="description">We collaborate to illuminate underrepresented voices and bring visionary ideas to life through purposeful design.</p>
  <button class="btn-primary">[Start Your Journey]</button>
</section>

<!-- Feature sections -->
<div class="feature-grid">
  <div class="feature-card">
    <h3>[Real-time Collaboration]</h3>
    <p>Direct communication that brings teams together</p>
  </div>
  <div class="feature-card">
    <h3>[Purpose-driven Design]</h3>
    <p>Every project starts with understanding your story</p>
  </div>
  <div class="feature-card">
    <h3>[Future-focused Innovation]</h3>
    <p>Push boundaries and envision new possibilities</p>
  </div>
</div>

<!-- Call-to-action sections -->
<section class="cta">
  <h2>Ready to illuminate your vision?</h2>
  <p>Let's collaborate and create something extraordinary together.</p>
  <button class="btn-primary">[Begin Collaboration]</button>
</section>
```

---

*This reference ensures consistent implementation of [RE]Print Studios design system across all development work. When in doubt, prioritize simplicity and restraint.*
