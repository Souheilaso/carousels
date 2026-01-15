# Carousel Studio

A powerful web application for creating and editing carousel designs with advanced image editing capabilities.

## Features

- Create and edit multi-slide carousels
- Image upload and management
- Background removal
- Color grading and filters
- Text editing and styling
- Layer management
- Pinterest integration for image search
- Export carousels as images

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone git@github.com:Souheilaso/carousels.git

# Step 2: Navigate to the project directory
cd carousel-crafter

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Fabric.js (for canvas editing)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Deployment

Build the project for production:

```sh
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to any static hosting service.
