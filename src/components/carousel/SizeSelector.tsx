import { CAROUSEL_SIZES, CanvasSize } from '@/types/carousel';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SizeSelectorProps {
  currentSize: CanvasSize;
  onSizeChange: (size: CanvasSize) => void;
}

export function SizeSelector({ currentSize, onSizeChange }: SizeSelectorProps) {
  const handleChange = (value: string) => {
    const size = CAROUSEL_SIZES.find(s => s.name === value);
    if (size) {
      onSizeChange(size);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Select value={currentSize.name} onValueChange={handleChange}>
        <SelectTrigger className="w-[220px] bg-card border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {CAROUSEL_SIZES.map((size) => (
            <SelectItem 
              key={size.name} 
              value={size.name}
              className="text-foreground hover:bg-muted focus:bg-muted"
            >
              {size.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">
        {currentSize.width} × {currentSize.height}
      </span>
    </div>
  );
}
