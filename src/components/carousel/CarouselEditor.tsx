import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type React from 'react';
import { CAROUSEL_SIZES, CanvasSize, LutPreset } from '@/types/carousel';
import { useCanvasEditor } from '@/hooks/useCanvasEditor';
import { useCarouselProject } from '@/hooks/useCarouselProject';
import { Toolbar } from './Toolbar';
import { SizeSelector } from './SizeSelector';
import { ColorGradePanel } from './ColorGradePanel';
import { TextPanel } from './TextPanel';
import { ImageUploader } from './ImageUploader';
import { LayersPanel } from './LayersPanel';
import { BackgroundRemovalPanel } from './BackgroundRemovalPanel';
import { SlideNavigation } from './SlideNavigation';
import { FullView } from './FullView';
import { DraggableSidebarSections } from './DraggableSidebarSections';
import { Layers, Download, Grid3x3, Square } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { cn } from '@/lib/utils';

export function CarouselEditor() {
  const [activeTool, setActiveTool] = useState('select');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'full'>('single');
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    project,
    currentSlide,
    currentSlideIndex,
    slides,
    addSlide,
    deleteSlide,
    duplicateSlide,
    updateSlide,
    setCurrentSlide,
  } = useCarouselProject();

  const canvasSize = currentSlide?.canvasSize || CAROUSEL_SIZES[0];

  const {
    canvasRef,
    layers,
    selectedLayerId,
    zoom,
    activeLut,
    lutIntensity,
    addImage,
    addVideo,
    removeBackgroundFromImage,
    addText,
    updateTextLayer,
    getSelectedTextProperties,
    getSelectedLayerColorGrade,
    applyColorGrade,
    resetColorGrade,
    applyManualAdjustment,
    applyColorWheel,
    applyCurves,
    applyPrimaryAdjustments,
    applyPrimaryBars,
    applyAdvancedCurves,
    applyHSL,
    applyAdvancedAdjustments,
    selectLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    deleteLayer,
    zoomIn,
    zoomOut,
    exportCanvas,
    exportCanvasAsDownload,
    exportCanvasAsVideo,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasEditor({
    canvasSize,
    layers: currentSlide?.layers,
    onLayersChange: (newLayers) => {
      if (currentSlide) {
        updateSlide(currentSlide.id, { layers: newLayers });
      }
    },
  });

  // Update slide when canvas size changes
  const handleSizeChange = useCallback((newSize: CanvasSize) => {
    if (currentSlide) {
      updateSlide(currentSlide.id, { canvasSize: newSize });
    }
  }, [currentSlide, updateSlide]);

  const handleToolChange = (tool: string) => {
    if (tool === 'zoomin') {
      zoomIn();
      return;
    }
    if (tool === 'zoomout') {
      zoomOut();
      return;
    }
    setActiveTool(tool);
  };

  // Get selected layer's color grade state
  const selectedLayerColorGrade = selectedLayerId ? getSelectedLayerColorGrade() : null;
  const previewImageUrl = useMemo(() => {
    if (selectedLayerId) {
      const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
      if (selectedLayer?.type === 'image' && selectedLayer.sourceUrl) {
        return selectedLayer.sourceUrl;
      }
    }
    const firstImageLayer = layers.find(layer => layer.type === 'image' && layer.sourceUrl);
    return firstImageLayer?.sourceUrl ?? null;
  }, [layers, selectedLayerId]);

  const handleLutChange = (lut: LutPreset, layerId?: string) => {
    const intensity = layerId && selectedLayerColorGrade 
      ? selectedLayerColorGrade.intensity 
      : lutIntensity;
    applyColorGrade(lut, intensity, layerId);
  };

  const handleIntensityChange = (intensity: number, layerId?: string) => {
    const lut = layerId && selectedLayerColorGrade 
      ? selectedLayerColorGrade.lut 
      : activeLut;
    if (lut) {
      applyColorGrade(lut, intensity, layerId);
    }
  };

  const handleManualAdjustmentChange = (adjustment: 'exposure' | 'contrast' | 'saturation' | 'temperature', value: number, layerId?: string) => {
    applyManualAdjustment(adjustment, value, layerId);
  };

  const handleColorWheelChange = (wheel: 'lift' | 'gamma' | 'gain' | 'offset', value: { r: number; g: number; b: number }, layerId?: string) => {
    applyColorWheel(wheel, value, layerId);
  };

  const handlePrimaryAdjustmentsChange = (adjustments: any, layerId?: string) => {
    applyPrimaryAdjustments(adjustments, layerId);
  };

  const handlePrimaryBarsChange = (bars: any, layerId?: string) => {
    applyPrimaryBars(bars, layerId);
  };

  const handleCurvesChange = (curves: any, layerId?: string) => {
    applyCurves(curves, layerId);
  };

  const handleAdvancedCurvesChange = (curves: any, layerId?: string) => {
    applyAdvancedCurves(curves, layerId);
  };

  const handleHSLChange = (hsl: any, layerId?: string) => {
    applyHSL(hsl, layerId);
  };

  const handleAdvancedChange = (advanced: any, layerId?: string) => {
    applyAdvancedAdjustments(advanced, layerId);
  };

  const handleResetColorGrade = (layerId?: string) => {
    resetColorGrade(layerId);
  };

  const handleExport = useCallback(async () => {
    if (!currentSlide) return;

    const hasVideo = layers.some((l) => l.type === 'video');
    if (hasVideo) {
      await exportCanvasAsVideo(`slide-${currentSlideIndex + 1}.mp4`, 5000, 30);
      return;
    }

    // Export single slide as image
    exportCanvasAsDownload(`slide-${currentSlideIndex + 1}.png`, 2);
  }, [currentSlide, currentSlideIndex, exportCanvasAsDownload, exportCanvasAsVideo, layers]);

  const handleExportAll = useCallback(async () => {
    if (slides.length === 0) return;

    const hasVideo = layers.some((l) => l.type === 'video');

    try {
      toast.info(hasVideo ? 'Rendering video export...' : 'Preparing export...');

      if (hasVideo) {
        await exportCanvasAsVideo('carousel-export.mp4', 5000, 30);
        return;
      }

      const zip = new JSZip();

      // Note: This currently exports the active slide only.
      const dataUrl = exportCanvas(2);
      if (dataUrl) {
        const base64Data = dataUrl.split(',')[1];
        zip.file(`slide-${currentSlideIndex + 1}.png`, base64Data, { base64: true });
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'carousel-export.zip';
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Carousel exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export carousel');
    }
  }, [slides.length, currentSlideIndex, exportCanvas, exportCanvasAsVideo, layers]);

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

  // Handle keyboard shortcuts (zoom and slide navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        // Reset zoom to 1
        // Note: We'd need to expose setZoom from the hook for this, but for now just zoom in/out
      } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          setCurrentSlide(slides[currentSlideIndex - 1].id);
        }
      } else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (currentSlideIndex < slides.length - 1) {
          setCurrentSlide(slides[currentSlideIndex + 1].id);
        }
      } else if (e.key === 'Delete' && (e.ctrlKey || e.metaKey) && currentSlide && slides.length > 1) {
        e.preventDefault();
        deleteSlide(currentSlide.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, currentSlideIndex, slides, currentSlide, setCurrentSlide, deleteSlide]);

  let selectedTextProperties: ReturnType<typeof getSelectedTextProperties> = null;
  try {
    selectedTextProperties = getSelectedTextProperties();
  } catch (error) {
    console.error('Failed to read selected text properties:', error);
  }

  const normalizedSelectedTextProps = selectedTextProperties
    ? {
        ...selectedTextProperties,
        // Ensure numeric fontWeight to satisfy TextPanel props
        fontWeight: Number(selectedTextProperties.fontWeight) || 400,
      }
    : null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-sidebar border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">
              <span className="text-gradient-turquoise font-display text-xl">Carousel</span> Studio
            </h1>
            <SizeSelector currentSize={canvasSize} onSizeChange={handleSizeChange} />
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div
              role="radiogroup"
              aria-label="View mode"
              className="bg-muted rounded-md p-1 flex items-center gap-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'single'}
                onClick={() => setViewMode('single')}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground',
                  viewMode === 'single' && 'bg-background text-foreground shadow-sm'
                )}
                aria-label="Single slide view"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'full'}
                onClick={() => setViewMode('full')}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground',
                  viewMode === 'full' && 'bg-background text-foreground shadow-sm'
                )}
                aria-label="Full view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
            {viewMode === 'single' && (
              <>
                <span className="text-sm text-muted-foreground">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className="tool-btn"
                >
                  <Layers className="w-5 h-5" />
                </button>
              </>
            )}
            {viewMode === 'full' && (
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="tool-btn"
              >
                <Layers className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Slide Navigation - Only visible in single view */}
        {viewMode === 'single' && (
          <SlideNavigation
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            currentSlideId={currentSlide?.id}
            canvasSize={canvasSize}
            onSlideSelect={setCurrentSlide}
            onAddSlide={addSlide}
            onDeleteSlide={deleteSlide}
            onDuplicateSlide={duplicateSlide}
            onExportAll={handleExportAll}
          />
        )}

        {/* Canvas Area */}
        {viewMode === 'full' ? (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-h-0">
              <FullView
                slides={slides}
                canvasSize={canvasSize}
                onSlideUpdate={updateSlide}
                onAddSlide={addSlide}
                onDeleteSlide={deleteSlide}
                onDuplicateSlide={duplicateSlide}
                onSlideSelect={setCurrentSlide}
              />
            </div>
            {/* Right Panel for Full View - Only show when a slide is selected */}
            {showRightPanel && currentSlide && (
              <div className="w-72 bg-sidebar border-l border-border flex flex-col overflow-hidden min-h-0">
                <ScrollArea className="flex-1 h-full">
                  <div className="p-3 space-y-3">
                    {activeTool === 'image' && (
                      <ImageUploader
                        onUpload={({ type, url }) => type === 'video' ? addVideo(url) : addImage(url)}
                      />
                    )}

                    {activeTool === 'text' && (
                      <TextPanel
                        selectedTextProperties={normalizedSelectedTextProps}
                        onAddText={addText}
                        onUpdateText={selectedLayerId ? (updates) => updateTextLayer(selectedLayerId, updates) : undefined}
                      />
                    )}

                    {activeTool === 'grade' && (
                      <ColorGradePanel
                        activeLut={selectedLayerId 
                          ? (selectedLayerColorGrade?.lut ?? activeLut)
                          : activeLut}
                        intensity={selectedLayerId
                          ? (selectedLayerColorGrade?.intensity ?? lutIntensity)
                          : lutIntensity}
                        selectedLayerId={selectedLayerId}
                        previewImageUrl={previewImageUrl}
                        onResetColorGrade={handleResetColorGrade}
                        manualAdjustments={selectedLayerColorGrade?.manualAdjustments}
                        colorWheels={selectedLayerColorGrade?.advancedColorGrade?.colorWheels}
                        primaryAdjustments={selectedLayerColorGrade?.advancedColorGrade?.primaryAdjustments}
                        primaryBars={selectedLayerColorGrade?.advancedColorGrade?.primaryBars}
                        curves={selectedLayerColorGrade?.advancedColorGrade?.curves}
                        advancedCurves={selectedLayerColorGrade?.advancedColorGrade?.advancedCurves}
                        hslAdjustments={selectedLayerColorGrade?.advancedColorGrade?.hslAdjustments}
                        advancedAdjustments={selectedLayerColorGrade?.advancedColorGrade?.advancedAdjustments}
                        onLutChange={handleLutChange}
                        onIntensityChange={handleIntensityChange}
                        onManualAdjustmentChange={handleManualAdjustmentChange}
                        onColorWheelChange={handleColorWheelChange}
                        onPrimaryAdjustmentsChange={handlePrimaryAdjustmentsChange}
                        onPrimaryBarsChange={handlePrimaryBarsChange}
                        onCurvesChange={handleCurvesChange}
                        onAdvancedCurvesChange={handleAdvancedCurvesChange}
                        onHSLChange={handleHSLChange}
                        onAdvancedChange={handleAdvancedChange}
                      />
                    )}
                {activeTool === 'grade' && (
                  <ColorGradePanel
                    activeLut={selectedLayerId 
                      ? (selectedLayerColorGrade?.lut ?? activeLut)
                      : activeLut}
                    intensity={selectedLayerId
                      ? (selectedLayerColorGrade?.intensity ?? lutIntensity)
                      : lutIntensity}
                    selectedLayerId={selectedLayerId}
                    previewImageUrl={previewImageUrl}
                    onResetColorGrade={handleResetColorGrade}
                    manualAdjustments={selectedLayerColorGrade?.manualAdjustments}
                    colorWheels={selectedLayerColorGrade?.advancedColorGrade?.colorWheels}
                    primaryAdjustments={selectedLayerColorGrade?.advancedColorGrade?.primaryAdjustments}
                    primaryBars={selectedLayerColorGrade?.advancedColorGrade?.primaryBars}
                    curves={selectedLayerColorGrade?.advancedColorGrade?.curves}
                    advancedCurves={selectedLayerColorGrade?.advancedColorGrade?.advancedCurves}
                    hslAdjustments={selectedLayerColorGrade?.advancedColorGrade?.hslAdjustments}
                    advancedAdjustments={selectedLayerColorGrade?.advancedColorGrade?.advancedAdjustments}
                    onLutChange={handleLutChange}
                    onIntensityChange={handleIntensityChange}
                    onManualAdjustmentChange={handleManualAdjustmentChange}
                    onColorWheelChange={handleColorWheelChange}
                    onPrimaryAdjustmentsChange={handlePrimaryAdjustmentsChange}
                    onPrimaryBarsChange={handlePrimaryBarsChange}
                    onCurvesChange={handleCurvesChange}
                    onAdvancedCurvesChange={handleAdvancedCurvesChange}
                    onHSLChange={handleHSLChange}
                    onAdvancedChange={handleAdvancedChange}
                  />
                )}

                    {activeTool === 'removebg' && (
                      <BackgroundRemovalPanel
                        selectedLayerId={selectedLayerId}
                        onRemoveBackground={removeBackgroundFromImage}
                      />
                    )}

                    {activeTool === 'layers' && (
                      <LayersPanel
                        layers={layers}
                        selectedLayerId={selectedLayerId}
                        onSelectLayer={selectLayer}
                        onToggleVisibility={toggleLayerVisibility}
                        onToggleLock={toggleLayerLock}
                        onDeleteLayer={deleteLayer}
                        onReorderLayers={() => {}}
                      />
                    )}

                    {activeTool === 'select' && (
                      <DraggableSidebarSections
                        sections={[
                          {
                            id: 'images',
                            title: 'Images & Videos',
                            component: (
                              <ImageUploader
                                onUpload={({ type, url }) => type === 'video' ? addVideo(url) : addImage(url)}
                              />
                            ),
                          },
                          {
                            id: 'typography',
                            title: 'Typography',
                            component: (
                              <TextPanel
                                selectedTextProperties={normalizedSelectedTextProps}
                                onAddText={addText}
                                onUpdateText={selectedLayerId ? (updates) => updateTextLayer(selectedLayerId, updates) : undefined}
                              />
                            ),
                          },
                          {
                            id: 'layers',
                            title: 'Layers',
                            component: (
                              <LayersPanel
                                layers={layers}
                                selectedLayerId={selectedLayerId}
                                onSelectLayer={selectLayer}
                                onToggleVisibility={toggleLayerVisibility}
                                onToggleLock={toggleLayerLock}
                                onDeleteLayer={deleteLayer}
                                onReorderLayers={() => {}}
                              />
                            ),
                          },
                        ]}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        ) : (
        <div className="flex-1 flex min-h-0">
          <div 
            ref={canvasContainerRef}
            className="flex-1 canvas-container overflow-auto"
          >
            <div className="canvas-wrapper">
              <div
                style={{
                  width: `${canvasSize.width * zoom}px`,
                  height: `${canvasSize.height * zoom}px`,
                  margin: '0 auto',
                  position: 'relative',
                }}
              >
                <div
                  className="relative shadow-2xl canvas-content"
                  style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
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

          {/* Right Panel */}
          {showRightPanel && (
            <div className="w-72 bg-sidebar border-l border-border flex flex-col overflow-hidden min-h-0">
              <ScrollArea className="flex-1 h-full">
                <div className="p-3 space-y-3">
                {activeTool === 'image' && (
                  <ImageUploader
                    onUpload={({ type, url }) => type === 'video' ? addVideo(url) : addImage(url)}
                  />
                )}

                {activeTool === 'text' && (
                  <TextPanel
                    selectedTextProperties={normalizedSelectedTextProps}
                    onAddText={addText}
                    onUpdateText={selectedLayerId ? (updates) => updateTextLayer(selectedLayerId, updates) : undefined}
                  />
                )}

                {activeTool === 'grade' && (
                  <ColorGradePanel
                    activeLut={selectedLayerId 
                      ? (selectedLayerColorGrade?.lut ?? activeLut)
                      : activeLut}
                    intensity={selectedLayerId
                      ? (selectedLayerColorGrade?.intensity ?? lutIntensity)
                      : lutIntensity}
                    selectedLayerId={selectedLayerId}
                    previewImageUrl={previewImageUrl}
                    onResetColorGrade={handleResetColorGrade}
                    manualAdjustments={selectedLayerColorGrade?.manualAdjustments}
                    colorWheels={selectedLayerColorGrade?.advancedColorGrade?.colorWheels}
                    primaryAdjustments={selectedLayerColorGrade?.advancedColorGrade?.primaryAdjustments}
                    primaryBars={selectedLayerColorGrade?.advancedColorGrade?.primaryBars}
                    curves={selectedLayerColorGrade?.advancedColorGrade?.curves}
                    advancedCurves={selectedLayerColorGrade?.advancedColorGrade?.advancedCurves}
                    hslAdjustments={selectedLayerColorGrade?.advancedColorGrade?.hslAdjustments}
                    advancedAdjustments={selectedLayerColorGrade?.advancedColorGrade?.advancedAdjustments}
                    onLutChange={handleLutChange}
                    onIntensityChange={handleIntensityChange}
                    onManualAdjustmentChange={handleManualAdjustmentChange}
                    onColorWheelChange={handleColorWheelChange}
                    onPrimaryAdjustmentsChange={handlePrimaryAdjustmentsChange}
                    onPrimaryBarsChange={handlePrimaryBarsChange}
                    onCurvesChange={handleCurvesChange}
                    onAdvancedCurvesChange={handleAdvancedCurvesChange}
                    onHSLChange={handleHSLChange}
                    onAdvancedChange={handleAdvancedChange}
                  />
                )}

                {activeTool === 'removebg' && (
                  <BackgroundRemovalPanel
                    selectedLayerId={selectedLayerId}
                    onRemoveBackground={removeBackgroundFromImage}
                  />
                )}

                {activeTool === 'layers' && (
                  <LayersPanel
                    layers={layers}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={selectLayer}
                    onToggleVisibility={toggleLayerVisibility}
                    onToggleLock={toggleLayerLock}
                    onDeleteLayer={deleteLayer}
                    onReorderLayers={() => {}}
                  />
                )}

                {activeTool === 'select' && (
                  <DraggableSidebarSections
                    sections={[
                      {
                        id: 'images',
                        title: 'Images & Videos',
                        component: (
                          <ImageUploader
                            onUpload={({ type, url }) => type === 'video' ? addVideo(url) : addImage(url)}
                          />
                        ),
                      },
                      {
                        id: 'typography',
                        title: 'Typography',
                        component: (
                          <TextPanel
                            selectedTextProperties={normalizedSelectedTextProps}
                            onAddText={addText}
                            onUpdateText={selectedLayerId ? (updates) => updateTextLayer(selectedLayerId, updates) : undefined}
                          />
                        ),
                      },
                      {
                        id: 'layers',
                        title: 'Layers',
                        component: (
                          <LayersPanel
                            layers={layers}
                            selectedLayerId={selectedLayerId}
                            onSelectLayer={selectLayer}
                            onToggleVisibility={toggleLayerVisibility}
                            onToggleLock={toggleLayerLock}
                            onDeleteLayer={deleteLayer}
                            onReorderLayers={() => {}}
                          />
                        ),
                      },
                    ]}
                  />
                )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
