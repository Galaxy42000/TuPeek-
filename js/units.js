// All model dimensions are stored in inches. The 3D scene is rendered in meters.
export const IN = 0.0254;

const FRACTIONS = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' };

// 34.5 -> 34½″
export function fmtIn(v) {
  const eighths = Math.round(v * 8);
  const whole = Math.floor(eighths / 8);
  const frac = FRACTIONS[eighths % 8] || '';
  return `${whole}${frac}″`;
}

// 168 -> 14′ 0″ (168″); short values stay in plain inches
export function fmtFtIn(v) {
  if (v < 24) return fmtIn(v);
  const ft = Math.floor(v / 12);
  return `${ft}′ ${fmtIn(v - ft * 12)} (${fmtIn(v)})`;
}

// Architectural style: 88 -> 7′-4″, 126.5 -> 10′-6½″
export function fmtFt(v) {
  const eighths = Math.round(v * 8);
  const ft = Math.floor(eighths / 96);
  return `${ft}′-${fmtIn((eighths - ft * 96) / 8)}`;
}
