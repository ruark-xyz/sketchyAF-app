# SketchyAF Marketing Website Build Plan

This document outlines the implementation approach for the SketchyAF mobile game marketing website, based on the provided PRD.

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Animations**: Framer Motion
- **Routing**: React Router
- **Forms**: React Hook Form with validation
- **Build Tool**: Vite

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── layout/        # Layout components (Navbar, Footer)
│   ├── ui/            # UI components (Buttons, Forms, etc.)
│   └── sections/      # Page sections components
├── pages/             # Page components
├── hooks/             # Custom hooks
├── styles/            # Global styles and Tailwind extensions
├── utils/             # Utility functions
├── types/             # TypeScript types and interfaces
├── data/              # Mock data for development
└── assets/            # Static assets
```

## Implementation Plan by Milestone

### Milestone 1: Foundation & Basic Structure

#### Tasks:

1. **Project Setup**:
   - Initialize project with Vite + React + TypeScript
   - Configure Tailwind CSS
   - Set up React Router for navigation
   - Implement basic folder structure

2. **Layout Components**:
   - Create responsive Navbar component:
     - Logo (placeholder)
     - Mobile-friendly navigation menu
     - Dynamic state management for mobile/desktop views
   - Create Footer component with:
     - Quick links to all pages
     - Social media placeholders
     - Copyright information

3. **Hackathon Voting Banner**:
   - Implement fixed-top global banner
   - Add dismissible functionality with local storage persistence
   - Style with attention-grabbing colors

4. **Page Structure**:
   - Set up route configuration for all required pages
   - Implement layout wrapper for consistent page structure
   - Create basic empty pages with proper routing

#### Time Estimate: 1-2 days

---

### Milestone 2: Homepage & CTAs

#### Tasks:

1. **Hero Section**:
   - Implement bold headline/tagline with Framer Motion fade-up animation
   - Create eye-catching CTA buttons ("Join a Game", "View Leaderboard")
   - Add responsive background/imagery
   - Implement scroll indicator

2. **Email Signup Component**:
   - Create form with email validation using React Hook Form
   - Implement success/error state management
   - Add Framer Motion animations for form submission feedback
   - Store emails in local storage for development purposes

3. **Gameplay Highlights Section**:
   - Create feature cards with icons and descriptions
   - Implement staggered animations using Framer Motion
   - Ensure responsive behavior on all device sizes
   - Add visual separators between features

4. **Social Proof Section**:
   - Implement testimonial carousel/grid (with placeholder content)
   - Add user avatars and ratings
   - Style with appropriate spacing and typography

#### Time Estimate: 2-3 days

---

### Milestone 3: Premium Features Page

#### Tasks:

1. **Premium Intro Section**:
   - Create engaging hero section specific to premium benefits
   - Implement animations for key selling points
   - Design visual hierarchy that emphasizes value proposition

2. **Subscription Section**:
   - Implement pricing component with:
     - Clear pricing information
     - Feature bullets with icons
     - CTA button "Become Premium AF"
   - Add hover states and animations
   - Ensure responsive layout

3. **Booster Packs Grid**:
   - Create responsive grid for booster packs
   - Implement filtering/sorting functionality (if needed)
   - Design pack cards with:
     - Name, pricing (Free/$XX/Premium)
     - Visual indicator for pack type
     - Hover states and animations

4. **Pack Preview Modal**:
   - Create modal component with:
     - Grid view for pack contents
     - Close button and keyboard navigation
     - Animation for opening/closing
   - Implement focus management for accessibility

#### Time Estimate: 2-3 days

---

### Milestone 4: Leaderboard Placeholder Page

#### Tasks:

1. **Leaderboard Table/Grid Component**:
   - Create responsive table/grid with:
     - Rank column
     - Username column
     - Score column
     - Placeholder data (mock JSON)
   - Implement sorting functionality
   - Add pagination or infinite scroll (if needed)

2. **Leaderboard Header**:
   - Create title and description section
   - Add filtering options (if needed)
   - Implement time period selector (weekly/monthly/all-time)

3. **Call-to-Action Section**:
   - Create eye-catching CTA to encourage game participation
   - Implement animation to draw attention

#### Time Estimate: 1-2 days

---

### Milestone 5: Legal & Privacy Pages

#### Tasks:

1. **Privacy Policy Page**:
   - Implement clean, readable layout for policy content
   - Create sections with proper headings
   - Add table of contents with jump links (if needed)
   - Implement last updated timestamp

2. **Terms of Service Page**:
   - Similar layout to privacy policy
   - Implement proper typography for legal content
   - Ensure responsive behavior

#### Time Estimate: 1 day

---

### Milestone 6: Responsiveness & QA

#### Tasks:

1. **Responsive Testing**:
   - Test all pages at key breakpoints:
     - 375px (small mobile)
     - 414px (mobile)
     - 768px (tablet)
     - 1024px (small desktop)
     - 1440px (desktop)
   - Fix any responsive issues
   - Implement device-specific optimizations

2. **Animation QA**:
   - Ensure animations are consistent across pages
   - Check for animation performance issues
   - Implement reduced motion preferences for accessibility

3. **Cross-browser Testing**:
   - Test in Chrome, Safari, and Firefox
   - Fix any browser-specific issues
   - Document any known limitations

4. **Accessibility Testing**:
   - Check color contrast
   - Ensure proper semantic HTML
   - Test keyboard navigation
   - Verify screen reader compatibility

#### Time Estimate: 1-2 days

---

## Implementation Timeline

The complete project implementation is estimated to take approximately 8-12 days of development time. This timeline assumes:

- One developer working full-time
- No major scope changes
- Availability of all required assets
- No significant technical blockers

## Next Steps

1. Confirm build plan and timeline
2. Set up project repository and initial structure
3. Begin implementation of Milestone 1
4. Establish regular review points for feedback

## Technical Considerations

- **SEO**: Implement proper meta tags and semantic HTML
- **Performance**: Optimize assets and code splitting for fast load times
- **Animations**: Use will-change and hardware acceleration for smooth animations
- **Accessibility**: Follow WCAG guidelines for accessible design