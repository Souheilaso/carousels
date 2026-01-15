import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CurvePoint, RGBCurves, AdvancedCurves } from '@/types/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CurveEditorProps {
  curves: RGBCurves;
  onChange: (curves: RGBCurves) => void;
  advancedCurves?: AdvancedCurves;
  onAdvancedCurvesChange?: (curves: AdvancedCurves) => void;
}

type CurveChannel = 'master' | 'red' | 'green' | 'blue';
type AdvancedCurveType = 'hueVsHue' | 'hueVsSat' | 'hueVsLum' | 'lumVsSat' | 'satVsSat';

export function CurveEditor({ curves, onChange, advancedCurves, onAdvancedCurvesChange }: CurveEditorProps) {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('master');
  const [activeAdvancedType, setActiveAdvancedType] = useState<AdvancedCurveType>('hueVsHue');
  const [curveMode, setCurveMode] = useState<'rgb' | 'advanced'>('rgb');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);

  // Use curves directly - the issue is likely with Tabs state management, not curves
  const stableCurves = curves;
  const stableAdvancedCurves = advancedCurves || {
    hueVsHue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    hueVsSat: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    hueVsLum: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    lumVsSat: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    satVsSat: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  };
  
  // Ensure activeChannel is always valid
  const validActiveChannel = activeChannel || 'master';

  const currentCurve = curveMode === 'rgb' 
    ? (stableCurves[validActiveChannel] || [])
    : (stableAdvancedCurves[activeAdvancedType] || []);

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const pos = padding + (i / 10) * (width - padding * 2);
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, height - padding);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(padding, padding + (i / 10) * (height - padding * 2));
      ctx.lineTo(width - padding, padding + (i / 10) * (height - padding * 2));
      ctx.stroke();
    }

    // Draw diagonal line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, padding);
    ctx.stroke();

      // Draw curve
      if (currentCurve.length > 0) {
        const sortedPoints = [...currentCurve].sort((a, b) => a.x - b.x);
        const colorMap: Record<CurveChannel | AdvancedCurveType, string> = {
          master: '#ffffff',
          red: '#ff4444',
          green: '#44ff44',
          blue: '#4444ff',
          hueVsHue: '#ff00ff',
          hueVsSat: '#ffff00',
          hueVsLum: '#00ffff',
          lumVsSat: '#00ff00',
          satVsSat: '#ff8800',
        };

        const activeKey = curveMode === 'rgb' ? validActiveChannel : activeAdvancedType;
        ctx.strokeStyle = colorMap[activeKey] || '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Ensure we have at least start and end points
      let finalPoints = sortedPoints;
      if (sortedPoints.length === 0) {
        finalPoints = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      } else if (sortedPoints.length === 1) {
        if (sortedPoints[0].x < 0.5) {
          finalPoints = [...sortedPoints, { x: 1, y: sortedPoints[0].y }];
        } else {
          finalPoints = [{ x: 0, y: sortedPoints[0].y }, ...sortedPoints];
        }
      }

      // Ensure endpoints exist
      if (finalPoints[0].x > 0.001) {
        finalPoints = [{ x: 0, y: finalPoints[0].y }, ...finalPoints];
      }
      if (finalPoints[finalPoints.length - 1].x < 0.999) {
        finalPoints = [...finalPoints, { x: 1, y: finalPoints[finalPoints.length - 1].y }];
      }

      // Draw curve with smooth interpolation
      for (let i = 0; i < finalPoints.length; i++) {
        const point = finalPoints[i];
        const x = padding + point.x * (width - padding * 2);
        const y = height - padding - point.y * (height - padding * 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Catmull-Rom spline interpolation for smoother curves
          const prevPoint = sortedPoints[i - 1];
          const prevX = padding + prevPoint.x * (width - padding * 2);
          const prevY = height - padding - prevPoint.y * (height - padding * 2);
          
          // Calculate control points for smooth curve
          let cp1x, cp1y, cp2x, cp2y;
          
          if (i === 1) {
            // First segment: use simple bezier
            cp1x = prevX + (x - prevX) * 0.3;
            cp1y = prevY;
            cp2x = x - (x - prevX) * 0.3;
            cp2y = y;
          } else if (i === sortedPoints.length - 1) {
            // Last segment: use simple bezier
            cp1x = prevX + (x - prevX) * 0.3;
            cp1y = prevY;
            cp2x = x - (x - prevX) * 0.3;
            cp2y = y;
        } else {
          // Middle segments: use Catmull-Rom style control points
          const nextPoint = finalPoints[i + 1];
            const nextX = padding + nextPoint.x * (width - padding * 2);
            const nextY = height - padding - nextPoint.y * (height - padding * 2);
            
            const tension = 0.5;
            cp1x = prevX + (x - (i > 1 ? finalPoints[i - 2].x * (width - padding * 2) + padding : prevX)) * tension;
            cp1y = prevY;
            cp2x = x - (nextX - prevX) * tension;
            cp2y = y;
          }
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        }
      }

      ctx.stroke();

      // Draw points
      finalPoints.forEach((point, index) => {
        const x = padding + point.x * (width - padding * 2);
        const y = height - padding - point.y * (height - padding * 2);

        ctx.fillStyle = colorMap[activeKey] || '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }, [currentCurve, validActiveChannel]);

  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const padding = 20;
    const width = canvas.width;
    const height = canvas.height;

    const normalizedX = Math.max(0, Math.min(1, (x - padding) / (width - padding * 2)));
    const normalizedY = Math.max(0, Math.min(1, 1 - (y - padding) / (height - padding * 2)));

    // Ensure we have at least start and end points
    let sortedPoints = [...currentCurve].sort((a, b) => a.x - b.x);
    if (sortedPoints.length === 0) {
      sortedPoints = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    }

    // Check if clicking near an existing point (excluding endpoints for deletion)
    let foundPoint = false;
    let pointIndex = -1;

    for (let i = 0; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      const px = padding + point.x * (width - padding * 2);
      const py = height - padding - point.y * (height - padding * 2);
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

      if (distance < 10) {
        // Don't allow dragging endpoints (they're locked)
        if (point.x <= 0.001 || point.x >= 0.999) {
          // Can still drag endpoints, just don't delete them
          setDraggedPointIndex(i);
          setIsDragging(true);
          foundPoint = true;
          break;
        }
        // Check for right-click or double-click to delete (middle points only)
        if (e.button === 2 || e.detail === 2) {
          // Remove point
          sortedPoints.splice(i, 1);
          if (curveMode === 'rgb') {
            onChange({ ...stableCurves, [validActiveChannel]: sortedPoints });
          } else if (onAdvancedCurvesChange) {
            onAdvancedCurvesChange({ ...stableAdvancedCurves, [activeAdvancedType]: sortedPoints });
          }
          return;
        }
        setDraggedPointIndex(i);
        setIsDragging(true);
        foundPoint = true;
        break;
      }
    }

    if (!foundPoint) {
      // Add new point (but not at exact endpoints)
      if (normalizedX > 0.01 && normalizedX < 0.99) {
        const newPoint: CurvePoint = { x: normalizedX, y: normalizedY };
        sortedPoints.push(newPoint);
        sortedPoints.sort((a, b) => a.x - b.x);
        const newIndex = sortedPoints.findIndex(p => Math.abs(p.x - normalizedX) < 0.01);
        if (curveMode === 'rgb') {
          onChange({ ...stableCurves, [validActiveChannel]: sortedPoints });
        } else if (onAdvancedCurvesChange) {
          onAdvancedCurvesChange({ ...stableAdvancedCurves, [activeAdvancedType]: sortedPoints });
        }
        setDraggedPointIndex(newIndex);
        setIsDragging(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || draggedPointIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const padding = 20;
    const width = canvas.width;
    const height = canvas.height;

    let normalizedX = Math.max(0, Math.min(1, (x - padding) / (width - padding * 2)));
    let normalizedY = Math.max(0, Math.min(1, 1 - (y - padding) / (height - padding * 2)));

    let sortedPoints = [...currentCurve].sort((a, b) => a.x - b.x);
    
    // Lock endpoints to edges
    const isEndpoint = sortedPoints[draggedPointIndex].x <= 0.001 || sortedPoints[draggedPointIndex].x >= 0.999;
    if (isEndpoint) {
      if (sortedPoints[draggedPointIndex].x <= 0.001) {
        normalizedX = 0;
      } else {
        normalizedX = 1;
      }
    } else {
      // Prevent middle points from going to edges
      normalizedX = Math.max(0.01, Math.min(0.99, normalizedX));
    }

    // Update the point
    sortedPoints[draggedPointIndex] = { x: normalizedX, y: normalizedY };
    
    // Re-sort in case the point moved past others
    sortedPoints.sort((a, b) => a.x - b.x);
    
    // Find the new index after sorting
    const newIndex = sortedPoints.findIndex(p => Math.abs(p.x - normalizedX) < 0.001);
    setDraggedPointIndex(newIndex >= 0 ? newIndex : draggedPointIndex);

    // Ensure endpoints exist
    if (sortedPoints[0].x > 0.001) {
      sortedPoints.unshift({ x: 0, y: sortedPoints[0].y });
      setDraggedPointIndex((newIndex >= 0 ? newIndex : draggedPointIndex) + 1);
    }
    if (sortedPoints[sortedPoints.length - 1].x < 0.999) {
      sortedPoints.push({ x: 1, y: sortedPoints[sortedPoints.length - 1].y });
    }

    if (curveMode === 'rgb') {
      onChange({ ...stableCurves, [validActiveChannel]: sortedPoints });
    } else if (onAdvancedCurvesChange) {
      onAdvancedCurvesChange({ ...stableAdvancedCurves, [activeAdvancedType]: sortedPoints });
    }
  };

  const handleReset = () => {
    const resetCurve = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    if (curveMode === 'rgb') {
      onChange({ ...stableCurves, [validActiveChannel]: resetCurve });
    } else if (onAdvancedCurvesChange) {
      onAdvancedCurvesChange({ ...stableAdvancedCurves, [activeAdvancedType]: resetCurve });
    }
  };
  
  return (
    <div className="space-y-3">
      <Tabs 
        value={curveMode} 
        onValueChange={(v) => {
          if (v === 'rgb' || v === 'advanced') {
            setCurveMode(v);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2 mb-3">
          <TabsTrigger value="rgb" className="text-xs">RGB Curves</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
        </TabsList>
      </Tabs>

      {curveMode === 'rgb' ? (
        <Tabs 
          value={validActiveChannel} 
          onValueChange={(v) => {
            if (v && (v === 'master' || v === 'red' || v === 'green' || v === 'blue')) {
              setActiveChannel(v as CurveChannel);
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="master" className="text-xs">Master</TabsTrigger>
            <TabsTrigger value="red" className="text-xs">Red</TabsTrigger>
            <TabsTrigger value="green" className="text-xs">Green</TabsTrigger>
            <TabsTrigger value="blue" className="text-xs">Blue</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : (
        <Tabs 
          value={activeAdvancedType} 
          onValueChange={(v) => {
            if (v && ['hueVsHue', 'hueVsSat', 'hueVsLum', 'lumVsSat', 'satVsSat'].includes(v)) {
              setActiveAdvancedType(v as AdvancedCurveType);
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="hueVsHue" className="text-[10px] px-1">H vs H</TabsTrigger>
            <TabsTrigger value="hueVsSat" className="text-[10px] px-1">H vs S</TabsTrigger>
            <TabsTrigger value="hueVsLum" className="text-[10px] px-1">H vs L</TabsTrigger>
            <TabsTrigger value="lumVsSat" className="text-[10px] px-1">L vs S</TabsTrigger>
            <TabsTrigger value="satVsSat" className="text-[10px] px-1">S vs S</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          style={{ width: '100%', height: 'auto', maxHeight: '200px' }}
          className="border border-border rounded cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => {
            setIsDragging(false);
            setDraggedPointIndex(null);
          }}
          onMouseLeave={() => {
            setIsDragging(false);
            setDraggedPointIndex(null);
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handleReset}
          className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
        >
          Reset
        </button>
        <span className="text-xs text-muted-foreground">
          {curveMode === 'rgb' 
            ? 'Click to add point, drag to adjust'
            : `${activeAdvancedType.replace(/([A-Z])/g, ' $1').trim()} curve`}
        </span>
      </div>
    </div>
  );
}

