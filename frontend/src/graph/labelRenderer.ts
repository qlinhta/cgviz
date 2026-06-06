// ---------------------------------------------------------------------------
// Custom Sigma node label + hover renderers.
//
//  - Labels are drawn in a monospace font (it's source code) on a rounded,
//    semi-transparent "pill" so they stay readable over a dense dark canvas.
//  - The hover renderer additionally paints a soft radial glow behind the
//    focused node for a modern, immersive feel.
// ---------------------------------------------------------------------------

import type { Settings } from 'sigma/settings';

/** Minimal shape of the display data Sigma hands to a label/hover renderer. */
interface LabelData {
  x: number;
  y: number;
  size: number;
  label: string | null;
  color: string;
}

interface LabelTheme {
  bg: string;
  text: string;
}

const THEMES: Record<'dark' | 'light', LabelTheme> = {
  dark: { bg: 'rgba(17, 17, 27, 0.85)', text: '#e4e4ef' },
  light: { bg: 'rgba(248, 249, 251, 0.92)', text: '#1f2430' },
};

/** Convert a #rrggbb hex (or pass-through rgba) to an rgba() string. */
function toRgba(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function drawPill(
  context: CanvasRenderingContext2D,
  data: LabelData,
  settings: Settings,
  theme: LabelTheme,
  emphasize: boolean,
): void {
  if (!data.label) return;

  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  context.font = `${weight} ${size}px ${font}`;

  const textWidth = context.measureText(data.label).width;
  const padX = 6;
  const padY = 4;
  const boxW = textWidth + padX * 2;
  const boxH = size + padY * 2;

  const tx = data.x + data.size + 6;
  const cy = data.y;
  const boxX = tx - padX;
  const boxY = cy - boxH / 2;

  context.fillStyle = theme.bg;
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(boxX, boxY, boxW, boxH, 5);
  } else {
    context.rect(boxX, boxY, boxW, boxH);
  }
  context.fill();

  if (emphasize) {
    context.strokeStyle = toRgba(data.color, 0.9);
    context.lineWidth = 1.5;
    context.stroke();
  }

  context.fillStyle = theme.text;
  context.textBaseline = 'middle';
  context.fillText(data.label, tx, cy);
}

/** Node label renderer factory (bound to the active theme). */
export function makeDrawNodeLabel(theme: 'dark' | 'light') {
  const t = THEMES[theme];
  return (context: CanvasRenderingContext2D, data: LabelData, settings: Settings) =>
    drawPill(context, data, settings, t, false);
}

/** Hover renderer: soft glow + crisp node + emphasized label pill. */
export function makeDrawNodeHover(theme: 'dark' | 'light') {
  const t = THEMES[theme];
  return (context: CanvasRenderingContext2D, data: LabelData, settings: Settings) => {
    const r = data.size;

    // Soft radial glow halo.
    const glow = context.createRadialGradient(data.x, data.y, r * 0.5, data.x, data.y, r * 3.2);
    glow.addColorStop(0, toRgba(data.color, 0.5));
    glow.addColorStop(1, toRgba(data.color, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(data.x, data.y, r * 3.2, 0, Math.PI * 2);
    context.fill();

    // Re-draw the node disc crisply on top of the glow.
    context.fillStyle = data.color;
    context.beginPath();
    context.arc(data.x, data.y, r, 0, Math.PI * 2);
    context.fill();

    drawPill(context, data, settings, t, true);
  };
}
