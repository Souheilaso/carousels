import { useState, useCallback, useRef, useEffect } from 'react';
import type React from 'react';
import { CarouselSlide, CanvasSize } from '@/types/carousel';
import { useCanvasEditor } from '@/hooks/useCanvasEditor';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullViewProps {
  slides: CarouselSlide[];
  canvasSize: CanvasSize;
  onSlideUpdate: (slideId: string, updates: Partial<CarouselSlide>) => void;
  onAddSlide: (canvasSize: CanvasSize) => void;
  onDeleteSlide: (slideId: string) => void;
  onDuplicateSlide: (slideId: string) => void;
  onSlideSelect?: (slideId: string) => void;
}

interface SlideCanvasProps {
  slide: CarouselSlide;
  zoom: number;
  onLayersChange: (layers: any[]) => void;
  isSelected: boolean;
  onSelect: () => void;
}

function SlideCanvas({
  slide,
  zoom,
  onLayersChange,
  isSelected,
  onSelect,
}: SlideCanvasProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    canvasRef,
    zoomIn,
    zoomOut,
  } = useCanvasEditor({
    canvasSize: slide.canvasSize,
    layers: slide.layers,
    onLayersChange,
  });

  // Handle mouse wheel zoom (use passive:false to allow preventDefault)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  }, [zoomIn, zoomOut]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle clicks on canvas to select this slide
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === canvasRef.current || target.closest('.canvas-content') || target.closest('.slide-canvas-wrapper')) {
      onSelect();
    }
  }, [onSelect, canvasRef]);

  return (
    <div
      className={cn(
        'relative flex-shrink-0 bg-sidebar rounded-lg border-2 transition-all slide-canvas-wrapper',
        isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-primary/50'
      )}
      onClick={handleCanvasClick}
    >
      {/* Slide Header */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 pointer-events-none">
        <div className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/90 text-muted-foreground'
        )}>
          {slide.name}
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={canvasContainerRef}
        className="canvas-container overflow-hidden rounded-lg"
        style={{ 
          width: slide.canvasSize.width * zoom + 40, 
          height: slide.canvasSize.height * zoom + 40,
          minWidth: slide.canvasSize.width * zoom + 40,
        }}
      >
        <div className="canvas-wrapper p-5">
          <div
            style={{
              width: `${slide.canvasSize.width * zoom}px`,
              height: `${slide.canvasSize.height * zoom}px`,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <div
              className="relative shadow-2xl canvas-content"
              style={{
                width: slide.canvasSize.width,
                height: slide.canvasSize.height,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <canvas ref={canvasRef} className="block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FullView({
  slides,
  canvasSize,
  onSlideUpdate,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onSlideSelect,
}: FullViewProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(slides[0]?.id || null);
  const [zoom, setZoom] = useState(0.25); // Smaller zoom for full view
  const containerRef = useRef<HTMLDivElement>(null);

  // Update selected slide when slides change
  useEffect(() => {
    if (slides.length > 0 && (!selectedSlideId || !slides.find(s => s.id === selectedSlideId))) {
      setSelectedSlideId(slides[0].id);
      onSlideSelect?.(slides[0].id);
    }
  }, [slides, selectedSlideId, onSlideSelect]);

  const handleSlideSelect = useCallback((slideId: string) => {
    setSelectedSlideId(slideId);
    onSlideSelect?.(slideId);
  }, [onSlideSelect]);

  const handleLayersChange = useCallback((slideId: string) => (newLayers: any[]) => {
    onSlideUpdate(slideId, { layers: newLayers });
  }, [onSlideUpdate]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.05, 0.6));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.05, 0.1));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-sidebar border-b border-border">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-7 w-7 p-0"
            >
              <span className="text-xs">−</span>
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-7 w-7 p-0"
            >
              <span className="text-xs">+</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onAddSlide(canvasSize)}
            size="sm"
            variant="default"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Slide
          </Button>
        </div>
      </div>

      {/* Slides Container */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div className="flex gap-6 p-6" style={{ minWidth: 'fit-content' }}>
          {slides.map((slide) => (
            <div key={slide.id} className="relative group">
              <SlideCanvas
                slide={slide}
                zoom={zoom}
                onLayersChange={handleLayersChange(slide.id)}
                isSelected={selectedSlideId === slide.id}
                onSelect={() => handleSlideSelect(slide.id)}
              />
              
              {/* Slide Actions */}
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateSlide(slide.id);
                  }}
                  className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                  title="Duplicate slide"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                {slides.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(slide.id);
                    }}
                    className="h-7 w-7 p-0 bg-background/80 hover:bg-destructive/10 hover:text-destructive"
                    title="Delete slide"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {/* Add Slide Button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => onAddSlide(canvasSize)}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[200px] min-h-[250px]',
                'border-2 border-dashed border-border rounded-lg',
                'bg-sidebar hover:bg-muted/50',
                'transition-colors cursor-pointer',
                'text-muted-foreground hover:text-foreground'
              )}
              style={{
                width: `${canvasSize.width * zoom + 40}px`,
                height: `${canvasSize.height * zoom + 40}px`,
              }}
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Add Slide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

