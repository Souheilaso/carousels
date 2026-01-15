import { useState, useEffect } from 'react';
import { BLEND_MODES, BlendMode, FontFamily, TextEffect } from '@/types/carousel';
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
  selectedTextProperties?: {
    text: string;
    fontFamily: FontFamily;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    blendMode?: BlendMode;
    letterSpacing: number;
    lineHeight: number;
    effects?: TextEffect;
  } | null;
  onAddText: (options: {
    text: string;
    fontFamily: FontFamily;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    blendMode: BlendMode;
    letterSpacing?: number;
    lineHeight?: number;
    effects?: TextEffect;
  }) => void;
  onUpdateText?: (updates: {
    text?: string;
    fontFamily?: FontFamily;
    fontSize?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    color?: string;
    blendMode?: BlendMode;
    letterSpacing?: number;
    lineHeight?: number;
    effects?: TextEffect;
  }) => void;
}

export function TextPanel({ selectedTextProperties, onAddText, onUpdateText }: TextPanelProps) {
  const [text, setText] = useState(selectedTextProperties?.text || '');
  const [fontFamily, setFontFamily] = useState<FontFamily>(selectedTextProperties?.fontFamily || 'Inter');
  const [fontSize, setFontSize] = useState(selectedTextProperties?.fontSize || 72);
  const [fontWeight, setFontWeight] = useState(selectedTextProperties?.fontWeight || 600);
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>(selectedTextProperties?.fontStyle || 'normal');
  const [color, setColor] = useState(selectedTextProperties?.color || '#ffffff');
  const [blendMode, setBlendMode] = useState<BlendMode>(selectedTextProperties?.blendMode || 'normal');
  const [letterSpacing, setLetterSpacing] = useState(selectedTextProperties?.letterSpacing || 0);
  const [lineHeight, setLineHeight] = useState(selectedTextProperties?.lineHeight || 1);
  const [strokeWidth, setStrokeWidth] = useState(selectedTextProperties?.effects?.stroke?.width || 0);
  const [strokeColor, setStrokeColor] = useState(selectedTextProperties?.effects?.stroke?.color || '#000000');
  const [shadowOffsetX, setShadowOffsetX] = useState(selectedTextProperties?.effects?.shadow?.offsetX || 0);
  const [shadowOffsetY, setShadowOffsetY] = useState(selectedTextProperties?.effects?.shadow?.offsetY || 0);
  const [shadowBlur, setShadowBlur] = useState(selectedTextProperties?.effects?.shadow?.blur || 0);
  const [shadowColor, setShadowColor] = useState(selectedTextProperties?.effects?.shadow?.color || '#000000');

  // Update local state when selected text changes
  useEffect(() => {
    if (selectedTextProperties) {
      setText(selectedTextProperties.text);
      setFontFamily(selectedTextProperties.fontFamily);
      setFontSize(selectedTextProperties.fontSize);
      setFontWeight(selectedTextProperties.fontWeight);
      setFontStyle(selectedTextProperties.fontStyle);
      setColor(selectedTextProperties.color);
      setBlendMode(selectedTextProperties.blendMode || 'normal');
      setLetterSpacing(selectedTextProperties.letterSpacing);
      setLineHeight(selectedTextProperties.lineHeight);
      setStrokeWidth(selectedTextProperties.effects?.stroke?.width || 0);
      setStrokeColor(selectedTextProperties.effects?.stroke?.color || '#000000');
      setShadowOffsetX(selectedTextProperties.effects?.shadow?.offsetX || 0);
      setShadowOffsetY(selectedTextProperties.effects?.shadow?.offsetY || 0);
      setShadowBlur(selectedTextProperties.effects?.shadow?.blur || 0);
      setShadowColor(selectedTextProperties.effects?.shadow?.color || '#000000');
    } else {
      // Reset to empty when no text is selected
      setText('');
    }
  }, [selectedTextProperties]);

  const handleAddText = () => {
    const effects: TextEffect = {};
    if (strokeWidth > 0) {
      effects.stroke = { width: strokeWidth, color: strokeColor };
    }
    if (shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0) {
      effects.shadow = {
        offsetX: shadowOffsetX,
        offsetY: shadowOffsetY,
        blur: shadowBlur,
        color: shadowColor,
      };
    }

    onAddText({
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      color,
      blendMode,
      letterSpacing,
      lineHeight,
      effects: Object.keys(effects).length > 0 ? effects : undefined,
    });
  };

  const handleUpdate = (updates: Partial<typeof selectedTextProperties>) => {
    if (onUpdateText && selectedTextProperties) {
      // Always construct effects from current state
      const effects: TextEffect = {};
      if (strokeWidth > 0) {
        effects.stroke = { width: strokeWidth, color: strokeColor };
      }
      if (shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0) {
        effects.shadow = {
          offsetX: shadowOffsetX,
          offsetY: shadowOffsetY,
          blur: shadowBlur,
          color: shadowColor,
        };
      }

      const finalUpdates: any = { ...updates };
      if (Object.keys(effects).length > 0) {
        finalUpdates.effects = effects;
      } else {
        finalUpdates.effects = undefined;
      }

      onUpdateText(finalUpdates);
    }
  };

  const isEditing = !!selectedTextProperties && !!onUpdateText;

  return (
    <div className="panel">
      <div className="panel-header">Typography</div>
      <div className="panel-content space-y-4">
        {/* Text Input */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Text</p>
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (isEditing) handleUpdate({ text: e.target.value });
            }}
            className="bg-card border-border text-foreground"
            placeholder="Your text here"
          />
        </div>

        {/* Quick Add / Update Button */}
        {!isEditing && (
          <Button 
            onClick={handleAddText}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Text Layer
          </Button>
        )}

        {/* Font Family */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Font Family</p>
          <Select
            value={fontFamily}
            onValueChange={(value) => {
              setFontFamily(value as FontFamily);
              if (isEditing) handleUpdate({ fontFamily: value as FontFamily });
            }}
          >
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

        {/* Size and Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Size</p>
            <Input
              type="number"
              value={fontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 72;
                setFontSize(val);
                if (isEditing) handleUpdate({ fontSize: val });
              }}
              className="bg-card border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Weight</p>
            <Select
              value={fontWeight.toString()}
              onValueChange={(value) => {
                const val = parseInt(value);
                setFontWeight(val);
                if (isEditing) handleUpdate({ fontWeight: val });
              }}
            >
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

        {/* Style */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Style</p>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const newWeight = fontWeight >= 700 ? 400 : 700;
                setFontWeight(newWeight);
                if (isEditing) handleUpdate({ fontWeight: newWeight });
              }}
              className={cn(
                'tool-btn',
                fontWeight >= 700 && 'active'
              )}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
                setFontStyle(newStyle);
                if (isEditing) handleUpdate({ fontStyle: newStyle });
              }}
              className={cn(
                'tool-btn',
                fontStyle === 'italic' && 'active'
              )}
            >
              <Italic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Color</p>
          <div className="flex gap-2">
            {['#ffffff', '#00E5CC', '#D4A574', '#9CA3AF', '#000000'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (isEditing) handleUpdate({ color: c });
                }}
                className={cn(
                  'w-8 h-8 rounded-lg border-2 border-transparent hover:border-primary transition-colors',
                  color === c && 'border-primary'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (isEditing) handleUpdate({ color: e.target.value });
              }}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Blend Mode */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Blend Mode</p>
          <Select
            value={blendMode}
            onValueChange={(value) => {
              setBlendMode(value as BlendMode);
              if (isEditing) handleUpdate({ blendMode: value as BlendMode });
            }}
          >
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

        {/* Letter Spacing */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Letter Spacing</p>
          <div className="space-y-2">
            <Slider
              value={[letterSpacing]}
              onValueChange={(values) => {
                setLetterSpacing(values[0]);
                if (isEditing) handleUpdate({ letterSpacing: values[0] });
              }}
              min={-10}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-right">{letterSpacing}px</div>
          </div>
        </div>

        {/* Line Height */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Line Height</p>
          <div className="space-y-2">
            <Slider
              value={[lineHeight]}
              onValueChange={(values) => {
                setLineHeight(values[0]);
                if (isEditing) handleUpdate({ lineHeight: values[0] });
              }}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-right">{lineHeight.toFixed(1)}</div>
          </div>
        </div>

        {/* Text Effects */}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Text Effects</p>

          {/* Stroke */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Stroke Width</p>
              <span className="text-xs text-foreground">{strokeWidth}px</span>
            </div>
            <Slider
              value={[strokeWidth]}
              onValueChange={(values) => {
                setStrokeWidth(values[0]);
                if (isEditing) handleUpdate({});
              }}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
            {strokeWidth > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">Color:</span>
                <Input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => {
                    setStrokeColor(e.target.value);
                    if (isEditing) handleUpdate({});
                  }}
                  className="w-12 h-8 p-0 border border-border cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Shadow */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Shadow Blur</p>
              <span className="text-xs text-foreground">{shadowBlur}px</span>
            </div>
            <Slider
              value={[shadowBlur]}
              onValueChange={(values) => {
                setShadowBlur(values[0]);
                if (isEditing) handleUpdate({});
              }}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
            {shadowBlur > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Offset X</p>
                    <Slider
                      value={[shadowOffsetX]}
                      onValueChange={(values) => {
                        setShadowOffsetX(values[0]);
                        if (isEditing) handleUpdate({});
                      }}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Offset Y</p>
                    <Slider
                      value={[shadowOffsetY]}
                      onValueChange={(values) => {
                        setShadowOffsetY(values[0]);
                        if (isEditing) handleUpdate({});
                      }}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Color:</span>
                  <Input
                    type="color"
                    value={shadowColor}
                    onChange={(e) => {
                      setShadowColor(e.target.value);
                      if (isEditing) handleUpdate({});
                    }}
                    className="w-12 h-8 p-0 border border-border cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
