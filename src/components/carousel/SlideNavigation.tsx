import { CarouselSlide, CanvasSize } from '@/types/carousel';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideNavigationProps {
  slides: CarouselSlide[];
  currentSlideIndex: number;
  currentSlideId: string | undefined;
  canvasSize: CanvasSize;
  onSlideSelect: (slideId: string) => void;
  onAddSlide: (canvasSize: CanvasSize) => void;
  onDeleteSlide: (slideId: string) => void;
  onDuplicateSlide: (slideId: string) => void;
  onExportAll?: () => void;
}

export function SlideNavigation({
  slides,
  currentSlideIndex,
  currentSlideId,
  canvasSize,
  onSlideSelect,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onExportAll,
}: SlideNavigationProps) {
  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      onSlideSelect(slides[currentSlideIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      onSlideSelect(slides[currentSlideIndex + 1].id);
    }
  };

  return (
    <div className="bg-sidebar/80 border-b border-border backdrop-blur-sm">
      {/* Main Navigation Bar */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Slide Counter & Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground font-medium">
            {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentSlideIndex === 0}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={currentSlideIndex >= slides.length - 1}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Slide Strip */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto px-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {slides.map((slide, index) => {
            const isActive = slide.id === currentSlideId;
            return (
              <div
                key={slide.id}
                className={cn(
                  'group relative flex items-center gap-1 shrink-0',
                  'bg-card border-2 rounded-lg px-3 py-1.5 cursor-pointer transition-all',
                  isActive
                    ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
                onClick={() => onSlideSelect(slide.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isActive ? 'bg-primary' : 'bg-muted-foreground/40'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium whitespace-nowrap',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Slide {index + 1}
                  </span>
                </div>
                {/* Hover actions */}
                {!isActive && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSlide(slide.id);
                      }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      title="Duplicate slide"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {slides.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSlide(slide.id);
                        }}
                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                        title="Delete slide"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => onAddSlide(canvasSize)}
            size="sm"
            variant="default"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Slide
          </Button>
          {slides.length > 1 && currentSlideId && (
            <>
              <Button
                onClick={() => onDuplicateSlide(currentSlideId)}
                size="sm"
                variant="outline"
                className="border-border"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                Duplicate
              </Button>
              <Button
                onClick={() => onDeleteSlide(currentSlideId)}
                size="sm"
                variant="outline"
                className="border-border text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            </>
          )}
          {onExportAll && (
            <>
              <div className="h-6 w-px bg-border" />
              <Button
                onClick={onExportAll}
                size="sm"
                variant="outline"
                className="border-border"
              >
                Export All
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


