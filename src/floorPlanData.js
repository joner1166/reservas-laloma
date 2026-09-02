// src/floorPlanData.js
// Geometry for the La Loma dining room, redrawn from the original blueprint.
// Coordinates are in plan units on a 1800 x 1010 canvas (not percentages).

export const PLAN_W = 1800;
export const PLAN_H = 1010;

export const FLOOR_LABELS = {
  ALL: 'FULL FLOOR',
  VIEW: 'VIEW',
  THIRTIES: "30'S",
  BAR: 'BAR',
  FIFTIES: "50'S",
  EIGHTIES: "80'S",
  TWENTIES: "20'S",
  TENS: "10'S",
};

export const SHAPE_SIZES = {
  'rect-h': { w: 66, h: 44 },
  'rect-v': { w: 44, h: 66 },
  sq: { w: 34, h: 32 },
  sqv: { w: 30, h: 42 },
  'long-h': { w: 112, h: 34 },
  'long-v': { w: 34, h: 112 },
  booth: { w: 84, h: 62 },
  round: { w: 58, h: 58 },
  diamond: { w: 32, h: 32 },
  stool: { w: 30, h: 30 },
};

// Booths whose seat arc opens upward (they face the room from below).
export const BOOTH_UP = new Set(['22', '21', '20', '12', '11', '10']);

/** Chair ticks drawn around a table, in local coords relative to the table box. */
export function chairsFor(shape, w, h) {
  const out = [];
  const th = 6;
  const tw = 14;
  const gap = 3;
  const top = (n) => { for (let i = 1; i <= n; i++) out.push({ x: Math.round((w * i) / (n + 1) - tw / 2), y: -(th + gap), w: tw, h: th }); };
  const bot = (n) => { for (let i = 1; i <= n; i++) out.push({ x: Math.round((w * i) / (n + 1) - tw / 2), y: h + gap, w: tw, h: th }); };
  const lft = (n) => { for (let i = 1; i <= n; i++) out.push({ x: -(th + gap), y: Math.round((h * i) / (n + 1) - tw / 2), w: th, h: tw }); };
  const rgt = (n) => { for (let i = 1; i <= n; i++) out.push({ x: w + gap, y: Math.round((h * i) / (n + 1) - tw / 2), w: th, h: tw }); };

  if (shape === 'rect-h') { top(2); bot(2); }
  else if (shape === 'rect-v') { lft(2); rgt(2); }
  else if (shape === 'sq' || shape === 'sqv') { lft(1); rgt(1); }
  else if (shape === 'long-h') { top(4); bot(4); lft(1); rgt(1); }
  else if (shape === 'long-v') { lft(4); rgt(4); top(1); bot(1); }
  else if (shape === 'diamond') { top(1); bot(1); lft(1); rgt(1); }
  // 'round' and 'stool' are drawn without chairs on purpose.
  return out;
}

const D = [];
const add = (zone, id, cap, x, y, shape, rot = 0) =>
  D.push({ zone, id: String(id), cap, x, y, shape, rot });

/* — VIEW — two rows along the window wall — */
[380, 504, 628, 752, 876, 1000, 1124, 1248, 1372].forEach((x, i) =>
  add('VIEW', [78, 77, 76, 75, 74, 73, 72, 71, 70][i], 4, x, 236, 'rect-v'));
add('VIEW', 68, 2, 445, 306, 'rect-v');
add('VIEW', 67, 2, 520, 306, 'rect-v');
[755, 844, 933, 1022, 1111, 1200, 1289].forEach((x, i) =>
  add('VIEW', [66, 65, 64, 63, 62, 61, 60][i], 4, x, 330, 'rect-v'));

/* — 30'S — */
add('THIRTIES', 33, 4, 306, 412, 'rect-h');
add('THIRTIES', 34, 4, 306, 458, 'rect-h');
add('THIRTIES', 32, 4, 377, 382, 'rect-v');
add('THIRTIES', 31, 4, 445, 382, 'rect-v');
add('THIRTIES', 37, 10, 428, 443, 'long-h');
add('THIRTIES', 30, 10, 529, 460, 'long-v');
add('THIRTIES', 35, 4, 366, 508, 'rect-v');
add('THIRTIES', 36, 4, 433, 508, 'rect-v');

/* — BAR — 17 stools — */
for (let i = 0; i < 17; i++) add('BAR', i + 1, 1, Math.round(706 + i * 39.25), 481, 'stool');

/* — 50'S — */
add('FIFTIES', 53, 4, 1452, 260, 'rect-h');
add('FIFTIES', 52, 4, 1540, 260, 'rect-h');
add('FIFTIES', 51, 4, 1540, 332, 'rect-h');
add('FIFTIES', 50, 4, 1540, 404, 'rect-h');

/* — 20'S — */
[795, 868, 919, 969].forEach((x, i) => add('TWENTIES', [47, 46, 45, 44][i], 4, x, 530, 'sq'));
[795, 878, 961].forEach((x, i) => add('TWENTIES', [23, 24, 25][i], [2, 4, 4][i], x, 582, 'booth'));
add('TWENTIES', 28, 4, 807, 663, 'diamond', 45);
add('TWENTIES', 27, 10, 900, 663, 'long-h');
add('TWENTIES', 26, 10, 997, 667, 'long-v');
[795, 878, 961].forEach((x, i) => add('TWENTIES', [22, 21, 20][i], 2, x, 750, 'booth'));

/* — 10'S — */
[1183, 1224, 1267].forEach((x, i) => add('TENS', [43, 42, 41][i], 4, x, 530, 'sq'));
add('TENS', 40, 4, 1320, 560, 'rect-h');
add('TENS', 13, 2, 1189, 578, 'booth');
add('TENS', 14, 2, 1256, 578, 'booth');
[1183, 1251, 1319].forEach((x, i) => add('TENS', [17, 16, 15][i], 10, x, 676, 'long-v'));
[1143, 1230, 1316].forEach((x, i) => add('TENS', [12, 11, 10][i], 2, x, 750, 'booth'));
add('TENS', 1, 4, 1364, 845, 'rect-h');
add('TENS', 2, 4, 1434, 848, 'sq');
add('TENS', 3, 4, 1499, 848, 'sq');
add('TENS', 4, 4, 1556, 845, 'rect-h');
add('TENS', 5, 4, 1604, 752, 'sqv');
add('TENS', 6, 4, 1600, 672, 'sqv');
add('TENS', 8, 10, 1514, 650, 'long-h', 20);
add('TENS', 7, 10, 1502, 728, 'long-h', 20);

/* — 80'S — */
[615, 682, 749, 816, 883].forEach((y, i) => add('EIGHTIES', [80, 81, 82, 83, 84][i], 4, 1692, y, 'round'));

/** Every table, flat. Each item: { zone, id, cap, x, y, shape, rot } */
export const ALL_TABLES = D;

/** Same shape as before: FLOOR_CONFIG[zone] -> table[].  Keys stay `${zone}-${id}`. */
export const FLOOR_CONFIG = D.reduce((acc, t) => {
  (acc[t.zone] = acc[t.zone] || []).push(t);
  return acc;
}, {});

export const ZONE_ORDER = ['ALL', 'VIEW', 'THIRTIES', 'BAR', 'TWENTIES', 'TENS', 'FIFTIES', 'EIGHTIES'];

function zoneBox(zone, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  D.forEach((t) => {
    if (t.zone !== zone) return;
    const d = SHAPE_SIZES[t.shape];
    const r = Math.abs(t.rot) > 1 ? Math.max(d.w, d.h) / 1.7 : 0;
    const hw = d.w / 2 + 12 + r;
    const hh = d.h / 2 + 12 + r;
    x0 = Math.min(x0, t.x - hw); x1 = Math.max(x1, t.x + hw);
    y0 = Math.min(y0, t.y - hh); y1 = Math.max(y1, t.y + hh);
  });
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/** Zoom target per tab. ALL = the whole sheet. */
export const ZONE_BOXES = {
  ALL: [70, 95, 1750, 995],
  VIEW: zoneBox('VIEW', 26),
  THIRTIES: zoneBox('THIRTIES', 26),
  BAR: zoneBox('BAR', 34),
  TWENTIES: zoneBox('TWENTIES', 78),
  TENS: zoneBox('TENS', 78),
  FIFTIES: zoneBox('FIFTIES', 26),
  EIGHTIES: zoneBox('EIGHTIES', 26),
};

/** Handwritten zone marks from the original sheet. */
export const ZONE_MARKS = [
  { zone: 'VIEW', label: 'V I E W', left: 700, top: 148 },
  { zone: 'THIRTIES', label: "30'S", left: 120, top: 392 },
  { zone: 'FIFTIES', label: "50'S", left: 1600, top: 246 },
  { zone: 'TWENTIES', label: "20'S", left: 800, top: 862 },
  { zone: 'TENS', label: "10'S", left: 1210, top: 972 },
  { zone: 'EIGHTIES', label: "80'S", left: 1640, top: 972 },
];
