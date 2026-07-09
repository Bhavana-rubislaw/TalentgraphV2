# TalentGraph Dashboard Design System
**Version 2.0 - Modern SaaS UI**

---

## 🎨 Color Palette

### Primary Colors
```css
Primary      : #4F46E5 (Indigo-600)
Primary Hover: #4338CA (Indigo-700)
Primary Light: #EEF2FF (Indigo-50)
```

### Background Colors
```css
Background Primary  : #F7F8FA (Light Gray Background)
Background Secondary: #FFFFFF (White for cards/panels)
Background Tertiary : #F3F4F6 (Gray-100)
```

### Text Colors
```css
Text Primary  : #1F2937 (Gray-800 - Headings, important text)
Text Secondary: #6B7280 (Gray-500 - Body text)
Text Tertiary : #9CA3AF (Gray-400 - Placeholder, helper text)
```

### Border Colors
```css
Border Light : #E5E7EB (Gray-200)
Border Medium: #D1D5DB (Gray-300)
```

### Status Colors
```css
Success: #10B981 (Green-500)
Warning: #F59E0B (Amber-500)
Danger : #EF4444 (Red-500)
Info   : #3B82F6 (Blue-500)
```

---

## 📏 Spacing System (8px Grid)

```css
Spacing 1: 8px   (--spacing-1)
Spacing 2: 16px  (--spacing-2)
Spacing 3: 24px  (--spacing-3)
Spacing 4: 32px  (--spacing-4)
Spacing 5: 40px  (--spacing-5)
Spacing 6: 48px  (--spacing-6)
```

**Usage Guidelines:**
- Use `--spacing-2` (16px) for padding inside small elements (buttons, inputs)
- Use `--spacing-3` (24px) for padding inside cards
- Use `--spacing-4` (32px) for section spacing
- Use `--spacing-6` (48px) for large empty states

---

## 🔤 Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

### Font Sizes & Hierarchy

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Page Title (H1) | 28-32px | 700 (Bold) | 1.2 |
| Card Title (H2) | 20-24px | 700 (Bold) | 1.3 |
| Section Header (H3) | 16-18px | 600 (Semi-bold) | 1.4 |
| Body Text | 14-16px | 400 (Regular) | 1.6 |
| Small Text | 12-14px | 400 (Regular) | 1.5 |
| Button Text | 14-15px | 500 (Medium) | 1.4 |

### Examples
```css
/* Page Title */
.page-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

/* Body Text */
.body-text {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Small Helper Text */
.helper-text {
  font-size: 13px;
  color: var(--text-tertiary);
}
```

---

## 🔘 Border Radius

```css
Small  (--radius-sm) : 8px   (Small buttons, inputs)
Medium (--radius-md) : 12px  (Cards, larger buttons)
Large  (--radius-lg) : 16px  (Panels, sections)
X-Large (--radius-xl): 20px  (Badges, pills)
```

---

## 🌑 Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Default card shadow */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Elevated elements (dropdowns) */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

/* Modals, dialogs */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

**Usage Guidelines:**
- `shadow-sm` → Default state for flat cards
- `shadow-md` → Hover state for cards, default for dropdowns
- `shadow-lg` → Profile menus, tooltips
- `shadow-xl` → Modals, overlays

---

## ⏱️ Transitions

```css
Fast (--transition-fast): 150ms cubic-bezier(0.4, 0, 0.2, 1)
Base (--transition-base): 200ms cubic-bezier(0.4, 0, 0.2, 1)
Slow (--transition-slow): 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

**Usage:**
- `fast` → Hover states, color changes
- `base` → Button clicks, card transforms
- `slow` → Sidebar collapse, panel transitions

---

## 🖲️ Interactive Components

### Buttons

#### Primary Button
```css
.btn.btn-primary {
  background: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all var(--transition-base);
}

.btn.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

#### Secondary Button
```css
.btn.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
  padding: 12px 24px;
  border-radius: var(--radius-md);
}
```

#### Button Sizes
- **Small**: `padding: 8px 16px; font-size: 13px;`
- **Default**: `padding: 12px 24px; font-size: 15px;`
- **Large**: `padding: 14px 28px; font-size: 16px;`

All buttons have `height: 40-44px` for consistency.

### Cards

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.card:hover {
  border-color: var(--border-medium);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}
```

### Form Inputs

```css
.form-input {
  height: 44px;
  padding: 12px 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: 15px;
  transition: all var(--transition-base);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}
```

---

## 📱 Responsive Breakpoints

```css
/* Desktop (default) */
@media (min-width: 1024px) {
  /* Sidebar visible, full layout */
}

/* Tablet */
@media (max-width: 1024px) {
  /* Collapsed sidebar with icons only */
}

/* Mobile */
@media (max-width: 768px) {
  /* Bottom navigation bar */
  /* Stacked layouts */
}

/* Small Mobile */
@media (max-width: 480px) {
  /* Single column layouts */
  /* Larger touch targets */
}
```

---

## 🎭 Layout Structure

### Dashboard Layout

```
┌─────────────────────────────────────────┐
│         Top Navigation Bar              │
│  Logo | Page Title | Avatar Dropdown   │
├────────┬────────────────────────────────┤
│        │                                │
│ Side   │    Main Content Area           │
│ bar    │                                │
│ Nav    │  ┌──────────────────────┐      │
│        │  │   Welcome Card       │      │
│ ├──────┤  └──────────────────────┘      │
│ │ Btn  │  ┌──────────────────────┐      │
│ ├──────┤  │   Content Panel      │      │
│ │ Btn  │  │   (Job Cards)        │      │
│ └──────┘  └──────────────────────┘      │
└────────┴────────────────────────────────┘
```

### Component Spacing

```
Card Outer Margin: 24-32px
Card Inner Padding: 24px
Section Spacing: 32px
Element Gap: 16px
```

---

## ✨ Micro-interactions

### Hover Effects

```css
/* Button Hover */
button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Card Hover */
.card:hover {
  transform: translateY(-4px);
  border-color: var(--border-medium);
}

/* Navigation Item Hover */
.nav-item:hover {
  background: var(--bg-tertiary);
}
```

### Active States

```css
/* Active Navigation */
.nav-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 4px;
  height: 24px;
  background: var(--primary-color);
}
```

### Loading States

```css
/* Spinner */
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## 📦 Component Library

### Empty State

```tsx
<div className="empty-state-modern">
  <div className="empty-icon">📋</div>
  <h3 className="empty-title">No items yet</h3>
  <p className="empty-subtitle">Get started by creating your first item.</p>
  <button className="btn btn-primary">Create Item</button>
</div>
```

### Welcome Card

```tsx
<div className="welcome-card">
  <h2 className="welcome-title">Welcome back, {name}! 👋</h2>
  <p className="welcome-subtitle">Here's your overview</p>
  <div className="quick-stats">
    {/* Stat items */}
  </div>
</div>
```

### Job Card

```tsx
<div className="job-card">
  <div className="job-header">
    <h3>Job Title</h3>
    <span className="match-badge">95% Match</span>
  </div>
  <div className="job-details">
    <p><strong>Location:</strong> Remote</p>
    <p><strong>Salary:</strong> $100k - $150k</p>
  </div>
  <div className="job-actions">
    <button className="btn btn-secondary">Pass</button>
    <button className="btn btn-primary">Apply</button>
  </div>
</div>
```

---

## ♿ Accessibility

- All interactive elements have `:focus` states with visible outlines
- Color contrast ratio >= 4.5:1 for all text
- Touch targets >= 44x44px on mobile
- Semantic HTML (nav, main, aside, section)
- ARIA labels where needed

---

## 📝 Best Practices

1. **Consistency**: Always use CSS variables, never hard-code colors
2. **Spacing**: Stick to the 8px grid system
3. **Typography**: Maintain clear hierarchy with font sizes and weights
4. **Shadows**: Use sparingly, increase on interaction
5. **Animations**: Keep under 300ms, use easing functions
6. **Responsive**: Mobile-first approach, test all breakpoints
7. **Performance**: Minimize DOM depth, avoid unnecessary re-renders

---

## 🎯 Key Metrics

- **Page Load**: < 2s
- **Animation**: 60fps
- **Lighthouse Score**: > 90
- **Mobile Usability**: 100%

---

## 📚 Resources

- **Font**: [Inter](https://fonts.google.com/specimen/Inter)
- **Icons**: Unicode Emoji (for MVP), consider Lucide/Heroicons for production
- **Inspiration**: Linear, Notion, Stripe Dashboard

---

**Last Updated**: February 2026  
**Design Version**: 2.0  
**Maintained by**: TalentGraph Team
