// Travel Command Centre — runtime visual palette bridge (S54)
// Mirrors S54_COLOR_LOCK.json. Runtime JS must consume this module instead of
// copying palette RGB literals into individual screens/components.

const CANONICAL = {
  sky:[88,199,255],
  blue:[93,141,219],
  teal:[70,190,188],
  green:[74,178,132],
  gold:[207,174,77],
  copper:[199,124,76],
  violet:[141,113,209],
  pink:[192,90,151],
  rose:[202,101,120],
  red:[205,91,110],
  silver:[174,184,194]
};

export const TCC_CANONICAL_PALETTE_RGB = Object.freeze(Object.fromEntries(
  Object.entries(CANONICAL).map(([tone,rgb]) => [tone,Object.freeze([...rgb])])
));

export const TCC_PALETTE_RGB = Object.freeze({
  ...TCC_CANONICAL_PALETTE_RGB,
  neutral:TCC_CANONICAL_PALETTE_RGB.silver,
  indigo:TCC_CANONICAL_PALETTE_RGB.violet,
  magenta:TCC_CANONICAL_PALETTE_RGB.pink,
  orange:TCC_CANONICAL_PALETTE_RGB.copper,
  lime:TCC_CANONICAL_PALETTE_RGB.green,
  maroon:TCC_CANONICAL_PALETTE_RGB.red
});

function resolveTone(tone) {
  return TCC_PALETTE_RGB[tone] || TCC_CANONICAL_PALETTE_RGB.blue;
}

export function paletteRgbText(tone) {
  return resolveTone(tone).join(',');
}

export function paletteHex(tone) {
  return `#${resolveTone(tone).map(value => value.toString(16).padStart(2,'0')).join('')}`;
}

const ENTRY_CACHE = new Map();
export function paletteEntry(tone) {
  const resolved = TCC_PALETTE_RGB[tone] ? tone : 'blue';
  if (!ENTRY_CACHE.has(resolved)) {
    ENTRY_CACHE.set(resolved,Object.freeze({ color:paletteHex(resolved), rgb:paletteRgbText(resolved) }));
  }
  return ENTRY_CACHE.get(resolved);
}
