import { useState, useRef, useEffect } from 'react';

interface ColorWheelProps {
  value: { r: number; g: number; b: number };
  onChange: (value: { r: number; g: number; b: number }) => void;
  label: string;
  masterValue?: number; // Master brightness dial (-100 to 100)
  onMasterChange?: (value: number) => void;
}

// Helper functions
function rgbToHsv(r: number, g: number, b: number) {
  // Normalize RGB from -100..100 to 0..1
  const rNorm = Math.max(0, Math.min(1, (r + 100) / 200));
  const gNorm = Math.max(0, Math.min(1, (g + 100) / 200));
  const bNorm = Math.max(0, Math.min(1, (b + 100) / 200));
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
  }
  h = h * 60;
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s: s * 100, v: v * 100 };
}

function hsvToRgb(h: number, s: number, v: number) {
  s /= 100;
  v /= 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  // Convert back to -100..100 range
  r = (r + m) * 200 - 100;
  g = (g + m) * 200 - 100;
  b = (b + m) * 200 - 100;

  // Clamp to valid range
  r = Math.max(-100, Math.min(100, r));
  g = Math.max(-100, Math.min(100, g));
  b = Math.max(-100, Math.min(100, b));

  return { r, g, b };
}

export function ColorWheel({ value, onChange, label, masterValue, onMasterChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 10;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      
      const hue = angle;
      const saturation = 100;
      const lightness = 50;
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.fill();
    }

    // Draw center circle (brightness overlay)
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.5, 'rgba(128,128,128,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw picker position
    const hsv = rgbToHsv(value.r, value.g, value.b);
    // Convert hue to radians, adjusting so 0° is at top (12 o'clock)
    const pickerAngle = ((hsv.h - 90) * Math.PI / 180);
    // Use saturation for radius (0 = center, 100 = edge)
    const pickerRadius = (hsv.s / 100) * radius;
    const pickerX = center + Math.cos(pickerAngle) * pickerRadius;
    const pickerY = center + Math.sin(pickerAngle) * pickerRadius;

    // Draw crosshair
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pickerX, pickerY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pickerX, pickerY, 6, 0, Math.PI * 2);
    ctx.stroke();
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    updateColor(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      updateColor(e);
    }
  };

  const updateColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const center = canvas.width / 2;
    const radius = center - 10;

    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      // Calculate angle, adjusting so 0° is at top (12 o'clock)
      const angle = Math.atan2(dy, dx);
      // Convert to 0-360 range with 0° at top
      let h = ((angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI;
      // Saturation based on distance from center
      const s = Math.min(100, (distance / radius) * 100);
      // Use full brightness for color wheel
      const v = 100;

      const rgb = hsvToRgb(h, s, v);
      onChange({ r: rgb.r, g: rgb.g, b: rgb.b });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="relative flex justify-center">
        <canvas
          ref={canvasRef}
          width={100}
          height={100}
          style={{ width: '100px', height: '100px' }}
          className="rounded-full cursor-crosshair border border-border"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        />
      </div>
      
      {/* Master Dial */}
      {masterValue !== undefined && onMasterChange && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground w-12">Master</span>
          <div className="flex-1 relative h-6 bg-muted rounded-full">
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
              style={{ width: `${((masterValue + 100) / 200) * 100}%` }}
            />
            <input
              type="range"
              min={-100}
              max={100}
              value={masterValue}
              onChange={(e) => onMasterChange(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 border-primary rounded-full pointer-events-none"
              style={{ left: `${((masterValue + 100) / 200) * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <span className="text-[10px] text-foreground w-8 text-right">{masterValue}</span>
        </div>
      )}
      
      <div className="flex gap-1 text-xs">
        <div className="flex-1">
          <div className="text-muted-foreground text-[10px] mb-0.5">R</div>
          <input
            type="number"
            value={Math.round(value.r)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onChange({ ...value, r: Math.max(-100, Math.min(100, val)) });
            }}
            className="w-full px-1 py-0.5 bg-muted rounded text-[10px] h-6"
            min={-100}
            max={100}
          />
        </div>
        <div className="flex-1">
          <div className="text-muted-foreground text-[10px] mb-0.5">G</div>
          <input
            type="number"
            value={Math.round(value.g)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onChange({ ...value, g: Math.max(-100, Math.min(100, val)) });
            }}
            className="w-full px-1 py-0.5 bg-muted rounded text-[10px] h-6"
            min={-100}
            max={100}
          />
        </div>
        <div className="flex-1">
          <div className="text-muted-foreground text-[10px] mb-0.5">B</div>
          <input
            type="number"
            value={Math.round(value.b)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onChange({ ...value, b: Math.max(-100, Math.min(100, val)) });
            }}
            className="w-full px-1 py-0.5 bg-muted rounded text-[10px] h-6"
            min={-100}
            max={100}
          />
        </div>
      </div>
    </div>
  );
}

