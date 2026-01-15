import { PrimaryAdjustments as PrimaryAdjustmentsType } from '@/types/carousel';
import { Slider } from '@/components/ui/slider';

interface PrimaryAdjustmentsProps {
  adjustments: PrimaryAdjustmentsType;
  onChange: (adjustments: PrimaryAdjustmentsType) => void;
}

export function PrimaryAdjustments({ adjustments, onChange }: PrimaryAdjustmentsProps) {
  const updateAdjustment = (key: keyof PrimaryAdjustmentsType, value: number) => {
    onChange({
      ...adjustments,
      [key]: value,
    });
  };

  const controls = [
    { key: 'contrast' as const, label: 'Contrast', min: -100, max: 100 },
    { key: 'pivot' as const, label: 'Pivot', min: -100, max: 100 },
    { key: 'saturation' as const, label: 'Saturation', min: -100, max: 100 },
    { key: 'hue' as const, label: 'Hue', min: -100, max: 100 },
    { key: 'temperature' as const, label: 'Temperature', min: -100, max: 100 },
    { key: 'tint' as const, label: 'Tint', min: -100, max: 100 },
    { key: 'midtoneDetail' as const, label: 'Midtone Detail', min: -100, max: 100 },
    { key: 'colorBoost' as const, label: 'Color Boost', min: -100, max: 100 },
    { key: 'shadowLift' as const, label: 'Shadow Lift', min: -100, max: 100 },
    { key: 'highlightGain' as const, label: 'Highlight Gain', min: -100, max: 100 },
  ];

  return (
    <div className="space-y-3">
      {controls.map(({ key, label, min, max }) => {
        const value = adjustments[key];
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs text-foreground">{value}</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={(values) => updateAdjustment(key, values[0])}
              min={min}
              max={max}
              step={1}
              className="w-full"
            />
          </div>
        );
      })}
    </div>
  );
}

