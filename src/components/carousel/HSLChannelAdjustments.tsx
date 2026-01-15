import { HSLAdjustments, HSLChannel } from '@/types/carousel';
import { Slider } from '@/components/ui/slider';

interface HSLChannelAdjustmentsProps {
  adjustments: HSLAdjustments;
  onChange: (adjustments: HSLAdjustments) => void;
}

const CHANNELS: { key: HSLChannel; label: string; color: string }[] = [
  { key: 'reds', label: 'Reds', color: '#ff4444' },
  { key: 'yellows', label: 'Yellows', color: '#ffaa00' },
  { key: 'greens', label: 'Greens', color: '#44ff44' },
  { key: 'cyans', label: 'Cyans', color: '#00aaaa' },
  { key: 'blues', label: 'Blues', color: '#4444ff' },
  { key: 'magentas', label: 'Magentas', color: '#ff44ff' },
];

export function HSLChannelAdjustments({ adjustments, onChange }: HSLChannelAdjustmentsProps) {
  const updateChannel = (channel: HSLChannel, property: 'hue' | 'saturation' | 'luminance', value: number) => {
    onChange({
      ...adjustments,
      [channel]: {
        ...adjustments[channel],
        [property]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {CHANNELS.map(({ key, label, color }) => {
        const channel = adjustments[key];
        return (
          <div key={key} className="space-y-2 p-2 border border-border rounded">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="space-y-2 pl-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Hue</span>
                  <span className="text-xs text-foreground">{channel.hue}</span>
                </div>
                <Slider
                  value={[channel.hue]}
                  onValueChange={(values) => updateChannel(key, 'hue', values[0])}
                  min={-100}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Saturation</span>
                  <span className="text-xs text-foreground">{channel.saturation}</span>
                </div>
                <Slider
                  value={[channel.saturation]}
                  onValueChange={(values) => updateChannel(key, 'saturation', values[0])}
                  min={-100}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Luminance</span>
                  <span className="text-xs text-foreground">{channel.luminance}</span>
                </div>
                <Slider
                  value={[channel.luminance]}
                  onValueChange={(values) => updateChannel(key, 'luminance', values[0])}
                  min={-100}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

