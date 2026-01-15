import { PrimaryBars as PrimaryBarsType } from '@/types/carousel';
import { Slider } from '@/components/ui/slider';

interface PrimaryBarsProps {
  bars: PrimaryBarsType;
  onChange: (bars: PrimaryBarsType) => void;
}

export function PrimaryBars({ bars, onChange }: PrimaryBarsProps) {
  const updateBar = (
    range: 'lift' | 'gamma' | 'gain' | 'offset',
    channel: 'r' | 'g' | 'b',
    value: number
  ) => {
    onChange({
      ...bars,
      [range]: {
        ...bars[range],
        [channel]: value,
      },
    });
  };

  const ranges = [
    { key: 'lift' as const, label: 'Shadows', color: '#666' },
    { key: 'gamma' as const, label: 'Midtones', color: '#999' },
    { key: 'gain' as const, label: 'Highlights', color: '#ccc' },
    { key: 'offset' as const, label: 'Offset', color: '#fff' },
  ];

  const channels = [
    { key: 'r' as const, label: 'R', color: '#ff4444' },
    { key: 'g' as const, label: 'G', color: '#44ff44' },
    { key: 'b' as const, label: 'B', color: '#4444ff' },
  ];

  return (
    <div className="space-y-4">
      {ranges.map((range) => (
        <div key={range.key} className="space-y-2 p-3 border border-border rounded">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: range.color }}
            />
            <span className="text-xs font-medium">{range.label}</span>
          </div>
          <div className="space-y-2">
            {channels.map((channel) => {
              const value = bars[range.key][channel.key];
              return (
                <div key={channel.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: channel.color }}
                      />
                      <span className="text-xs text-muted-foreground">{channel.label}</span>
                    </div>
                    <span className="text-xs text-foreground">{value}</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(values) => updateBar(range.key, channel.key, values[0])}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

