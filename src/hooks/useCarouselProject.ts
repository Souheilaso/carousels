import { useState, useCallback, useEffect } from 'react';
import { CarouselProject, CarouselSlide, CanvasSize, CAROUSEL_SIZES } from '@/types/carousel';

const STORAGE_KEY = 'carousel-project';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultSlide(canvasSize: CanvasSize = CAROUSEL_SIZES[0]): CarouselSlide {
  return {
    id: generateId(),
    name: `Slide ${Date.now()}`,
    canvasSize,
    layers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createDefaultProject(): CarouselProject {
  return {
    id: generateId(),
    name: 'Untitled Carousel',
    slides: [createDefaultSlide()],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function useCarouselProject() {
  const [project, setProject] = useState<CarouselProject>(() => {
    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load project from localStorage:', error);
    }
    return createDefaultProject();
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Save to localStorage whenever project changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (error) {
      console.error('Failed to save project to localStorage:', error);
    }
  }, [project]);

  const currentSlide = project.slides[currentSlideIndex];

  const addSlide = useCallback((canvasSize?: CanvasSize) => {
    setProject((prev) => {
      const newSlide = createDefaultSlide(canvasSize || prev.slides[0]?.canvasSize || CAROUSEL_SIZES[0]);
      const newSlides = [...prev.slides, newSlide];
      setCurrentSlideIndex(newSlides.length - 1);
      return {
        ...prev,
        slides: newSlides,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const deleteSlide = useCallback((slideId: string) => {
    setProject((prev) => {
      const newSlides = prev.slides.filter((s) => s.id !== slideId);
      if (newSlides.length === 0) {
        // Create a new slide if we delete the last one
        const newSlide = createDefaultSlide();
        setCurrentSlideIndex(0);
        return {
          ...prev,
          slides: [newSlide],
          updatedAt: Date.now(),
        };
      }
      
      // Adjust current index if needed
      const deletedIndex = prev.slides.findIndex((s) => s.id === slideId);
      if (deletedIndex <= currentSlideIndex) {
        setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
      }
      
      return {
        ...prev,
        slides: newSlides,
        updatedAt: Date.now(),
      };
    });
  }, [currentSlideIndex]);

  const updateSlide = useCallback((slideId: string, updates: Partial<CarouselSlide>) => {
    setProject((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.id === slideId
          ? { ...slide, ...updates, updatedAt: Date.now() }
          : slide
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const duplicateSlide = useCallback((slideId: string) => {
    setProject((prev) => {
      const slideIndex = prev.slides.findIndex((s) => s.id === slideId);
      if (slideIndex === -1) return prev;

      const slideToDuplicate = prev.slides[slideIndex];
      const newSlide: CarouselSlide = {
        ...slideToDuplicate,
        id: generateId(),
        name: `${slideToDuplicate.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newSlides = [
        ...prev.slides.slice(0, slideIndex + 1),
        newSlide,
        ...prev.slides.slice(slideIndex + 1),
      ];

      setCurrentSlideIndex(slideIndex + 1);

      return {
        ...prev,
        slides: newSlides,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const setCurrentSlide = useCallback((slideId: string) => {
    const index = project.slides.findIndex((s) => s.id === slideId);
    if (index !== -1) {
      setCurrentSlideIndex(index);
    }
  }, [project.slides]);

  const createNewProject = useCallback(() => {
    const newProject = createDefaultProject();
    setProject(newProject);
    setCurrentSlideIndex(0);
  }, []);

  const loadProject = useCallback((loadedProject: CarouselProject) => {
    setProject(loadedProject);
    setCurrentSlideIndex(0);
  }, []);

  const exportProject = useCallback((): string => {
    return JSON.stringify(project, null, 2);
  }, [project]);

  return {
    project,
    currentSlide,
    currentSlideIndex,
    slides: project.slides,
    addSlide,
    deleteSlide,
    updateSlide,
    duplicateSlide,
    setCurrentSlide,
    createNewProject,
    loadProject,
    exportProject,
    setProject,
  };
}


