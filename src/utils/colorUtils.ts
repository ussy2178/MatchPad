/**
 * Converts a hex color to a softer pastel version for tactical board styling.
 * Uses HSL: increases lightness and reduces saturation for a low-contrast look.
 */
export function toPastelColor(color: string): string {
  const hex = color.replace(/^#/, '');
  if (hex.length !== 6 && hex.length !== 3) return color;

  let r: number, g: number, b: number;
  if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  } else {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const H = h * 360;
  const S = Math.min(0.45, s * 0.7);
  const L = 0.88;

  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  if (H < 60) { r2 = c; g2 = x; b2 = 0; }
  else if (H < 120) { r2 = x; g2 = c; b2 = 0; }
  else if (H < 180) { r2 = 0; g2 = c; b2 = x; }
  else if (H < 240) { r2 = 0; g2 = x; b2 = c; }
  else if (H < 300) { r2 = x; g2 = 0; b2 = c; }
  else { r2 = c; g2 = 0; b2 = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

const WHITE_BORDER = '#222';
const WHITE_BG = '#f2f2f2';
/** Threshold: all RGB components >= this (0–255) treated as near-white */
const NEAR_WHITE_MIN = 240;

function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.replace(/^#/, '');
  if (s.length !== 6 && s.length !== 3) return null;
  if (s.length === 6) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
    };
  }
  return {
    r: parseInt(s[0] + s[0], 16),
    g: parseInt(s[1] + s[1], 16),
    b: parseInt(s[2] + s[2], 16),
  };
}

function isWhiteOrNearWhite(teamColor: string): boolean {
  const hex = teamColor.replace(/^#/, '').toLowerCase();
  if (hex === 'fff' || hex === 'ffffff') return true;
  const rgb = parseHexToRgb(teamColor);
  if (!rgb) return false;
  return rgb.r >= NEAR_WHITE_MIN && rgb.g >= NEAR_WHITE_MIN && rgb.b >= NEAR_WHITE_MIN;
}

/**
 * Returns a solid pastel by blending the hex color with white.
 * @param hex - Hex color (with or without #)
 * @param percent - Amount of white to mix (0–100). 75 = 75% white, 25% color.
 */
export function lightenColor(hex: string, percent: number): string {
  const normalized = hex.replace(/^#/, '');
  if (normalized.length !== 6 && normalized.length !== 3) return '#f5f5f5';
  const rgb = parseHexToRgb(hex.startsWith('#') ? hex : `#${hex}`);
  if (!rgb) return '#f5f5f5';
  const t = Math.max(0, Math.min(100, percent)) / 100;
  const r = Math.round(rgb.r * (1 - t) + 255 * t);
  const g = Math.round(rgb.g * (1 - t) + 255 * t);
  const b = Math.round(rgb.b * (1 - t) + 255 * t);
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Returns border and background colors for player markers (fully opaque).
 * Handles white/near-white with dark border and light gray fill;
 * otherwise border = team color, background = very pale pastel (95% white).
 */
export function getPlayerColors(teamColor: string): { borderColor: string; backgroundColor: string } {
  const normalized = teamColor.startsWith('#') ? teamColor : `#${teamColor}`;
  if (isWhiteOrNearWhite(normalized)) {
    return { borderColor: WHITE_BORDER, backgroundColor: WHITE_BG };
  }
  const rgb = parseHexToRgb(normalized);
  if (!rgb) {
    return { borderColor: '#333', backgroundColor: '#f2f2f2' };
  }
  return { borderColor: normalized, backgroundColor: lightenColor(normalized, 95) };
}

/**
 * Converts a hex color to rgba with the given alpha (0–1).
 * Use for labels and overlays. White/near-white returns a light gray tint.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex : `#${hex}`;
  if (isWhiteOrNearWhite(normalized)) return `rgba(0, 0, 0, ${Math.min(0.12, alpha)})`;
  const rgb = parseHexToRgb(normalized);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Returns a very light tinted version of the color for use as player marker background.
 * Uses HSL with high lightness (85–90%) and low saturation for a soft fill.
 */
export function toTintedColor(color: string): string {
  const hex = color.replace(/^#/, '');
  if (hex.length !== 6 && hex.length !== 3) return '#f9fafb';

  let r: number, g: number, b: number;
  if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  } else {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = (max + min) > 1 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const H = h * 360;
  const S = Math.min(0.25, s * 0.5);
  const L = 0.92;

  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  if (H < 60) { r2 = c; g2 = x; b2 = 0; }
  else if (H < 120) { r2 = x; g2 = c; b2 = 0; }
  else if (H < 180) { r2 = 0; g2 = c; b2 = x; }
  else if (H < 240) { r2 = 0; g2 = x; b2 = c; }
  else if (H < 300) { r2 = x; g2 = 0; b2 = c; }
  else { r2 = c; g2 = 0; b2 = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}
