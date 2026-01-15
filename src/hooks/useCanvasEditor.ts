import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, FabricText, util } from 'fabric';
import { CanvasSize, Layer, LutPreset, BlendMode, FontFamily, TextStyle } from '../types/carousel';
import { toast } from 'sonner';
import { removeBackground } from '../lib/backgroundRemoval';

interface UseCanvasEditorProps {
  canvasSize: CanvasSize;
  layers?: Layer[];
  onLayersChange?: (layers: Layer[]) => void;
}

interface HistoryState {
  layers: Layer[];
  canvasState: string;
}

// Map CSS blend modes to canvas globalCompositeOperation
const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
  'normal': 'source-over',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'soft-light': 'soft-light',
};

// Helper function to apply blend mode render override to a text object
function applyBlendModeRender(textObj: FabricText, blendMode: BlendMode) {
  // Store blend mode
  (textObj as any).blendMode = blendMode;

  // Disable object caching for blended text so the composite op applies on the main canvas
  const compositeOp = blendModeMap[blendMode] || 'source-over';
  textObj.set('globalCompositeOperation', compositeOp);
  textObj.set('objectCaching', blendMode === 'normal');
  textObj.dirty = true;

  // Always re-apply the render override to ensure it's current
  // Remove existing override if present
  if ((textObj as any)._blendModeOriginalRender) {
    textObj._render = (textObj as any)._blendModeOriginalRender;
  }

  // Override _render to apply blend mode
  const originalRender = textObj._render.bind(textObj);
  (textObj as any)._blendModeOriginalRender = originalRender;

  textObj._render = function(ctx: CanvasRenderingContext2D, noTransform?: boolean) {
    const currentBlendMode = (this as any).blendMode || 'normal';
    const currentCompositeOp = blendModeMap[currentBlendMode] || 'source-over';

    // Always apply the composite operation (even for 'normal' to ensure consistency)
    ctx.save();
    ctx.globalCompositeOperation = currentCompositeOp;
    originalRender(ctx, noTransform);
    ctx.restore();
  };
}

function getMaxLayerSuffix(layers: Layer[]) {
  let maxSuffix = 0;
  layers.forEach((layer) => {
    const match = layer.id.match(/-(\d+)$/);
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) {
        maxSuffix = Math.max(maxSuffix, num);
      }
    }
  });
  return maxSuffix;
}

const serializationProps = ['layerId', 'blendMode'];

export function useCanvasEditor({ canvasSize, layers: initialLayers, onLayersChange }: UseCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [layers, setLayers] = useState<Layer[]>(initialLayers || []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [activeLut, setActiveLut] = useState<LutPreset | null>(null);
  const [lutIntensity, setLutIntensity] = useState(75);
  const layerCountRef = useRef(0);
  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Sync layers with initialLayers prop
  useEffect(() => {
    if (initialLayers && initialLayers !== layers) {
      setLayers(initialLayers);
    }
  }, [initialLayers]);

  // Keep layer counter ahead of existing layers to avoid duplicate IDs
  useEffect(() => {
    const maxSuffix = getMaxLayerSuffix(layers);
    if (maxSuffix > layerCountRef.current) {
      layerCountRef.current = maxSuffix;
    }
  }, [layers]);

  // Notify parent of layer changes
  useEffect(() => {
    if (onLayersChange) {
      onLayersChange(layers);
    }
  }, [layers, onLayersChange]);

  // Reset selection if the selected layer no longer exists
  useEffect(() => {
    if (selectedLayerId && !layers.find((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(null);
    }
  }, [layers, selectedLayerId]);
  
  // Cleanup orphaned layers function (called manually or after delete operations)
  // Defined after all useEffect hooks to maintain consistent hook order
  const cleanupOrphanedLayers = useCallback(() => {
    if (!fabricCanvas) return false;
    
    let cleaned = false;
    
    // Use functional update to avoid dependency on layers
    setLayers(prev => {
      const canvasObjectIds = new Set(
        fabricCanvas.getObjects().map((o: any) => o.layerId).filter(Boolean)
      );
      
      // Find layers that exist in state but not on canvas
      const orphanedLayers = prev.filter(l => !canvasObjectIds.has(l.id));
      
      if (orphanedLayers.length > 0) {
        console.log('Cleaning up orphaned layers:', orphanedLayers.map(l => l.name));
        cleaned = true;
      }
      
      // Also remove canvas objects without layer entries
      const validLayerIds = new Set(prev.map(l => l.id));
      const canvasObjectsWithoutLayers = fabricCanvas.getObjects().filter(
        (o: any) => o.layerId && !validLayerIds.has(o.layerId)
      );
      
      if (canvasObjectsWithoutLayers.length > 0) {
        canvasObjectsWithoutLayers.forEach((obj: any) => {
          fabricCanvas.remove(obj);
        });
        fabricCanvas.renderAll();
        console.log('Removed canvas objects without layer entries:', canvasObjectsWithoutLayers.length);
        cleaned = true;
      }
      
      // Return filtered layers (remove orphaned ones)
      return prev.filter(l => canvasObjectIds.has(l.id));
    });
    
    return cleaned;
  }, [fabricCanvas]);

  // Save history state
  const saveHistory = useCallback(() => {
    if (!fabricCanvas) return;
    
    const canvasState = JSON.stringify((fabricCanvas as any).toJSON(serializationProps));
    const newState: HistoryState = {
      layers: [...layers],
      canvasState,
    };
    
    // Remove any future history if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newState);
    historyIndexRef.current = historyRef.current.length - 1;
    
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    
    // Update undo/redo state
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [fabricCanvas, layers]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Dispose existing canvas if any
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: '#0a0a0b',
      selection: true,
      preserveObjectStacking: true,
    });

    // Override canvas _drawObject to apply blend modes for text objects
    const originalDrawObject = (canvas as any)._drawObject?.bind(canvas);
    if (originalDrawObject) {
      (canvas as any)._drawObject = function(ctx: CanvasRenderingContext2D, object: any) {
        if (object.type === 'text' && (object as any).blendMode && (object as any).blendMode !== 'normal') {
          const blendMode = (object as any).blendMode;
          const compositeOp = blendModeMap[blendMode] || 'source-over';
          ctx.save();
          ctx.globalCompositeOperation = compositeOp;
          originalDrawObject(ctx, object);
          ctx.restore();
        } else {
          originalDrawObject(ctx, object);
        }
      };
    }
    
    // Also override renderAll to ensure blend mode render overrides are applied
    const originalRenderAll = canvas.renderAll.bind(canvas);
    canvas.renderAll = function() {
      // Ensure all text objects have blend mode render override applied
      const objects = this.getObjects();
      objects.forEach((obj: any) => {
        if (obj.type === 'text' && obj.blendMode) {
          // Always re-apply the render override to ensure it's current
          if (!(obj as any)._blendModeOriginalRender) {
            const originalRender = obj._render.bind(obj);
            (obj as any)._blendModeOriginalRender = originalRender;
            obj._render = function(ctx: CanvasRenderingContext2D, noTransform?: boolean) {
              const currentBlendMode = (this as any).blendMode || 'normal';
              const compositeOp = blendModeMap[currentBlendMode] || 'source-over';
              ctx.save();
              ctx.globalCompositeOperation = compositeOp;
              originalRender(ctx, noTransform);
              ctx.restore();
            };
          }
        }
      });
      return originalRenderAll();
    };

    fabricCanvasRef.current = canvas;
    setFabricCanvas(canvas);

    // Load layers if they exist
    if (initialLayers && initialLayers.length > 0) {
      // This would need to restore objects from layer data
      // For now, we'll just set the layers state
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
        setFabricCanvas(null);
      }
    };
  }, [canvasSize.width, canvasSize.height]);

  // Sync selected layer with fabric selection events
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = (event: any) => {
      const selected = event?.selected?.[0];
      const layerId = selected?.layerId as string | undefined;
      if (layerId) {
        setSelectedLayerId(layerId);
      }
    };

    const handleSelectionCleared = () => {
      setSelectedLayerId(null);
    };

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleSelectionCleared);

    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [fabricCanvas]);

  // Add image to canvas
  const addImage = useCallback(async (imageUrl: string) => {
    if (!fabricCanvas) return;

    try {
      saveHistory();
      const img = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
      
      // Scale image to fit canvas
      const scaleX = canvasSize.width / (img.width || 1);
      const scaleY = canvasSize.height / (img.height || 1);
      const scale = Math.max(scaleX, scaleY);
      
      img.scale(scale);
      img.set({
        left: canvasSize.width / 2,
        top: canvasSize.height / 2,
        originX: 'center',
        originY: 'center',
      });

      layerCountRef.current += 1;
      const layerId = `image-${layerCountRef.current}`;
      (img as any).layerId = layerId;

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();

      setLayers(prev => [
        { id: layerId, type: 'image', name: `Image ${layerCountRef.current}`, visible: true, locked: false },
        ...prev,
      ]);
      setSelectedLayerId(layerId);
      toast.success('Image added successfully');
    } catch (error) {
      console.error('Failed to load image:', error);
      toast.error('Failed to load image');
    }
  }, [fabricCanvas, canvasSize, saveHistory]);

  // Add video to canvas
  const addVideo = useCallback(async (videoUrl: string) => {
    if (!fabricCanvas) return;

    try {
      saveHistory();
      // For now, treat video as image placeholder
      // In a full implementation, you'd use FabricVideo or similar
      const img = await FabricImage.fromURL(videoUrl, { crossOrigin: 'anonymous' });
      
      const scaleX = canvasSize.width / (img.width || 1);
      const scaleY = canvasSize.height / (img.height || 1);
      const scale = Math.max(scaleX, scaleY);
      
      img.scale(scale);
      img.set({
        left: canvasSize.width / 2,
        top: canvasSize.height / 2,
        originX: 'center',
        originY: 'center',
      });

      layerCountRef.current += 1;
      const layerId = `video-${layerCountRef.current}`;
      (img as any).layerId = layerId;

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();

      setLayers(prev => [
        { id: layerId, type: 'video', name: `Video ${layerCountRef.current}`, visible: true, locked: false },
        ...prev,
      ]);
      setSelectedLayerId(layerId);
      toast.success('Video added successfully');
    } catch (error) {
      console.error('Failed to load video:', error);
      toast.error('Failed to load video');
    }
  }, [fabricCanvas, canvasSize, saveHistory]);


  // Remove background from image
  const removeBackgroundFromImage = useCallback(async (layerId: string) => {
    if (!fabricCanvas) return;

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId) as FabricImage;
    if (!obj || obj.type !== 'image') {
      toast.error('Please select an image layer');
      return;
    }

    try {
      saveHistory();
      toast.info('Removing background...');
      
      // Get image data URL
      const dataUrl = obj.toDataURL({ format: 'png', quality: 1 });
      
      // Convert to blob for API
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: 'image/png' });

      // Call background removal API
      const result = await removeBackground({ imageFile: file });
      
      // Load the processed image
      const processedImg = await FabricImage.fromURL(result.imageDataUrl, { crossOrigin: 'anonymous' });
      
      // Preserve position and scale
      processedImg.set({
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        originX: obj.originX,
        originY: obj.originY,
        angle: obj.angle,
      });
      (processedImg as any).layerId = layerId;

      // Replace the object
      const index = fabricCanvas.getObjects().indexOf(obj);
      fabricCanvas.remove(obj);
      fabricCanvas.insertAt(index, processedImg);
      fabricCanvas.setActiveObject(processedImg);
      fabricCanvas.renderAll();

      toast.success('Background removed successfully');
    } catch (error) {
      console.error('Background removal failed:', error);
      toast.error('Failed to remove background');
    }
  }, [fabricCanvas, saveHistory]);

  // Add text to canvas
  const addText = useCallback((options: {
    text: string;
    fontFamily: FontFamily;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    blendMode: BlendMode;
  }) => {
    if (!fabricCanvas) return;

    saveHistory();
    
    const text = new FabricText(options.text, {
      left: canvasSize.width / 2,
      top: canvasSize.height / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: options.fontFamily === 'Instrument Serif' ? 'Instrument Serif' : 'Inter',
      fontSize: options.fontSize,
      fontWeight: options.fontWeight,
      fontStyle: options.fontStyle,
      fill: options.color,
      textAlign: 'center',
    });

    // Store blend mode as custom property for retrieval
    (text as any).blendMode = options.blendMode;
    
    // Apply blend mode render override
    applyBlendModeRender(text, options.blendMode);

    layerCountRef.current += 1;
    const layerId = `text-${layerCountRef.current}`;
    (text as any).layerId = layerId;

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();

    setLayers(prev => [
      { id: layerId, type: 'text', name: `Text ${layerCountRef.current}`, visible: true, locked: false },
      ...prev,
    ]);
    setSelectedLayerId(layerId);
    toast.success('Text added');
  }, [fabricCanvas, canvasSize, saveHistory]);

  // Update text layer
  const updateTextLayer = useCallback((layerId: string, updates: Partial<TextStyle> & { text?: string }) => {
    if (!fabricCanvas) return;

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId) as FabricText;
    if (!obj || obj.type !== 'text') return;

    saveHistory();
    
    if (updates.text !== undefined) obj.set('text', updates.text);
    if (updates.fontFamily !== undefined) {
      obj.set('fontFamily', updates.fontFamily === 'Instrument Serif' ? 'Instrument Serif' : 'Inter');
    }
    if (updates.fontSize !== undefined) obj.set('fontSize', updates.fontSize);
    if (updates.fontWeight !== undefined) obj.set('fontWeight', updates.fontWeight);
    if (updates.fontStyle !== undefined) obj.set('fontStyle', updates.fontStyle);
    if (updates.color !== undefined) obj.set('fill', updates.color);
    if (updates.blendMode !== undefined) {
      (obj as any).blendMode = updates.blendMode;
      // Re-apply blend mode render override to ensure it's current
      if ((obj as any)._blendModeOriginalRender) {
        // Reset and re-apply
        obj._render = (obj as any)._blendModeOriginalRender;
        delete (obj as any)._blendModeOriginalRender;
      }
      applyBlendModeRender(obj, updates.blendMode);
    }

    fabricCanvas.renderAll();
    toast.success('Text updated');
  }, [fabricCanvas, saveHistory]);

  // Get selected text properties
  const getSelectedTextProperties = useCallback((): (TextStyle & { text: string }) | null => {
    if (!fabricCanvas || !selectedLayerId) return null;

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === selectedLayerId) as FabricText;
    if (!obj || obj.type !== 'text') return null;

    // Retrieve blend mode from custom property, default to 'normal'
    const blendMode = (obj as any).blendMode || 'normal';

    return {
      text: obj.text || '',
      fontFamily: (obj.fontFamily === 'Instrument Serif' ? 'Instrument Serif' : 'Inter') as FontFamily,
      fontSize: obj.fontSize || 24,
      fontWeight: typeof obj.fontWeight === 'string' ? parseInt(obj.fontWeight) || 400 : (obj.fontWeight || 400),
      fontStyle: (obj.fontStyle as 'normal' | 'italic') || 'normal',
      color: (obj.fill as string) || '#000000',
      blendMode: blendMode as BlendMode,
      letterSpacing: 0,
      lineHeight: 1.2,
    };
  }, [fabricCanvas, selectedLayerId]);

  // Apply LUT/color grading effect
  const applyColorGrade = useCallback((lut: LutPreset, intensity: number, layerId?: string) => {
    if (!fabricCanvas) return;

    setActiveLut(lut);
    setLutIntensity(intensity);

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    // Apply filters to image objects
    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const img = obj as FabricImage;
        img.filters = [];

        const i = intensity / 100;

        switch (lut) {
          case 'turquoise':
            // Cyan/teal color shift
            img.filters.push(
              new (util as any).filters.HueRotation({ rotation: -0.1 * i }),
              new (util as any).filters.Saturation({ saturation: 0.2 * i }),
            );
            break;
          case 'gold':
            // Warm golden tones
            img.filters.push(
              new (util as any).filters.HueRotation({ rotation: 0.05 * i }),
              new (util as any).filters.Saturation({ saturation: 0.15 * i }),
            );
            break;
          case 'silver':
            // Desaturated cool tones
            img.filters.push(
              new (util as any).filters.Saturation({ saturation: -0.3 * i }),
              new (util as any).filters.Brightness({ brightness: 0.05 * i }),
            );
            break;
        }

        img.applyFilters();
      }
    });

    fabricCanvas.renderAll();
    toast.success(`Applied ${lut} color grade`);
  }, [fabricCanvas]);

  // Select layer
  const selectLayer = useCallback((layerId: string) => {
    if (!fabricCanvas) return;

    setSelectedLayerId(layerId);
    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId);
    if (obj) {
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId: string) => {
    if (!fabricCanvas) return;

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId);
    if (obj) {
      obj.visible = !obj.visible;
      fabricCanvas.renderAll();
      setLayers(prev =>
        prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
      );
    }
  }, [fabricCanvas]);

  // Toggle layer lock
  const toggleLayerLock = useCallback((layerId: string) => {
    if (!fabricCanvas) return;

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId);
    if (obj) {
      obj.selectable = !obj.selectable;
      obj.evented = !obj.evented;
      fabricCanvas.renderAll();
      setLayers(prev =>
        prev.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l)
      );
    }
  }, [fabricCanvas]);

  // Delete layer
  const deleteLayer = useCallback((layerId: string) => {
    if (!fabricCanvas) return;

    saveHistory();
    
    // Find and remove all objects with this layerId (in case of duplicates)
    const objectsToRemove = fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId);
    
    if (objectsToRemove.length > 0) {
      objectsToRemove.forEach(obj => {
        fabricCanvas.remove(obj);
      });
      fabricCanvas.discardActiveObject(); // Clear selection if this was selected
      fabricCanvas.renderAll();
    }
    
    // Always remove from layers state, even if object wasn't found (cleanup orphaned layers)
    setLayers(prev => prev.filter(l => l.id !== layerId));
    
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    
    // Cleanup any other orphaned layers after deletion
    setTimeout(() => {
      cleanupOrphanedLayers();
    }, 50);
    
    if (objectsToRemove.length > 0) {
      toast.success('Layer deleted');
    } else {
      toast.info('Layer removed from list (object not found on canvas)');
    }
  }, [fabricCanvas, selectedLayerId, saveHistory, cleanupOrphanedLayers]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.1));
  }, []);

  // Export canvas
  const exportCanvas = useCallback((multiplier: number = 1): string | null => {
    if (!fabricCanvas) return null;

    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier,
    });

    return dataUrl;
  }, [fabricCanvas]);

  // Export canvas as download
  const exportCanvasAsDownload = useCallback((filename: string, multiplier: number = 1) => {
    if (!fabricCanvas) return;

    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    toast.success('Image exported successfully!');
  }, [fabricCanvas]);

  // Export canvas as video (placeholder - would need video rendering library)
  const exportCanvasAsVideo = useCallback(async (filename: string, duration: number = 5000, fps: number = 30): Promise<void> => {
    if (!fabricCanvas) return;

    toast.info('Video export is not yet implemented. Exporting as image instead.');
    exportCanvasAsDownload(filename.replace('.mp4', '.png'), 2);
  }, [fabricCanvas, exportCanvasAsDownload]);

  // Undo
  const undo = useCallback(() => {
    if (!fabricCanvas || historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    
    if (state) {
      fabricCanvas.loadFromJSON(state.canvasState, () => {
        fabricCanvas.renderAll();
        setLayers(state.layers);
      });
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [fabricCanvas]);

  // Redo
  const redo = useCallback(() => {
    if (!fabricCanvas || historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    
    if (state) {
      fabricCanvas.loadFromJSON(state.canvasState, () => {
        fabricCanvas.renderAll();
        setLayers(state.layers);
      });
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [fabricCanvas]);

  return {
    canvasRef,
    fabricCanvas,
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
    applyColorGrade,
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
    setLayers,
  };
}
