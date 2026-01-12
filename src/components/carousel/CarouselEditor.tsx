import { useState } from 'react';
import { CAROUSEL_SIZES, CanvasSize, LutPreset } from '@/types/carousel';
import { useCarvasEditor } from '@/hooks/useCarvasEditor';
import { Toolbar } from './Toolbar';
import { SizeSelector } from './SizeSelector';
import { ColorGradePanel } from './ColorGradePanel';
import { TextPanel } from './TextPanel';
import { ImageUploader } from './ImageUploader';
import { LayersPanel } from './LayersPanel';
import { Layers } from 'lucide-react';

export function CarouselEditor() {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(CAROUSEL_SIZES[0]);
  const [activeTool, setActiveTool] = useState('select');
  const [showRightPanel, setShowRightPanel] = useState(true);

  const {
    canvasRef,
    layers,
    selectedLayerId,
    zoom,
    activeLut,
    lutIntensity,
    addImage,
    addText,
    applyColorGrade,
    selectLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    deleteLayer,
    zoomIn,
    zoomOut,
    exportCanvas,
    setLayers,
  } = useCarvasEditor({ canvasSize });

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

  const handleLutChange = (lut: LutPreset) => {
    applyColorGrade(lut, lutIntensity);
  };

  const handleIntensityChange = (intensity: number) => {
    if (activeLut) {
      applyColorGrade(activeLut, intensity);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onUndo={() => {}}
        onRedo={() => {}}
        onExport={exportCanvas}
        canUndo={false}
        canRedo={false}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-sidebar border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">
              <span className="text-gradient-turquoise font-display text-xl">Carousel</span> Studio
            </h1>
            <SizeSelector currentSize={canvasSize} onSizeChange={setCanvasSize} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="tool-btn"
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex">
          <div className="flex-1 canvas-container overflow-auto p-8">
            <div 
              className="relative shadow-2xl"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <canvas ref={canvasRef} className="block" />
            </div>
          </div>

          {/* Right Panel */}
          {showRightPanel && (
            <div className="w-72 bg-sidebar border-l border-border overflow-y-auto">
              <div className="p-3 space-y-3">
                {activeTool === 'image' && (
                  <ImageUploader onImageUpload={addImage} />
                )}

                {activeTool === 'text' && (
                  <TextPanel onAddText={addText} />
                )}

                {activeTool === 'grade' && (
                  <ColorGradePanel
                    activeLut={activeLut}
                    intensity={lutIntensity}
                    onLutChange={handleLutChange}
                    onIntensityChange={handleIntensityChange}
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
                    onReorderLayers={setLayers}
                  />
                )}

                {activeTool === 'select' && (
                  <>
                    <ImageUploader onImageUpload={addImage} />
                    <TextPanel onAddText={addText} />
                    <LayersPanel
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onSelectLayer={selectLayer}
                      onToggleVisibility={toggleLayerVisibility}
                      onToggleLock={toggleLayerLock}
                      onDeleteLayer={deleteLayer}
                      onReorderLayers={setLayers}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
