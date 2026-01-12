import { BLEND_MODES, BlendMode, FontFamily } from '@/types/carousel';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextPanelProps {
  onAddText: (options: {
    text: string;
    fontFamily: FontFamily;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    blendMode: BlendMode;
  }) => void;
}

export function TextPanel({ onAddText }: TextPanelProps) {
  const handleAddText = () => {
    onAddText({
      text: 'Your Text Here',
      fontFamily: 'Inter',
      fontSize: 72,
      fontWeight: 600,
      fontStyle: 'normal',
      color: '#ffffff',
      blendMode: 'normal',
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">Typography</div>
      <div className="panel-content space-y-4">
        {/* Quick Add */}
        <Button 
          onClick={handleAddText}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Add Text Layer
        </Button>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Font Family</p>
          <Select defaultValue="Inter">
            <SelectTrigger className="bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="Inter" className="text-foreground hover:bg-muted focus:bg-muted">
                <span className="font-sans">Inter</span>
              </SelectItem>
              <SelectItem value="Instrument Serif" className="text-foreground hover:bg-muted focus:bg-muted">
                <span className="font-display">Instrument Serif</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Size</p>
            <Input 
              type="number" 
              defaultValue={72} 
              className="bg-card border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Weight</p>
            <Select defaultValue="600">
              <SelectTrigger className="bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="400" className="text-foreground">Regular</SelectItem>
                <SelectItem value="500" className="text-foreground">Medium</SelectItem>
                <SelectItem value="600" className="text-foreground">Semibold</SelectItem>
                <SelectItem value="700" className="text-foreground">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Style</p>
          <div className="flex gap-1">
            <button className="tool-btn">
              <Bold className="w-4 h-4" />
            </button>
            <button className="tool-btn">
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-px bg-border mx-1" />
            <button className="tool-btn active">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button className="tool-btn">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button className="tool-btn">
              <AlignRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Color</p>
          <div className="flex gap-2">
            {['#ffffff', '#00E5CC', '#D4A574', '#9CA3AF', '#000000'].map((color) => (
              <button
                key={color}
                className={cn(
                  'w-8 h-8 rounded-lg border-2 border-transparent hover:border-primary transition-colors',
                  color === '#ffffff' && 'border-border'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            <Input 
              type="color" 
              defaultValue="#ffffff" 
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Blend Mode</p>
          <Select defaultValue="normal">
            <SelectTrigger className="bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {BLEND_MODES.map((mode) => (
                <SelectItem 
                  key={mode.value} 
                  value={mode.value}
                  className="text-foreground hover:bg-muted focus:bg-muted"
                >
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Letter Spacing</p>
          <Slider
            defaultValue={[0]}
            min={-10}
            max={50}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
