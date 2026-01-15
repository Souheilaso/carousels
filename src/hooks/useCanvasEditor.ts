import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, FabricText, util, filters } from 'fabric';
import { CanvasSize, Layer, LutPreset, BlendMode, FontFamily, TextStyle, ManualAdjustments, ColorWheel, RGBCurves, HSLAdjustments, AdvancedAdjustments, RGBMixer, AdvancedColorGrade, CurvePoint, PrimaryAdjustments, PrimaryBars, AdvancedCurves } from '../types/carousel';
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

    // Enable high-quality image smoothing for better image quality
    const ctx = canvas.getContext();
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

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
    // and high-quality image smoothing is always enabled
    const originalRenderAll = canvas.renderAll.bind(canvas);
    canvas.renderAll = function() {
      // Ensure high-quality image smoothing is enabled before rendering
      const ctx = this.getContext();
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      
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

  // Helper function to apply all filters to an image based on layer data
  // Defined early so it can be used in other callbacks and effects
  const applyAllFiltersToImage = useCallback((img: FabricImage, layer: Layer) => {
    img.filters = [];

    // 1. Apply manual adjustments
    if (layer.manualAdjustments) {
      const adj = layer.manualAdjustments;
      if (adj.exposure !== 0) {
        img.filters.push(new filters.Brightness({ brightness: adj.exposure / 100 }));
      }
      if (adj.contrast !== 0) {
        img.filters.push(new filters.Contrast({ contrast: adj.contrast / 100 }));
      }
      if (adj.saturation !== 0) {
        img.filters.push(new filters.Saturation({ saturation: adj.saturation / 100 }));
      }
      if (adj.temperature !== 0) {
        img.filters.push(new filters.HueRotation({ rotation: (adj.temperature / 100) * 0.1 }));
      }
    }

    // 2. Apply advanced color grade
    if (layer.advancedColorGrade) {
      const adv = layer.advancedColorGrade;

      // Color wheels (lift/gamma/gain/offset)
      if (adv.colorWheels) {
        const cw = adv.colorWheels;
        // Apply lift (shadows) - affects darker areas
        if (cw.lift.r !== 0 || cw.lift.g !== 0 || cw.lift.b !== 0) {
          // Lift adds color to shadows, implemented as offset
          const liftMatrix = [
            1, 0, 0, 0, cw.lift.r / 200,
            0, 1, 0, 0, cw.lift.g / 200,
            0, 0, 1, 0, cw.lift.b / 200,
            0, 0, 0, 1, 0
          ];
          img.filters.push(new filters.ColorMatrix({ matrix: liftMatrix }));
        }
        // Apply gamma (midtones) - affects middle tones
        if (cw.gamma.r !== 0 || cw.gamma.g !== 0 || cw.gamma.b !== 0) {
          // Gamma adjusts midtones via power curve approximation
          const gammaR = 1 + cw.gamma.r / 300;
          const gammaG = 1 + cw.gamma.g / 300;
          const gammaB = 1 + cw.gamma.b / 300;
          // Use a combination of brightness and color matrix for gamma-like effect
          const gammaMatrix = [
            gammaR, 0, 0, 0, 0,
            0, gammaG, 0, 0, 0,
            0, 0, gammaB, 0, 0,
            0, 0, 0, 1, 0
          ];
          img.filters.push(new filters.ColorMatrix({ matrix: gammaMatrix }));
        }
        // Apply gain (highlights) - affects brighter areas
        if (cw.gain.r !== 0 || cw.gain.g !== 0 || cw.gain.b !== 0) {
          // Gain multiplies highlights
          const gainMatrix = [
            1 + cw.gain.r / 200, 0, 0, 0, 0,
            0, 1 + cw.gain.g / 200, 0, 0, 0,
            0, 0, 1 + cw.gain.b / 200, 0, 0,
            0, 0, 0, 1, 0
          ];
          img.filters.push(new filters.ColorMatrix({ matrix: gainMatrix }));
        }
        // Apply offset (overall shift)
        if (cw.offset && (cw.offset.r !== 0 || cw.offset.g !== 0 || cw.offset.b !== 0)) {
          const offsetMatrix = [
            1, 0, 0, 0, cw.offset.r / 200,
            0, 1, 0, 0, cw.offset.g / 200,
            0, 0, 1, 0, cw.offset.b / 200,
            0, 0, 0, 1, 0
          ];
          img.filters.push(new filters.ColorMatrix({ matrix: offsetMatrix }));
        }
      }

      // Primary adjustments (contrast, pivot, saturation, hue, etc.)
      if (adv.primaryAdjustments) {
        const pa = adv.primaryAdjustments;
        if (pa.contrast !== 0) {
          img.filters.push(new filters.Contrast({ contrast: pa.contrast / 100 }));
        }
        if (pa.pivot !== 0) {
          img.filters.push(new filters.Brightness({ brightness: pa.pivot / 250 }));
        }
        if (pa.saturation !== 0) {
          img.filters.push(new filters.Saturation({ saturation: pa.saturation / 100 }));
        }
        if (pa.hue !== 0) {
          img.filters.push(new filters.HueRotation({ rotation: (pa.hue / 100) * 0.12 }));
        }
        if (pa.temperature !== 0) {
          img.filters.push(new filters.HueRotation({ rotation: (pa.temperature / 100) * 0.1 }));
        }
        if (pa.tint !== 0) {
          img.filters.push(new filters.HueRotation({ rotation: (pa.tint / 100) * 0.08 }));
        }
        if (pa.colorBoost !== 0) {
          img.filters.push(new filters.Saturation({ saturation: (pa.colorBoost / 100) * 0.8 }));
        }
        if (pa.shadowLift !== 0) {
          img.filters.push(new filters.Brightness({ brightness: pa.shadowLift / 300 }));
        }
        if (pa.highlightGain !== 0) {
          img.filters.push(new filters.Brightness({ brightness: pa.highlightGain / 300 }));
        }
        if (pa.midtoneDetail !== 0 && filters.Convolute) {
          const amount = Math.min(1, Math.abs(pa.midtoneDetail) / 100) * 0.5;
          if (pa.midtoneDetail > 0) {
            const sharpenKernel = [
              0, -amount, 0,
              -amount, 1 + amount * 4, -amount,
              0, -amount, 0
            ];
            img.filters.push(new filters.Convolute({ matrix: sharpenKernel }));
          } else {
            const blur = amount / 2;
            const blurKernel = [
              blur, blur, blur,
              blur, 1 - blur * 8, blur,
              blur, blur, blur
            ];
            img.filters.push(new filters.Convolute({ matrix: blurKernel }));
          }
        }
      }

      // Primary bars (RGB channel ranges)
      if (adv.primaryBars) {
        const pb = adv.primaryBars;
        const redGain = 1 + (pb.gain.r + pb.gamma.r / 2) / 200;
        const greenGain = 1 + (pb.gain.g + pb.gamma.g / 2) / 200;
        const blueGain = 1 + (pb.gain.b + pb.gamma.b / 2) / 200;
        const redOffset = (pb.lift.r + pb.offset.r) / 200;
        const greenOffset = (pb.lift.g + pb.offset.g) / 200;
        const blueOffset = (pb.lift.b + pb.offset.b) / 200;
        const barsMatrix = [
          redGain, 0, 0, 0, redOffset,
          0, greenGain, 0, 0, greenOffset,
          0, 0, blueGain, 0, blueOffset,
          0, 0, 0, 1, 0
        ];
        img.filters.push(new filters.ColorMatrix({ matrix: barsMatrix }));
      }

      // Advanced adjustments
      if (adv.advancedAdjustments) {
        const aa = adv.advancedAdjustments;
        if (aa.vibrance !== 0) {
          img.filters.push(new filters.Saturation({ saturation: aa.vibrance / 100 * 0.7 }));
        }
        if (aa.highlights !== 0) {
          img.filters.push(new filters.Brightness({ brightness: aa.highlights / 200 }));
        }
        if (aa.shadows !== 0) {
          img.filters.push(new filters.Brightness({ brightness: aa.shadows / 200 }));
        }
        if (aa.whites !== 0) {
          img.filters.push(new filters.Brightness({ brightness: aa.whites / 300 }));
        }
        if (aa.blacks !== 0) {
          img.filters.push(new filters.Brightness({ brightness: aa.blacks / 300 }));
        }
        if (aa.tint !== 0) {
          img.filters.push(new filters.HueRotation({ rotation: (aa.tint / 100) * 0.05 }));
        }
      }

      // HSL adjustments per channel - apply as selective color adjustments
      if (adv.hslAdjustments) {
        const hsl = adv.hslAdjustments;
        // Apply each color range adjustment
        // This is a simplified implementation - a full implementation would use
        // color range masking, but we'll approximate with weighted adjustments
        const channels = [
          { ...hsl.reds, weight: 0.2 },
          { ...hsl.yellows, weight: 0.15 },
          { ...hsl.greens, weight: 0.2 },
          { ...hsl.cyans, weight: 0.15 },
          { ...hsl.blues, weight: 0.2 },
          { ...hsl.magentas, weight: 0.1 },
        ];
        
        // Calculate weighted averages
        let totalHue = 0, totalSat = 0, totalLum = 0, totalWeight = 0;
        channels.forEach(ch => {
          totalHue += ch.hue * ch.weight;
          totalSat += ch.saturation * ch.weight;
          totalLum += ch.luminance * ch.weight;
          totalWeight += ch.weight;
        });
        
        if (totalWeight > 0) {
          const avgHue = totalHue / totalWeight;
          const avgSat = totalSat / totalWeight;
          const avgLum = totalLum / totalWeight;
          
          if (Math.abs(avgHue) > 0.1) {
            img.filters.push(new filters.HueRotation({ rotation: (avgHue / 100) * 0.15 }));
          }
          if (Math.abs(avgSat) > 0.1) {
            img.filters.push(new filters.Saturation({ saturation: avgSat / 100 }));
          }
          if (Math.abs(avgLum) > 0.1) {
            img.filters.push(new filters.Brightness({ brightness: avgLum / 200 }));
          }
        }
      }

      // Advanced curves (Hue vs Hue/Sat/Lum, Lum vs Sat, Sat vs Sat)
      if (adv.advancedCurves) {
        const curves = adv.advancedCurves;
        const evaluateCurve = (points: CurvePoint[], x: number): number => {
          if (points.length === 0) return x;
          if (points.length === 1) return points[0].y;
          const sorted = [...points].sort((a, b) => a.x - b.x);
          x = Math.max(0, Math.min(1, x));
          if (x <= sorted[0].x) return sorted[0].y;
          if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
          for (let i = 0; i < sorted.length - 1; i++) {
            if (x >= sorted[i].x && x <= sorted[i + 1].x) {
              const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
              return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
            }
          }
          return x;
        };
        const averageDelta = (points: CurvePoint[]) => {
          const samples = 8;
          let total = 0;
          for (let i = 0; i < samples; i++) {
            const x = i / (samples - 1);
            total += evaluateCurve(points, x) - x;
          }
          return total / samples;
        };
        const hueDelta = averageDelta(curves.hueVsHue || []);
        const hueSatDelta = averageDelta(curves.hueVsSat || []);
        const hueLumDelta = averageDelta(curves.hueVsLum || []);
        const lumSatDelta = averageDelta(curves.lumVsSat || []);
        const satSatDelta = averageDelta(curves.satVsSat || []);

        if (Math.abs(hueDelta) > 0.01) {
          img.filters.push(new filters.HueRotation({ rotation: hueDelta * 0.5 }));
        }
        const satAdjust = hueSatDelta * 1.2 + lumSatDelta * 1.0 + satSatDelta * 1.1;
        if (Math.abs(satAdjust) > 0.01) {
          img.filters.push(new filters.Saturation({ saturation: satAdjust }));
        }
        if (Math.abs(hueLumDelta) > 0.01) {
          img.filters.push(new filters.Brightness({ brightness: hueLumDelta * 0.5 }));
        }
      }

      // RGB Mixer
      if (adv.rgbMixer) {
        const mixer = adv.rgbMixer;
        const matrix = [
          1 + mixer.redToRed / 200, mixer.greenToRed / 200, mixer.blueToRed / 200, 0, 0,
          mixer.redToGreen / 200, 1 + mixer.greenToGreen / 200, mixer.blueToGreen / 200, 0, 0,
          mixer.redToBlue / 200, mixer.greenToBlue / 200, 1 + mixer.blueToBlue / 200, 0, 0,
          0, 0, 0, 1, 0
        ];
        img.filters.push(new filters.ColorMatrix({ matrix }));
      }

      // Curves - apply RGB curves
      if (adv.curves) {
        const curves = adv.curves;
        
        // Helper function to evaluate curve at a given x value
        const evaluateCurve = (points: CurvePoint[], x: number): number => {
          if (points.length === 0) return x;
          if (points.length === 1) return points[0].y;
          
          // Sort points by x
          const sorted = [...points].sort((a, b) => a.x - b.x);
          
          // Clamp x to valid range
          x = Math.max(0, Math.min(1, x));
          
          // Find surrounding points
          if (x <= sorted[0].x) return sorted[0].y;
          if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
          
          for (let i = 0; i < sorted.length - 1; i++) {
            if (x >= sorted[i].x && x <= sorted[i + 1].x) {
              // Linear interpolation
              const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
              return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
            }
          }
          
          return x;
        };
        
        // Apply master curve as overall brightness/contrast
        if (curves.master && curves.master.length >= 2) {
          // Sample curve at key points
          const midPoint = evaluateCurve(curves.master, 0.5);
          const quarterPoint = evaluateCurve(curves.master, 0.25);
          const threeQuarterPoint = evaluateCurve(curves.master, 0.75);
          
          // Calculate brightness adjustment (midpoint deviation)
          const brightnessAdjust = (midPoint - 0.5) * 0.5;
          if (Math.abs(brightnessAdjust) > 0.01) {
            img.filters.push(new filters.Brightness({ brightness: brightnessAdjust }));
          }
          
          // Calculate contrast adjustment (difference between quarter and three-quarter points)
          const contrastAdjust = ((threeQuarterPoint - quarterPoint) - 0.5) * 0.3;
          if (Math.abs(contrastAdjust) > 0.01) {
            img.filters.push(new filters.Contrast({ contrast: contrastAdjust }));
          }
        }
        
        // Apply RGB channel curves as color matrix adjustments
        const applyChannelCurve = (channel: 'red' | 'green' | 'blue', points: CurvePoint[]) => {
          if (!points || points.length < 2) return 1;
          
          // Sample curve at 0, 0.5, and 1.0
          const black = evaluateCurve(points, 0);
          const mid = evaluateCurve(points, 0.5);
          const white = evaluateCurve(points, 1);
          
          // Calculate channel multiplier (simplified)
          const multiplier = 1 + ((mid - 0.5) * 0.2);
          
          return multiplier;
        };
        
        const redMult = curves.red ? applyChannelCurve('red', curves.red) : 1;
        const greenMult = curves.green ? applyChannelCurve('green', curves.green) : 1;
        const blueMult = curves.blue ? applyChannelCurve('blue', curves.blue) : 1;
        
        if (Math.abs(redMult - 1) > 0.01 || Math.abs(greenMult - 1) > 0.01 || Math.abs(blueMult - 1) > 0.01) {
          const curveMatrix = [
            redMult, 0, 0, 0, 0,
            0, greenMult, 0, 0, 0,
            0, 0, blueMult, 0, 0,
            0, 0, 0, 1, 0
          ];
          img.filters.push(new filters.ColorMatrix({ matrix: curveMatrix }));
        }
      }
    }

    // 3. Apply LUT preset last
    if (layer.lutPreset) {
      const intensity = layer.lutIntensity ?? 75;
      const i = intensity / 100;
      switch (layer.lutPreset) {
        case 'turquoise':
          img.filters.push(
            new filters.HueRotation({ rotation: -0.1 * i }),
            new filters.Saturation({ saturation: 0.2 * i }),
          );
          break;
        case 'gold':
          img.filters.push(
            new filters.HueRotation({ rotation: 0.05 * i }),
            new filters.Saturation({ saturation: 0.15 * i }),
          );
          break;
        case 'silver':
          img.filters.push(
            new filters.Saturation({ saturation: -0.3 * i }),
            new filters.Brightness({ brightness: 0.05 * i }),
          );
          break;
        case 'cinematic':
          img.filters.push(
            new filters.Contrast({ contrast: 0.15 * i }),
            new filters.Saturation({ saturation: 0.1 * i }),
            new filters.HueRotation({ rotation: -0.03 * i }),
          );
          break;
        case 'matte':
          img.filters.push(
            new filters.Contrast({ contrast: -0.2 * i }),
            new filters.Brightness({ brightness: 0.06 * i }),
            new filters.Saturation({ saturation: -0.1 * i }),
          );
          break;
        case 'vibrant':
          img.filters.push(
            new filters.Saturation({ saturation: 0.35 * i }),
            new filters.Contrast({ contrast: 0.15 * i }),
            new filters.Brightness({ brightness: 0.03 * i }),
          );
          break;
        case 'noir':
          img.filters.push(
            new filters.Saturation({ saturation: -1 * i }),
            new filters.Contrast({ contrast: 0.2 * i }),
            new filters.Brightness({ brightness: -0.05 * i }),
          );
          break;
        case 'pastel':
          img.filters.push(
            new filters.Contrast({ contrast: -0.15 * i }),
            new filters.Brightness({ brightness: 0.08 * i }),
            new filters.Saturation({ saturation: -0.05 * i }),
            new filters.HueRotation({ rotation: 0.02 * i }),
          );
          break;
        case 'sunset':
          img.filters.push(
            new filters.HueRotation({ rotation: 0.08 * i }),
            new filters.Saturation({ saturation: 0.15 * i }),
            new filters.Brightness({ brightness: 0.04 * i }),
          );
          break;
      }
    }

    img.applyFilters();
  }, []);

  // Restore color grades when layers are loaded or changed
  useEffect(() => {
    if (!fabricCanvas || !layers.length) return;

    // Restore color grades for each layer
    layers.forEach(layer => {
      if (layer.type === 'image') {
        const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layer.id) as FabricImage;
        if (obj) {
          // Apply all filters based on layer data
          applyAllFiltersToImage(obj, layer);
        }
      }
    });
    
    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

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
      
      // Ensure high-quality image loading - Fabric.js loads images at full quality by default
      const img = await FabricImage.fromURL(imageUrl, { 
        crossOrigin: 'anonymous',
      });
      
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
      
      // Ensure canvas context has high-quality settings before rendering
      const ctx = fabricCanvas.getContext();
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      
      fabricCanvas.renderAll();

      setLayers(prev => [
        { id: layerId, type: 'image', name: `Image ${layerCountRef.current}`, visible: true, locked: false, sourceUrl: imageUrl },
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
        { id: layerId, type: 'video', name: `Video ${layerCountRef.current}`, visible: true, locked: false, sourceUrl: videoUrl },
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

      setLayers(prev => prev.map(layer => (
        layer.id === layerId
          ? { ...layer, sourceUrl: result.imageDataUrl }
          : layer
      )));

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

  // Get selected layer's color grade state
  const getSelectedLayerColorGrade = useCallback((): { 
    lut: LutPreset | null; 
    intensity: number; 
    manualAdjustments?: ManualAdjustments;
    advancedColorGrade?: AdvancedColorGrade;
  } | null => {
    if (!fabricCanvas || !selectedLayerId) return null;

    const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === selectedLayerId);
    if (!obj || obj.type !== 'image') return null;

    const layer = layers.find(l => l.id === selectedLayerId);
    return {
      lut: layer?.lutPreset || (obj as any).lutPreset || null,
      intensity: layer?.lutIntensity ?? (obj as any).lutIntensity ?? 75,
      manualAdjustments: layer?.manualAdjustments,
      advancedColorGrade: layer?.advancedColorGrade,
    };
  }, [fabricCanvas, selectedLayerId, layers]);

  // Apply LUT/color grading effect
  const applyColorGrade = useCallback((lut: LutPreset, intensity: number, layerId?: string) => {
    if (!fabricCanvas) return;

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    // Update layer data with color grade settings
    if (layerId) {
      setLayers(prev => prev.map(layer => {
        if (layer.id === layerId) {
          const updatedLayer = { ...layer, lutPreset: lut, lutIntensity: intensity };
          // Apply filters
          const obj = objectsToProcess.find((o: any) => o.layerId === layerId);
          if (obj && obj.type === 'image') {
            applyAllFiltersToImage(obj as FabricImage, updatedLayer);
          }
          return updatedLayer;
        }
        return layer;
      }));
      setActiveLut(lut);
      setLutIntensity(intensity);
    } else {
      // Apply to all image layers
      setLayers(prev => prev.map(layer => {
        if (layer.type === 'image') {
          const updatedLayer = { ...layer, lutPreset: lut, lutIntensity: intensity };
          // Apply filters
          const obj = objectsToProcess.find((o: any) => o.layerId === layer.id);
          if (obj && obj.type === 'image') {
            applyAllFiltersToImage(obj as FabricImage, updatedLayer);
          }
          return updatedLayer;
        }
        return layer;
      }));
      setActiveLut(lut);
      setLutIntensity(intensity);
    }

    fabricCanvas.renderAll();
    toast.success(`Applied ${lut} color grade`);
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Reset all color grading adjustments for a layer or all image layers
  const resetColorGrade = useCallback((layerId?: string) => {
    if (!fabricCanvas) return;

    const resetLayer = (layer: Layer) => ({
      ...layer,
      lutPreset: null,
      lutIntensity: 75,
      manualAdjustments: undefined,
      advancedColorGrade: undefined,
    });

    if (layerId) {
      setLayers(prev => prev.map(layer => {
        if (layer.id === layerId) {
          const updatedLayer = resetLayer(layer);
          const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId);
          if (obj && obj.type === 'image') {
            applyAllFiltersToImage(obj as FabricImage, updatedLayer);
          }
          return updatedLayer;
        }
        return layer;
      }));
    } else {
      setLayers(prev => prev.map(layer => {
        if (layer.type === 'image') {
          const updatedLayer = resetLayer(layer);
          const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layer.id);
          if (obj && obj.type === 'image') {
            applyAllFiltersToImage(obj as FabricImage, updatedLayer);
          }
          return updatedLayer;
        }
        return layer;
      }));
      setActiveLut(null);
      setLutIntensity(75);
    }

    fabricCanvas.renderAll();
    toast.success('Color grade reset');
  }, [fabricCanvas, applyAllFiltersToImage]);

  // Apply manual adjustments
  const applyManualAdjustment = useCallback((
    adjustment: 'exposure' | 'contrast' | 'saturation' | 'temperature',
    value: number,
    layerId?: string
  ) => {
    if (!fabricCanvas) return;

    // Update layer data first
    const updateLayer = (layer: Layer) => {
      const adjustments = layer.manualAdjustments || { exposure: 0, contrast: 0, saturation: 0, temperature: 0 };
      return {
        ...layer,
        manualAdjustments: { ...adjustments, [adjustment]: value },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer => {
        if (layer.id === layerId) {
          const updatedLayer = updateLayer(layer);
          // Apply filters to the corresponding object
          const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layerId);
          if (obj && obj.type === 'image') {
            applyAllFiltersToImage(obj as FabricImage, updatedLayer);
          }
          return updatedLayer;
        }
        return layer;
      }));
    } else {
      setLayers(prev => prev.map(layer => {
        if (layer.type === 'image') {
          const updatedLayer = updateLayer(layer);
          // Apply filters to the corresponding object
          const obj = fabricCanvas.getObjects().find((o: any) => o.layerId === layer.id);
          if (obj && obj.type === 'image') {
            applyAllFiltersToImage(obj as FabricImage, updatedLayer);
          }
          return updatedLayer;
        }
        return layer;
      }));
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply color wheel adjustment
  const applyColorWheel = useCallback((
    wheel: 'lift' | 'gamma' | 'gain' | 'offset',
    value: { r: number; g: number; b: number },
    layerId?: string
  ) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      const colorWheels = adv.colorWheels || {
        lift: { r: 0, g: 0, b: 0 },
        gamma: { r: 0, g: 0, b: 0 },
        gain: { r: 0, g: 0, b: 0 },
        offset: { r: 0, g: 0, b: 0 },
      };
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          colorWheels: {
            ...colorWheels,
            [wheel]: value,
          },
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer => 
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer => 
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    // Apply filters
    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply curves
  const applyCurves = useCallback((curves: RGBCurves, layerId?: string) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          curves,
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer => 
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer => 
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply primary adjustments
  const applyPrimaryAdjustments = useCallback((adjustments: PrimaryAdjustments, layerId?: string) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          primaryAdjustments: adjustments,
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer =>
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer =>
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply primary bars
  const applyPrimaryBars = useCallback((bars: PrimaryBars, layerId?: string) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          primaryBars: bars,
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer =>
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer =>
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply advanced curves
  const applyAdvancedCurves = useCallback((curves: AdvancedCurves, layerId?: string) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          advancedCurves: curves,
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer =>
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer =>
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply HSL adjustments
  const applyHSL = useCallback((hsl: HSLAdjustments, layerId?: string) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          hslAdjustments: hsl,
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer => 
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer => 
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

  // Apply advanced adjustments
  const applyAdvancedAdjustments = useCallback((advanced: AdvancedAdjustments, layerId?: string) => {
    if (!fabricCanvas) return;

    const updateLayer = (layer: Layer) => {
      const adv = layer.advancedColorGrade || {};
      return {
        ...layer,
        advancedColorGrade: {
          ...adv,
          advancedAdjustments: advanced,
        },
      };
    };

    if (layerId) {
      setLayers(prev => prev.map(layer => 
        layer.id === layerId ? updateLayer(layer) : layer
      ));
    } else {
      setLayers(prev => prev.map(layer => 
        layer.type === 'image' ? updateLayer(layer) : layer
      ));
    }

    const objectsToProcess = layerId
      ? fabricCanvas.getObjects().filter((o: any) => o.layerId === layerId)
      : fabricCanvas.getObjects();

    objectsToProcess.forEach((obj) => {
      if (obj.type === 'image') {
        const objLayerId = (obj as any).layerId;
        const layer = layers.find(l => l.id === objLayerId);
        if (layer) {
          const updatedLayer = layerId === objLayerId ? updateLayer(layer) : layer;
          applyAllFiltersToImage(obj as FabricImage, updatedLayer);
        }
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, layers, applyAllFiltersToImage]);

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
    setLayers,
  };
}
