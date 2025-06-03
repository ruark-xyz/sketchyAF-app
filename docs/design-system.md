# SketchyAF Design System

This document outlines the design system for the SketchyAF marketing website, providing guidelines for consistent implementation across all pages and components.

## Color System

### Primary Colors

| Name            | Hex Code  | Usage                                     |
|-----------------|-----------|-------------------------------------------|
| Primary         | `#FF3366` | Main brand color, primary CTAs            |
| Secondary       | `#33CCFF` | Secondary elements, highlights            |
| Accent          | `#FFCC00` | Accent elements, special callouts         |

### Neutral Colors

| Name            | Hex Code  | Usage                                     |
|-----------------|-----------|-------------------------------------------|
| Black           | `#121212` | Text, icons                               |
| Dark Gray       | `#333333` | Headings, important text                  |
| Medium Gray     | `#666666` | Body text                                 |
| Light Gray      | `#CCCCCC` | Disabled elements, borders                |
| Off-White       | `#F8F8F8` | Backgrounds, cards                        |
| White           | `#FFFFFF` | Backgrounds, text on dark backgrounds     |

### Semantic Colors

| Name            | Hex Code  | Usage                                     |
|-----------------|-----------|-------------------------------------------|
| Success         | `#22C55E` | Success messages, positive feedback       |
| Warning         | `#F59E0B` | Warning messages, important notices       |
| Error           | `#EF4444` | Error messages, destructive actions       |
| Info            | `#3B82F6` | Information messages                      |

## Typography

### Fonts

- **Headings**: 'Montserrat', sans-serif (Bold, 700)
- **Body**: 'Poppins', sans-serif (Regular, 400; Medium, 500)
- **Accents/CTAs**: 'Montserrat', sans-serif (SemiBold, 600)

### Type Scale

| Element         | Size (mobile) | Size (desktop) | Weight | Line Height |
|-----------------|---------------|----------------|--------|-------------|
| h1              | 2rem (32px)   | 3.5rem (56px)  | 700    | 1.2         |
| h2              | 1.75rem (28px)| 2.5rem (40px)  | 700    | 1.2         |
| h3              | 1.5rem (24px) | 2rem (32px)    | 700    | 1.3         |
| h4              | 1.25rem (20px)| 1.5rem (24px)  | 600    | 1.3         |
| Body (large)    | 1.125rem (18px)| 1.25rem (20px)| 400    | 1.5         |
| Body            | 1rem (16px)   | 1.125rem (18px)| 400    | 1.5         |
| Body (small)    | 0.875rem (14px)| 1rem (16px)   | 400    | 1.5         |
| Caption         | 0.75rem (12px)| 0.875rem (14px)| 500    | 1.5         |

## Spacing System

Based on an 8px grid system:

| Size            | Value        | Usage                                  |
|-----------------|--------------|----------------------------------------|
| xs              | 4px          | Minimal spacing, tight elements        |
| sm              | 8px          | Default spacing between related items  |
| md              | 16px         | Standard spacing                       |
| lg              | 24px         | Section spacing                        |
| xl              | 32px         | Large section spacing                  |
| 2xl             | 48px         | Page section spacing                   |
| 3xl             | 64px         | Major section divisions                |
| 4xl             | 96px         | Hero section padding                   |

## Border Radius

| Name            | Value        | Usage                                  |
|-----------------|--------------|----------------------------------------|
| none            | 0px          | Square elements                        |
| sm              | 4px          | Subtle rounding                        |
| md              | 8px          | Buttons, cards                         |
| lg              | 16px         | Featured elements                      |
| full            | 9999px       | Circular elements, pills               |

## Shadows

| Name            | Value                                     | Usage                |
|-----------------|-------------------------------------------|----------------------|
| sm              | `0 1px 2px 0 rgba(0, 0, 0, 0.05)`        | Subtle elevation     |
| md              | `0 4px 6px -1px rgba(0, 0, 0, 0.1)`      | Cards, dropdowns     |
| lg              | `0 10px 15px -3px rgba(0, 0, 0, 0.1)`    | Modals, popovers     |
| xl              | `0 20px 25px -5px rgba(0, 0, 0, 0.1)`    | Feature highlights   |
| inner           | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)`  | Pressed buttons      |

## Buttons

### Primary Button

- Background: Primary color
- Text: White
- Hover: Darken by 10%
- Active: Darken by 15%
- Disabled: 50% opacity
- Padding: 12px 24px
- Border Radius: md (8px)
- Font: Montserrat SemiBold
- Text Size: Body

### Secondary Button

- Background: Transparent
- Border: 2px solid Primary color
- Text: Primary color
- Hover: Light primary color background (10% opacity)
- Active: Light primary color background (20% opacity)
- Padding: 12px 24px
- Border Radius: md (8px)
- Font: Montserrat SemiBold
- Text Size: Body

### Tertiary Button / Link

- Background: Transparent
- Text: Primary color
- Hover: Underline
- Padding: 8px 16px
- Font: Montserrat Medium
- Text Size: Body

## Cards

### Standard Card

- Background: White
- Border: 1px solid Light Gray
- Border Radius: md (8px)
- Shadow: md
- Padding: lg (24px)

### Feature Card

- Background: White
- Border: none
- Border Radius: lg (16px)
- Shadow: lg
- Padding: xl (32px)
- Hover: Scale 1.02, shadow xl

### Pricing Card

- Background: White
- Border: 2px solid Light Gray
- Border Radius: lg (16px)
- Shadow: lg
- Padding: xl (32px)
- Hover: Border color Primary, shadow xl

## Animations

### Timing Functions

- Default: `cubic-bezier(0.4, 0, 0.2, 1)` (ease)
- Entrance: `cubic-bezier(0, 0, 0.2, 1)` (ease-out)
- Exit: `cubic-bezier(0.4, 0, 1, 1)` (ease-in)
- Sharp: `cubic-bezier(0.4, 0, 0.6, 1)` (ease-in-out)

### Duration

- Fast: 150ms
- Normal: 300ms
- Slow: 500ms
- Very Slow: 1000ms

### Common Animations

1. **Fade In**:
   ```jsx
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.3 }}
   />
   ```

2. **Slide Up**:
   ```jsx
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.5 }}
   />
   ```

3. **Staggered Children**:
   ```jsx
   <motion.div
     variants={{
       hidden: { opacity: 0 },
       visible: { 
         opacity: 1,
         transition: { staggerChildren: 0.1 }
       }
     }}
     initial="hidden"
     animate="visible"
   >
     {children.map((child, index) => (
       <motion.div
         key={index}
         variants={{
           hidden: { opacity: 0, y: 20 },
           visible: { opacity: 1, y: 0 }
         }}
       >
         {child}
       </motion.div>
     ))}
   </motion.div>
   ```

4. **Hover Scale**:
   ```jsx
   <motion.div
     whileHover={{ scale: 1.05 }}
     transition={{ type: "spring", stiffness: 300 }}
   />
   ```

## Responsive Breakpoints

| Name            | Width         | Description                           |
|-----------------|---------------|---------------------------------------|
| xs              | 375px         | Small mobile devices                  |
| sm              | 414px         | Mobile devices                        |
| md              | 768px         | Tablets                               |
| lg              | 1024px        | Small desktops, large tablets         |
| xl              | 1440px        | Desktops                              |

## Layout Grids

- **Mobile**: 1-column grid with 16px margins
- **Tablet**: 8-column grid with 24px margins and 16px gutters
- **Desktop**: 12-column grid with 64px margins and 24px gutters

## Icons

- Use Lucide React icons
- Size: 24px (default), 20px (small), 32px (large)
- Color: Inherit from text color or specified in context

## Forms

### Input Fields

- Height: 48px
- Border: 1px solid Light Gray
- Border Radius: md (8px)
- Focus: 2px outline Primary color
- Padding: 12px 16px
- Font: Poppins Regular
- Text Size: Body

### Validation States

- **Error**: Red border, error message below
- **Success**: Green border, check icon
- **Disabled**: Light Gray background, 50% opacity text

## Z-index Scale

| Component       | z-index       |
|-----------------|---------------|
| Page content    | 0             |
| Dropdowns       | 10            |
| Navigation      | 20            |
| Modals/Dialogs  | 30            |
| Notifications   | 40            |
| Hackathon Banner| 50            |

## Accessibility

- Minimum color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Focus states visible for all interactive elements
- Semantic HTML elements used appropriately
- Reduced motion preference respected