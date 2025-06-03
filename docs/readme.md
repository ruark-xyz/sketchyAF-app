# SketchyAF Marketing Website

Welcome to the SketchyAF Marketing Website project! This repository contains the code for the official marketing website for SketchyAF, a mobile game that's "weird, wildly entertaining, and perfect for killing time anywhere."

## Project Overview

SketchyAF is a mobile game that merges chaotic drawing, meme culture, and real-time multiplayer mayhem. The marketing website serves to promote the game, showcase premium features, display a leaderboard, and provide necessary legal documentation.

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Deployment**: TBD

## Project Structure

The project follows a modular component-based architecture:

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

## Pages

The website consists of the following pages:

- **Home**: Main landing page with game overview and signup
- **Premium**: Showcase of premium features and booster packs
- **Leaderboard**: Display of top players (placeholder for now)
- **Privacy Policy**: Legal privacy information
- **Terms of Service**: Legal terms information

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd sketchyaf-marketing
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Development Guidelines

- Follow the established [Design System](./design-system.md)
- Consult the [Component Specifications](./component-specs.md) for details on implementing components
- Refer to the [Build Plan](./build-plan.md) for project structure and implementation approach

## Project Roadmap

Please see the [Project Roadmap](./project-roadmap.md) for detailed information on milestones, timelines, and implementation plans.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

## License

This project is proprietary and confidential. All rights reserved.

## Contact

For questions or support, contact the project maintainers.