export type CanvasSize = {
  width: number;
  height: number;
  name: string;
};

export type LutPreset =
  | 'turquoise'
  | 'gold'
  | 'silver'
  | 'cinematic'
  | 'matte'
  | 'vibrant'
  | 'noir'
  | 'pastel'
  | 'sunset';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export type FontFamily = 'Inter' | 'Instrument Serif';

export type TextEffect = {
  stroke?: {
    width: number;
    color: string;
  };
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
};

export type TextStyle = {
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  blendMode: BlendMode;
  letterSpacing: number;
  lineHeight: number;
  effects?: TextEffect;
};

export type ManualAdjustments = {
  exposure: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  temperature: number; // -100 (cool) to 100 (warm)
};

export type ColorWheel = {
  lift: { r: number; g: number; b: number }; // Shadows (-100 to 100)
  gamma: { r: number; g: number; b: number }; // Midtones (-100 to 100)
  gain: { r: number; g: number; b: number }; // Highlights (-100 to 100)
  offset: { r: number; g: number; b: number }; // Overall offset (-100 to 100)
};

export type PrimaryAdjustments = {
  contrast: number; // -100 to 100
  pivot: number; // -100 to 100 (contrast pivot point)
  saturation: number; // -100 to 100
  hue: number; // -100 to 100
  temperature: number; // -100 to 100
  tint: number; // -100 to 100
  midtoneDetail: number; // -100 to 100 (edge detail/sharpness)
  colorBoost: number; // -100 to 100 (vibrance)
  shadowLift: number; // -100 to 100
  highlightGain: number; // -100 to 100
};

export type PrimaryBars = {
  lift: { r: number; g: number; b: number }; // Shadows RGB (-100 to 100)
  gamma: { r: number; g: number; b: number }; // Midtones RGB (-100 to 100)
  gain: { r: number; g: number; b: number }; // Highlights RGB (-100 to 100)
  offset: { r: number; g: number; b: number }; // Offset RGB (-100 to 100)
};

export type CurvePoint = {
  x: number; // 0-1
  y: number; // 0-1
};

export type RGBCurves = {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
};

export type AdvancedCurves = {
  hueVsHue: CurvePoint[]; // Hue vs Hue curve
  hueVsSat: CurvePoint[]; // Hue vs Saturation curve
  hueVsLum: CurvePoint[]; // Hue vs Luminance curve
  lumVsSat: CurvePoint[]; // Luminance vs Saturation curve
  satVsSat: CurvePoint[]; // Saturation vs Saturation curve
};

export type HSLChannel = 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas';

export type HSLAdjustment = {
  hue: number; // -100 to 100
  saturation: number; // -100 to 100
  luminance: number; // -100 to 100
};

export type HSLAdjustments = {
  reds: HSLAdjustment;
  yellows: HSLAdjustment;
  greens: HSLAdjustment;
  cyans: HSLAdjustment;
  blues: HSLAdjustment;
  magentas: HSLAdjustment;
};

export type AdvancedAdjustments = {
  vibrance: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  whites: number; // -100 to 100
  blacks: number; // -100 to 100
  tint: number; // -100 (green) to 100 (magenta)
};

export type RGBMixer = {
  redToRed: number; // -200 to 200
  redToGreen: number;
  redToBlue: number;
  greenToRed: number;
  greenToGreen: number;
  greenToBlue: number;
  blueToRed: number;
  blueToGreen: number;
  blueToBlue: number;
};

export type AdvancedColorGrade = {
  colorWheels?: ColorWheel;
  primaryAdjustments?: PrimaryAdjustments;
  primaryBars?: PrimaryBars;
  curves?: RGBCurves;
  advancedCurves?: AdvancedCurves;
  hslAdjustments?: HSLAdjustments;
  advancedAdjustments?: AdvancedAdjustments;
  rgbMixer?: RGBMixer;
};

export type Layer = {
  id: string;
  type: 'image' | 'video' | 'text';
  name: string;
  visible: boolean;
  locked: boolean;
  sourceUrl?: string;
  lutPreset?: LutPreset | null;
  lutIntensity?: number;
  manualAdjustments?: ManualAdjustments;
  advancedColorGrade?: AdvancedColorGrade;
};

export type CarouselSlide = {
  id: string;
  name: string;
  canvasSize: CanvasSize;
  layers: Layer[];
  createdAt: number;
  updatedAt: number;
};

export type CarouselProject = {
  id: string;
  name: string;
  slides: CarouselSlide[];
  createdAt: number;
  updatedAt: number;
};

export const CAROUSEL_SIZES: CanvasSize[] = [
  { width: 1080, height: 1350, name: 'Instagram Portrait (4:5)' },
  { width: 1080, height: 1080, name: 'Instagram Square (1:1)' },
  { width: 1080, height: 1920, name: 'Instagram Story (9:16)' },
  { width: 1200, height: 628, name: 'LinkedIn/Facebook (1.91:1)' },
  { width: 1600, height: 900, name: 'Twitter/X (16:9)' },
];

export const LUT_PRESETS: Record<LutPreset, { name: string; description: string }> = {
  turquoise: { name: 'Turquoise Sky', description: 'Cool teal tones with cyan highlights' },
  gold: { name: 'Golden Hour', description: 'Warm amber and golden tones' },
  silver: { name: 'Silver Mist', description: 'Cool desaturated silver tones' },
  cinematic: { name: 'Cinematic Teal', description: 'Balanced contrast with subtle teal shift' },
  matte: { name: 'Soft Matte', description: 'Low contrast with lifted shadows' },
  vibrant: { name: 'Vibrant Pop', description: 'Punchy saturation and crisp contrast' },
  noir: { name: 'Noir B&W', description: 'High-contrast monochrome look' },
  pastel: { name: 'Pastel Bloom', description: 'Soft highlights with gentle color' },
  sunset: { name: 'Sunset Glow', description: 'Warm orange tint with rich saturation' },
};

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
];
