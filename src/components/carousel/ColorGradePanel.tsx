import { useState, useMemo } from 'react';
import { LUT_PRESETS, LutPreset, ManualAdjustments, ColorWheel, RGBCurves, HSLAdjustments, AdvancedAdjustments, RGBMixer, PrimaryAdjustments, PrimaryBars, AdvancedCurves } from '@/types/carousel';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ColorWheel as ColorWheelComponent } from './ColorWheel';
import { CurveEditor } from './CurveEditor';
import { HSLChannelAdjustments } from './HSLChannelAdjustments';
import { PrimaryAdjustments as PrimaryAdjustmentsComponent } from './PrimaryAdjustments';
import { PrimaryBars as PrimaryBarsComponent } from './PrimaryBars';

type ColorGradeTab = 'presets' | 'primary' | 'curves' | 'hsl' | 'advanced';

interface ColorGradePanelProps {
  activeLut: LutPreset | null;
  intensity: number;
  selectedLayerId?: string | null;
  previewImageUrl?: string | null;
  onResetColorGrade?: (layerId?: string) => void;
  onLutChange: (lut: LutPreset, layerId?: string) => void;
  onIntensityChange: (intensity: number, layerId?: string) => void;
  onManualAdjustmentChange?: (adjustment: 'exposure' | 'contrast' | 'saturation' | 'temperature', value: number, layerId?: string) => void;
  manualAdjustments?: ManualAdjustments;
  // Advanced color grading handlers
  onColorWheelChange?: (wheel: 'lift' | 'gamma' | 'gain' | 'offset', value: { r: number; g: number; b: number }, layerId?: string) => void;
  onPrimaryAdjustmentsChange?: (adjustments: PrimaryAdjustments, layerId?: string) => void;
  onPrimaryBarsChange?: (bars: PrimaryBars, layerId?: string) => void;
  onCurvesChange?: (curves: RGBCurves, layerId?: string) => void;
  onAdvancedCurvesChange?: (curves: AdvancedCurves, layerId?: string) => void;
  onHSLChange?: (hsl: HSLAdjustments, layerId?: string) => void;
  onAdvancedChange?: (advanced: AdvancedAdjustments, layerId?: string) => void;
  onRGBMixerChange?: (mixer: RGBMixer, layerId?: string) => void;
  // Advanced color grading values
  colorWheels?: ColorWheel;
  primaryAdjustments?: PrimaryAdjustments;
  primaryBars?: PrimaryBars;
  curves?: RGBCurves;
  advancedCurves?: AdvancedCurves;
  hslAdjustments?: HSLAdjustments;
  advancedAdjustments?: AdvancedAdjustments;
  rgbMixer?: RGBMixer;
}

const clamp = (value: number, min = 0) => Math.max(min, value);
const toDegrees = (radians: number) => radians * (180 / Math.PI);

const buildLutCssFilter = (lut: LutPreset, intensity: number) => {
  const i = intensity / 100;
  const filtersList: string[] = [];

  const addHue = (rotationRad: number) => {
    if (rotationRad !== 0) {
      filtersList.push(`hue-rotate(${toDegrees(rotationRad)}deg)`);
    }
  };
  const addSaturation = (saturation: number) => {
    if (saturation !== 0) {
      filtersList.push(`saturate(${clamp(1 + saturation)})`);
    }
  };
  const addContrast = (contrast: number) => {
    if (contrast !== 0) {
      filtersList.push(`contrast(${clamp(1 + contrast)})`);
    }
  };
  const addBrightness = (brightness: number) => {
    if (brightness !== 0) {
      filtersList.push(`brightness(${clamp(1 + brightness)})`);
    }
  };

  switch (lut) {
    case 'turquoise':
      addHue(-0.1 * i);
      addSaturation(0.2 * i);
      break;
    case 'gold':
      addHue(0.05 * i);
      addSaturation(0.15 * i);
      break;
    case 'silver':
      addSaturation(-0.3 * i);
      addBrightness(0.05 * i);
      break;
    case 'cinematic':
      addContrast(0.15 * i);
      addSaturation(0.1 * i);
      addHue(-0.03 * i);
      break;
    case 'matte':
      addContrast(-0.2 * i);
      addBrightness(0.06 * i);
      addSaturation(-0.1 * i);
      break;
    case 'vibrant':
      addSaturation(0.35 * i);
      addContrast(0.15 * i);
      addBrightness(0.03 * i);
      break;
    case 'noir':
      addSaturation(-1 * i);
      addContrast(0.2 * i);
      addBrightness(-0.05 * i);
      break;
    case 'pastel':
      addContrast(-0.15 * i);
      addBrightness(0.08 * i);
      addSaturation(-0.05 * i);
      addHue(0.02 * i);
      break;
    case 'sunset':
      addHue(0.08 * i);
      addSaturation(0.15 * i);
      addBrightness(0.04 * i);
      break;
  }

  return filtersList.length ? filtersList.join(' ') : 'none';
};

export function ColorGradePanel({ 
  activeLut, 
  intensity, 
  selectedLayerId,
  previewImageUrl,
  onResetColorGrade,
  onLutChange, 
  onIntensityChange,
  onManualAdjustmentChange,
  manualAdjustments,
  onColorWheelChange,
  onPrimaryAdjustmentsChange,
  onPrimaryBarsChange,
  onCurvesChange,
  onAdvancedCurvesChange,
  onHSLChange,
  onAdvancedChange,
  onRGBMixerChange,
  colorWheels,
  primaryAdjustments,
  primaryBars,
  curves,
  advancedCurves,
  hslAdjustments,
  advancedAdjustments,
  rgbMixer
}: ColorGradePanelProps) {
  const [activeTab, setActiveTab] = useState<ColorGradeTab>('presets');
  const [primaryView, setPrimaryView] = useState<'wheels' | 'bars' | 'adjustments'>('wheels');
  const applyToSelected = !!selectedLayerId;
  const previewSrc = previewImageUrl || '/placeholder.svg';

  // Memoize default objects to prevent unnecessary re-renders
  const defaultCurves = useMemo<RGBCurves>(() => ({
    master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  }), []);

  const currentCurves = useMemo(() => curves || defaultCurves, [curves, defaultCurves]);

  // Initialize default HSL adjustments
  const defaultHSL = useMemo<HSLAdjustments>(() => ({
    reds: { hue: 0, saturation: 0, luminance: 0 },
    yellows: { hue: 0, saturation: 0, luminance: 0 },
    greens: { hue: 0, saturation: 0, luminance: 0 },
    cyans: { hue: 0, saturation: 0, luminance: 0 },
    blues: { hue: 0, saturation: 0, luminance: 0 },
    magentas: { hue: 0, saturation: 0, luminance: 0 },
  }), []);

  const currentHSL = useMemo(() => hslAdjustments || defaultHSL, [hslAdjustments, defaultHSL]);

  // Initialize default color wheels
  const defaultColorWheels = useMemo<ColorWheel>(() => ({
    lift: { r: 0, g: 0, b: 0 },
    gamma: { r: 0, g: 0, b: 0 },
    gain: { r: 0, g: 0, b: 0 },
    offset: { r: 0, g: 0, b: 0 },
  }), []);

  const currentColorWheels = useMemo(() => colorWheels || defaultColorWheels, [colorWheels, defaultColorWheels]);

  // Initialize default primary adjustments
  const defaultPrimaryAdjustments = useMemo<PrimaryAdjustments>(() => ({
    contrast: 0,
    pivot: 0,
    saturation: 0,
    hue: 0,
    temperature: 0,
    tint: 0,
    midtoneDetail: 0,
    colorBoost: 0,
    shadowLift: 0,
    highlightGain: 0,
  }), []);

  const currentPrimaryAdjustments = useMemo(() => primaryAdjustments || defaultPrimaryAdjustments, [primaryAdjustments, defaultPrimaryAdjustments]);

  // Initialize default primary bars
  const defaultPrimaryBars = useMemo<PrimaryBars>(() => ({
    lift: { r: 0, g: 0, b: 0 },
    gamma: { r: 0, g: 0, b: 0 },
    gain: { r: 0, g: 0, b: 0 },
    offset: { r: 0, g: 0, b: 0 },
  }), []);

  const currentPrimaryBars = useMemo(() => primaryBars || defaultPrimaryBars, [primaryBars, defaultPrimaryBars]);

  // Initialize default advanced curves
  const defaultAdvancedCurves = useMemo<AdvancedCurves>(() => ({
    hueVsHue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    hueVsSat: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    hueVsLum: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    lumVsSat: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    satVsSat: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  }), []);

  const currentAdvancedCurves = useMemo(() => advancedCurves || defaultAdvancedCurves, [advancedCurves, defaultAdvancedCurves]);

  // Initialize default advanced adjustments
  const defaultAdvanced = useMemo<AdvancedAdjustments>(() => ({
    vibrance: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    tint: 0,
  }), []);

  const currentAdvanced = useMemo(() => advancedAdjustments || defaultAdvanced, [advancedAdjustments, defaultAdvanced]);

  return (
    <div className="panel">
      <div className="panel-header flex items-center justify-between">
        <span>Color Grade</span>
        {onResetColorGrade && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onResetColorGrade(applyToSelected ? selectedLayerId || undefined : undefined)}
          >
            Reset
          </Button>
        )}
      </div>
      <div className="panel-content">
        {applyToSelected && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-3">
            Applying to selected image layer
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ColorGradeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4 h-8">
            <TabsTrigger value="presets" className="text-[10px] px-1">Presets</TabsTrigger>
            <TabsTrigger value="primary" className="text-[10px] px-1">Primary</TabsTrigger>
            <TabsTrigger value="curves" className="text-[10px] px-1">Curves</TabsTrigger>
            <TabsTrigger value="hsl" className="text-[10px] px-1">HSL</TabsTrigger>
            <TabsTrigger value="advanced" className="text-[10px] px-1">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4 mt-0">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Brand Presets</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(LUT_PRESETS) as LutPreset[]).map((lut) => (
                  <button
                    key={lut}
                    onClick={() => onLutChange(lut, applyToSelected ? selectedLayerId || undefined : undefined)}
                    className={cn(
                      'grade-btn text-left space-y-2',
                      activeLut === lut && 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                    )}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                      <img
                        src={previewSrc}
                        alt={`${LUT_PRESETS[lut].name} preview`}
                        className="h-full w-full object-cover"
                        style={{ filter: buildLutCssFilter(lut, intensity) }}
                        loading="lazy"
                      />
                    </div>
                    <div className="font-medium">{LUT_PRESETS[lut].name}</div>
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
                  onValueChange={(values) => onIntensityChange(values[0], applyToSelected ? selectedLayerId || undefined : undefined)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Basic Adjustments</p>
              <div className="space-y-3">
                {[
                  { key: 'exposure' as const, label: 'Exposure', min: -100, max: 100 },
                  { key: 'contrast' as const, label: 'Contrast', min: -100, max: 100 },
                  { key: 'saturation' as const, label: 'Saturation', min: -100, max: 100 },
                  { key: 'temperature' as const, label: 'Temperature', min: -100, max: 100 },
                ].map(({ key, label, min, max }) => {
                  const value = manualAdjustments?.[key] ?? 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-xs text-foreground">{value}</span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={(values) => onManualAdjustmentChange?.(key, values[0], applyToSelected ? selectedLayerId || undefined : undefined)}
                        min={min}
                        max={max}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="primary" className="space-y-4 mt-0">
            <Tabs value={primaryView} onValueChange={(v) => setPrimaryView(v as 'wheels' | 'bars' | 'adjustments')}>
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="wheels" className="text-xs">Wheels</TabsTrigger>
                <TabsTrigger value="bars" className="text-xs">Bars</TabsTrigger>
                <TabsTrigger value="adjustments" className="text-xs">Adjustments</TabsTrigger>
              </TabsList>

              <TabsContent value="wheels" className="space-y-3 mt-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Color Wheels</p>
                <div className="grid grid-cols-2 gap-3">
                  <ColorWheelComponent
                    label="Shadows (Lift)"
                    value={currentColorWheels.lift}
                    onChange={(val) => onColorWheelChange?.('lift', val, applyToSelected ? selectedLayerId || undefined : undefined)}
                  />
                  <ColorWheelComponent
                    label="Midtones (Gamma)"
                    value={currentColorWheels.gamma}
                    onChange={(val) => onColorWheelChange?.('gamma', val, applyToSelected ? selectedLayerId || undefined : undefined)}
                  />
                  <ColorWheelComponent
                    label="Highlights (Gain)"
                    value={currentColorWheels.gain}
                    onChange={(val) => onColorWheelChange?.('gain', val, applyToSelected ? selectedLayerId || undefined : undefined)}
                  />
                  <ColorWheelComponent
                    label="Offset"
                    value={currentColorWheels.offset}
                    onChange={(val) => onColorWheelChange?.('offset', val, applyToSelected ? selectedLayerId || undefined : undefined)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bars" className="mt-0">
                <PrimaryBarsComponent
                  bars={currentPrimaryBars}
                  onChange={(newBars) => onPrimaryBarsChange?.(newBars, applyToSelected ? selectedLayerId || undefined : undefined)}
                />
              </TabsContent>

              <TabsContent value="adjustments" className="mt-0">
                <PrimaryAdjustmentsComponent
                  adjustments={currentPrimaryAdjustments}
                  onChange={(newAdjustments) => onPrimaryAdjustmentsChange?.(newAdjustments, applyToSelected ? selectedLayerId || undefined : undefined)}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="curves" className="space-y-4 mt-0">
            <CurveEditor
              curves={currentCurves}
              onChange={(newCurves) => onCurvesChange?.(newCurves, applyToSelected ? selectedLayerId || undefined : undefined)}
              advancedCurves={currentAdvancedCurves}
              onAdvancedCurvesChange={(newCurves) => onAdvancedCurvesChange?.(newCurves, applyToSelected ? selectedLayerId || undefined : undefined)}
            />
          </TabsContent>

          <TabsContent value="hsl" className="space-y-4 mt-0">
            <HSLChannelAdjustments
              adjustments={currentHSL}
              onChange={(newHSL) => onHSLChange?.(newHSL, applyToSelected ? selectedLayerId || undefined : undefined)}
            />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-0">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tonal Adjustments</p>
              {[
                { key: 'vibrance' as const, label: 'Vibrance', min: -100, max: 100 },
                { key: 'highlights' as const, label: 'Highlights', min: -100, max: 100 },
                { key: 'shadows' as const, label: 'Shadows', min: -100, max: 100 },
                { key: 'whites' as const, label: 'Whites', min: -100, max: 100 },
                { key: 'blacks' as const, label: 'Blacks', min: -100, max: 100 },
                { key: 'tint' as const, label: 'Tint', min: -100, max: 100 },
              ].map(({ key, label, min, max }) => {
                const value = currentAdvanced[key];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs text-foreground">{value}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(values) => {
                        const newAdvanced = { ...currentAdvanced, [key]: values[0] };
                        onAdvancedChange?.(newAdvanced, applyToSelected ? selectedLayerId || undefined : undefined);
                      }}
                      min={min}
                      max={max}
                      step={1}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
