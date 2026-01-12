import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, FabricText, util } from 'fabric';
import { CanvasSize, Layer, LutPreset, BlendMode, FontFamily } from '@/types/carousel';
import { toast } from 'sonner';

interface UseCarvasEditorProps {
  canvasSize: CanvasSize;
}

export function useCarvasEditor({ canvasSize }: UseCarvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [activeLut, setActiveLut] = useState<LutPreset | null>(null);
  const [lutIntensity, setLutIntensity] = useState(75);
  const layerCountRef = useRef(0);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: '#0a0a0b',
      selection: true,
      preserveObjectStacking: true,
    });

    canvas.setZoom(zoom);
    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update canvas size
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setDimensions({
      width: canvasSize.width,
      height: canvasSize.height,
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas, canvasSize]);

  // Add image to canvas
  const addImage = useCallback(async (imageUrl: string) => {
    if (!fabricCanvas) return;

    try {
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
  }, [fabricCanvas, canvasSize]);

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
  }, [fabricCanvas, canvasSize]);

  // Apply LUT/color grading effect
  const applyColorGrade = useCallback((lut: LutPreset, intensity: number) => {
    if (!fabricCanvas) return;

    setActiveLut(lut);
    setLutIntensity(intensity);

    // Apply filters to all image objects
    fabricCanvas.getObjects().forEach((obj) => {
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

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId);
    if (obj) {
      fabricCanvas.remove(obj);
      fabricCanvas.renderAll();
      setLayers(prev => prev.filter(l => l.id !== layerId));
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null);
      }
      toast.success('Layer deleted');
    }
  }, [fabricCanvas, selectedLayerId]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.1));
  }, []);

  // Export canvas
  const exportCanvas = useCallback(() => {
    if (!fabricCanvas) return;

    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement('a');
    link.download = 'carousel-slide.png';
    link.href = dataUrl;
    link.click();

    toast.success('Image exported successfully!');
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
  };
}
