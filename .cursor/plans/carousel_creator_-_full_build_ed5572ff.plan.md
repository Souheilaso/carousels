---
name: Carousel Creator - Full Build
overview: "Build a complete carousel creation tool from the existing starter template, matching the modern UI design shown and implementing all required features: multi-slide projects, image search, color grading, text effects, background removal, and image duplication."
todos:
  - id: types-foundation
    content: "Define complete type system in carousel.ts: CarouselProject, CarouselSlide, Layer, TextStyle with effects, LutPreset, CanvasSize"
    status: pending
  - id: canvas-hook-core
    content: "Build/enhance useCarvasEditor hook: canvas initialization, layer management, text/image operations, undo/redo"
    status: pending
    dependencies:
      - types-foundation
  - id: project-hook
    content: "Create useCarouselProject hook: multi-slide project management, slide CRUD, navigation, persistence"
    status: pending
    dependencies:
      - types-foundation
  - id: editor-layout
    content: "Build CarouselEditor component matching UI design: toolbar, canvas area, panels, slide navigation"
    status: pending
    dependencies:
      - canvas-hook-core
      - project-hook
  - id: pexels-api
    content: Create Pexels API client with search, pagination, environment variable support
    status: pending
  - id: image-search-ui
    content: Build ImageSearchResults component and integrate into ImageUploader with grid layout
    status: pending
    dependencies:
      - pexels-api
  - id: lut-presets
    content: "Implement enhanced color grading: turquoise/gold/silver LUTs with proper Fabric.js filters"
    status: pending
    dependencies:
      - canvas-hook-core
  - id: color-grade-ui
    content: Enhance ColorGradePanel with LUT presets, intensity controls, per-image application
    status: pending
    dependencies:
      - lut-presets
  - id: text-editing
    content: "Implement text editing: add/update text, font controls, connect TextPanel to selected layer"
    status: pending
    dependencies:
      - canvas-hook-core
  - id: text-effects
    content: Add text effects (stroke, shadow) to types and implement in canvas, add UI controls
    status: pending
    dependencies:
      - text-editing
  - id: bg-removal-service
    content: Research and integrate background removal API, create client and processing logic
    status: pending
  - id: bg-removal-ui
    content: Create BackgroundRemovalPanel component with preview and apply functionality
    status: pending
    dependencies:
      - bg-removal-service
  - id: image-duplication
    content: Add image duplication feature to useCarvasEditor and layer controls
    status: pending
    dependencies:
      - canvas-hook-core
  - id: export-system
    content: "Implement export: single slide PNG, multi-slide ZIP, individual files with options"
    status: pending
    dependencies:
      - project-hook
  - id: ui-polish
    content: "Polish UI components to match design: styling, tooltips, responsive behavior, dark theme"
    status: pending
    dependencies:
      - editor-layout
---

# Carousel Creator - Complete Implementation Plan

## Overview

Build a complete carousel creation application matching the modern UI design you provided. The application will support your entire workflow: creating multiple slides in a carousel project, searching for images from Pexels/Pinterest, applying brand-specific color grading (turquoise/gold/silver LUTs), advanced text styling with effects, background removal, and image duplication for creative text placement.

## Design Reference

The UI follows the dark, modern design shown with:

- Left vertical toolbar with icon-based tools
- Top navigation bar with app name, size selector, and zoom controls
- Central canvas area with transparent checkered background
- Right panel for contextual tools (Images, Text, Layers, etc.)

## Core Architecture

```mermaid
graph TD
    A[CarouselProject] -->|manages| B[Slide[]]
    B -->|each contains| C[Canvas Editor]
    C -->|uses| D[Fabric.js]
    D -->|renders| E[Layers: Image/Text]
    C -->|applies| F[Color Grading LUTs]
    C -->|integrates| G[Image Search APIs]
    C -->|uses| H[Background Removal API]
    E -->|supports| I[Text Effects: Stroke/Shadow]
```

## Implementation Phases

### Phase 1: Core Canvas & Multi-Slide Foundation

**1.1 Type Definitions & Data Models**

- File: `src/types/carousel.ts`
- Define `CarouselProject`, `CarouselSlide`, `Layer`, `TextStyle`, `LutPreset`, `CanvasSize`
- Support multi-slide structure with metadata

**1.2 Canvas Editor Hook (Fabric.js Integration)**

- File: `src/hooks/useCarvasEditor.ts` (enhance existing)
- Core canvas initialization and management
- Layer operations (add, select, delete, reorder)
- Text and image manipulation
- Undo/redo system

**1.3 Multi-Slide Project Management**

- File: `src/hooks/useCarouselProject.ts` (new)
- Project state management
- Slide CRUD operations
- Slide navigation and switching
- Project persistence (localStorage/JSON export)

**1.4 Main Editor Component Structure**

- File: `src/components/carousel/CarouselEditor.tsx` (enhance existing)
- Layout matching UI design (toolbar, canvas, panels)
- Slide navigation UI (thumbnails/strip)
- Tool state management
- Panel routing based on active tool

### Phase 2: Image Management & Search

**2.1 Image Search APIs**

- Files: `src/lib/pexels.ts`, `src/lib/pinterest.ts` (new)
- Pexels API client with search and pagination
- Pinterest integration (API if available, otherwise URL-based)
- Environment variable configuration for API keys

**2.2 Image Uploader Component**

- File: `src/components/carousel/ImageUploader.tsx` (enhance existing)
- Drag & drop upload area (matches UI design)
- URL import functionality
- Image search integration with results grid
- Search results display with "Add to Canvas" actions

**2.3 Image Search Results Component**

- File: `src/components/carousel/ImageSearchResults.tsx` (new)
- Grid layout for search results
- Pagination controls
- Loading states
- Error handling

### Phase 3: Color Grading System

**3.1 Enhanced LUT Presets**

- File: `src/hooks/useCarvasEditor.ts` (enhance)
- Three brand presets:
  - **Turquoise**: Cyan/teal emphasis in sky areas (HSV targeting)
  - **Gold**: Warm amber/golden tones
  - **Silver**: Cool desaturated metallic tones
- Per-image LUT application (not global)
- Intensity control (0-100%)
- Fabric.js filter implementation (HueRotation, Saturation, Brightness, ColorMatrix)

**3.2 Color Grading Panel**

- File: `src/components/carousel/ColorGradePanel.tsx` (enhance existing)
- LUT preset buttons with previews
- Intensity slider
- Per-image application controls
- Visual feedback for active presets

### Phase 4: Text System & Effects

**4.1 Text Editing Hook**

- File: `src/hooks/useCarvasEditor.ts` (enhance)
- Add text with initial styling
- Update selected text properties (font, size, color, etc.)
- Text positioning and transformation
- Two font families: Inter, Instrument Serif

**4.2 Text Effects System**

- File: `src/types/carousel.ts` (enhance)
- Text effect types: stroke (outline), shadow
- Stroke properties: width, color
- Shadow properties: offsetX, offsetY, blur, color

**4.3 Text Panel Component**

- File: `src/components/carousel/TextPanel.tsx` (enhance existing)
- Connect to selected text layer (populate values)
- Font family selector (Inter/Instrument Serif)
- Size, weight, style controls
- Color picker
- Blend mode selector
- Letter spacing and line height
- Text effects controls (stroke, shadow)

**4.4 Text Effects Panel (Optional Separate Component)**

- File: `src/components/carousel/TextEffectsPanel.tsx` (new, if needed)
- Advanced text effects controls
- Stroke styling
- Shadow customization
- Preview

### Phase 5: Background Removal

**5.1 Background Removal Service**

- File: `src/lib/backgroundRemoval.ts` (new)
- API client for background removal service (Remove.bg, ClipDrop, or similar)
- Image upload and processing
- Progress tracking
- Error handling

**5.2 Background Removal Panel**

- File: `src/components/carousel/BackgroundRemovalPanel.tsx` (new)
- Image selection interface
- Process button with progress indicator
- Preview before/after
- Apply to canvas option

**5.3 Integration**

- File: `src/hooks/useCarvasEditor.ts` (enhance)
- Remove background function
- Store original for undo
- Apply processed image to canvas

### Phase 6: Advanced Features

**6.1 Image Duplication**

- File: `src/hooks/useCarvasEditor.ts` (enhance)
- Duplicate selected image layer
- Clone all properties (filters, transforms, position)
- Support for creative text placement (duplicate behind person)

**6.2 Layer Management**

- File: `src/components/carousel/LayersPanel.tsx` (enhance existing)
- Layer list with reordering (drag & drop)
- Visibility toggles
- Lock/unlock
- Duplicate action
- Context menu for layer actions

**6.3 Export System**

- File: `src/hooks/useCarvasEditor.ts` (enhance)
- Single slide export (PNG, high quality)
- Multi-slide export (ZIP archive)
- Individual file export (all slides)
- Export options (format, quality, naming)

### Phase 7: UI Polish & Integration

**7.1 Toolbar Component**

- File: `src/components/carousel/Toolbar.tsx` (verify matches design)
- Icon-based tools matching UI
- Active state indicators
- Tooltips

**7.2 Size Selector**

- File: `src/components/carousel/SizeSelector.tsx` (verify)
- Canvas size dropdown
- Dimensions display
- Common social media presets

**7.3 Styling & Theme**

- Files: `src/index.css`, `tailwind.config.ts`
- Dark theme matching UI
- Checkered canvas background
- Panel styling
- Button and input styling

## Technical Stack

- **Canvas**: Fabric.js v6
- **UI Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Image Search**: Pexels API, Pinterest (if available)
- **Background Removal**: Service API (TBD based on availability)
- **Export**: JSZip for multi-file export
- **State Management**: React hooks + context (if needed)
- **Persistence**: localStorage for projects (optional)

## API Configuration

Environment variables needed (`.env.local`):

- `VITE_PEXELS_API_KEY` - Pexels API key
- `VITE_REMOVE_BG_API_KEY` - Background removal service API key
- `VITE_PINTEREST_API_KEY` - Optional, if Pinterest API available

## File Structure

```
src/
├── types/
│   └── carousel.ts (enhanced)
├── hooks/
│   ├── useCarvasEditor.ts (enhanced)
│   ├── useCarouselProject.ts (new)
│   └── useBackgroundRemoval.ts (existing, may enhance)
├── lib/
│   ├── pexels.ts (new)
│   ├── pinterest.ts (new)
│   └── backgroundRemoval.ts (new)
├── components/
│   └── carousel/
│       ├── CarouselEditor.tsx (enhanced)
│       ├── Toolbar.tsx (verify)
│       ├── ImageUploader.tsx (enhanced)
│       ├── ImageSearchResults.tsx (new)
│       ├── TextPanel.tsx (enhanced)
│       ├── TextEffectsPanel.tsx (new, optional)
│       ├── ColorGradePanel.tsx (enhanced)
│       ├── BackgroundRemovalPanel.tsx (new)
│       ├── LayersPanel.tsx (enhanced)
│       ├── SizeSelector.tsx (verify)
│       └── ToolButton.tsx (verify)
└── pages/
    └── Index.tsx (verify)
```

## Dependencies to Add

- `jszip` - Multi-file export (ZIP)
- Additional dependencies TBD based on background removal service choice

## Implementation Notes

1. **Multi-Slide Management**: Start with single-slide editor, then add multi-slide wrapper
2. **Image Search**: Implement Pexels first (simpler API), add Pinterest later
3. **Color Grading**: Test LUT presets thoroughly with sample images
4. **Background Removal**: Choose service based on API availability and pricing
5. **Text Effects**: Fabric.js native support for stroke/shadow - leverage directly
6. **Export**: High-quality export (2x multiplier) for retina displays
7. **Performance**: Lazy loading for search results, debounced text updates, optimized canvas rendering

## Success Criteria

- ✅ Create multi-slide carousel projects
- ✅ Search and add images from Pexels/Pinterest
- ✅ Apply brand-specific color grading (3 LUT presets)
- ✅ Add and style text with effects (stroke, shadow)
- ✅ Remove backgrounds from images
- ✅ Duplicate images for creative effects
- ✅ Export single slide or full carousel (ZIP/individual)
- ✅ UI matches the modern design provided
- ✅ Smooth, performant editing experience