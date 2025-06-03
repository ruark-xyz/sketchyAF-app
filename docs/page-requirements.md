# SketchyAF Page Requirements

This document details the specific requirements for each page of the SketchyAF marketing website.

## Homepage (`/`)

### Hero Section
- **Headline**: Snarky, attention-grabbing tagline
- **Subheadline**: Brief game description (1-2 sentences)
- **Primary CTA**: "Join a Game" button (placeholder link)
- **Secondary CTA**: "View Leaderboard" button (links to leaderboard page)
- **Visual Elements**: Bold, colorful background with game-themed elements
- **Animation**: Fade-up entrance animation for headline and CTAs

### Email Signup Section
- **Heading**: "Get notified when we launch" or similar
- **Input Field**: Email input with validation
- **Button**: "Notify Me" or similar CTA
- **Success Message**: "You're in, sketchlord!" or similar snarky confirmation
- **Error Handling**: Form validation with inline error messages
- **Data Storage**: Store emails (localStorage for development)

### Gameplay Highlights Section
- **Section Title**: "Why SketchyAF?" or similar
- **Feature Grid**: 4-6 feature cards
- **Card Components**:
  - Icon (from Lucide React)
  - Feature title
  - Brief description (1-2 sentences)
- **Animation**: Staggered entrance animation for cards

### Social Proof Section
- **Testimonials**: 3-5 user testimonials (placeholder)
- **User Avatars**: Generic avatars with usernames
- **Ratings**: Star rating display
- **Layout**: Carousel on mobile, grid on desktop

### Bottom CTA Section
- **Heading**: Call-to-action heading
- **Button**: Primary CTA matching hero section
- **Visual**: Background color change or pattern to distinguish from other sections

## Premium Features Page (`/premium`)

### Premium Intro Section
- **Headline**: Value proposition for premium subscription
- **Subheadline**: Brief overview of benefits
- **Visual**: Distinctive graphic element to enhance appeal

### Subscription Section
- **Pricing**: Clear display of monthly/annual pricing
- **Feature List**: Bullet points highlighting premium benefits
- **CTA Button**: "Become Premium AF" or similar
- **Visual**: Card-like design with highlight effects

### Booster Packs Grid
- **Grid Layout**: Responsive grid of booster pack cards
- **Card Elements**:
  - Pack name
  - Price indicator (Free/$XX/Premium)
  - Visual representation
  - Brief description
- **Interaction**: Clickable cards that open preview modal
- **Filtering**: Optional categorization by type (Free/Paid/Premium)

### Pack Preview Modal
- **Grid View**: Preview of pack contents
- **Close Button**: Easy dismissal
- **Visual**: Attractive layout with pack details
- **Animation**: Smooth entrance/exit animation

## Leaderboard Page (`/leaderboard`)

### Leaderboard Header
- **Title**: "SketchyAF Leaderboard" or similar
- **Description**: Brief explanation of ranking system
- **Filter Options**: Time period selector (optional)

### Leaderboard Table/Grid
- **Columns**: Rank, Username, Score
- **Rows**: Top 10-20 players (placeholder data)
- **Styling**: Alternating row colors for readability
- **Responsiveness**: Horizontal scroll on mobile if needed

### Bottom CTA
- **Message**: Snarky encouragement to join the game
- **Button**: "Join a Game" or similar
- **Animation**: Attention-grabbing effect

## Privacy Policy Page (`/privacy`)

### Content Sections
- **Header**: Page title
- **Last Updated**: Timestamp
- **Introduction**: Brief overview of privacy policy
- **Data Collection**: What data is collected
- **Data Usage**: How data is used
- **Data Sharing**: Third-party sharing policies
- **User Rights**: Information about user rights
- **Contact**: Contact information for privacy concerns

### Styling
- **Typography**: Clear hierarchy with headings and paragraphs
- **Readability**: Sufficient line height and paragraph spacing
- **Navigation**: Optional table of contents with jump links

## Terms of Service Page (`/terms`)

### Content Sections
- **Header**: Page title
- **Last Updated**: Timestamp
- **Introduction**: Brief overview of terms
- **Service Description**: Description of the service
- **User Obligations**: User responsibilities
- **Intellectual Property**: Copyright and IP information
- **Limitations**: Liability limitations
- **Governing Law**: Legal jurisdiction
- **Changes to Terms**: How changes are communicated
- **Contact**: Contact information for questions

### Styling
- **Typography**: Clear hierarchy with headings and paragraphs
- **Readability**: Sufficient line height and paragraph spacing
- **Navigation**: Optional table of contents with jump links

## Global Elements

### Navbar
- **Logo**: SketchyAF logo (placeholder)
- **Navigation Links**: Home, Premium, Leaderboard, Privacy, Terms
- **Mobile Menu**: Hamburger menu on small screens
- **States**: Active page indicator

### Footer
- **Links**: Quick links to all pages
- **Social**: Placeholders for social media icons
- **Copyright**: Copyright information
- **Layout**: Multi-column on desktop, stacked on mobile

### Hackathon Banner
- **Message**: "Vote for us in the React Hackathon!"
- **Link**: Placeholder for voting link
- **Dismissible**: Option to close with local storage persistence
- **Styling**: Attention-grabbing background color