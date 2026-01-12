import { LUT_PRESETS, LutPreset } from '@/types/carousel';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface ColorGradePanelProps {
  activeLut: LutPreset | null;
  intensity: number;
  onLutChange: (lut: LutPreset) => void;
  onIntensityChange: (intensity: number) => void;
}

export function ColorGradePanel({ 
  activeLut, 
  intensity, 
  onLutChange, 
  onIntensityChange 
}: ColorGradePanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">Color Grade</div>
      <div className="panel-content space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Brand Presets</p>
          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(LUT_PRESETS) as LutPreset[]).map((lut) => (
              <button
                key={lut}
                onClick={() => onLutChange(lut)}
                className={cn(
                  'grade-btn text-left',
                  lut,
                  activeLut === lut && 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                )}
              >
                <div className="font-medium">{LUT_PRESETS[lut].name}</div>
                <div className="text-xs opacity-80">{LUT_PRESETS[lut].description}</div>
              </button>
            ))}
          </div>
        </div>

        {activeLut && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Intensity</p>
              <span className="text-sm text-foreground">{intensity}%</span>
            </div>
            <Slider
              value={[intensity]}
              onValueChange={(values) => onIntensityChange(values[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Manual Adjustments</p>
          <div className="space-y-3">
            {['Exposure', 'Contrast', 'Saturation', 'Temperature'].map((label) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs text-foreground">0</span>
                </div>
                <Slider
                  defaultValue={[50]}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
