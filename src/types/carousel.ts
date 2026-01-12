export type CanvasSize = {
  width: number;
  height: number;
  name: string;
};

export type LutPreset = 'turquoise' | 'gold' | 'silver';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export type FontFamily = 'Inter' | 'Instrument Serif';

export type TextStyle = {
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  blendMode: BlendMode;
  letterSpacing: number;
  lineHeight: number;
};

export type Layer = {
  id: string;
  type: 'image' | 'text';
  name: string;
  visible: boolean;
  locked: boolean;
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
};

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
];
