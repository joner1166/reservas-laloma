// src/FloorPlanMap.jsx
// Full-floor map redrawn from the original blueprint.
// Drop-in replacement for the old <div className="sr-map-canvas"> block.
// Keys stay `${zone}-${id}`, statuses stay 'av' | 'occ' | 'reserved'.

import { useLayoutEffect, useRef, useState } from 'react';
import {
  PLAN_W, PLAN_H, ALL_TABLES, SHAPE_SIZES, BOOTH_UP,
  ZONE_BOXES, ZONE_MARKS, chairsFor,
} from './floorPlanData';
import './FloorPlanMap.css';

const PAL = {
  av: { fill: 'oklch(94% 0.045 145)', stroke: 'oklch(52% 0.13 145)' },
  occ: { fill: 'oklch(93% 0.055 28)', stroke: 'oklch(55% 0.16 28)' },
  reserved: { fill: 'oklch(95% 0.07 85)', stroke: 'oklch(60% 0.13 85)' },
};

const INK = '#1D2733';
const line = (left, top, width, height) => ({ position: 'absolute', left, top, width, height, background: INK });
const box = (left, top, width, height, bw = 2) => ({ position: 'absolute', left, top, width, height, border: `${bw}px solid ${INK}` });
const hatchX = { border: `1px solid ${INK}`, background: `repeating-linear-gradient(90deg, ${INK} 0 2px, transparent 2px 7px)` };
const hatchY = { border: `1px solid ${INK}`, background: `repeating-linear-gradient(180deg, ${INK} 0 2px, transparent 2px 7px)` };

/** Walls, rooms and fixed labels — static, never re-measured. */
function Structure() {
  return (
    <>
      {/* shell */}
      <div style={{ ...line(95, 103, 1645, 2), background: 'oklch(58% 0.02 255 / 0.45)' }} />
      <div style={line(1736, 103, 4, 858)} />
      <div style={line(93, 103, 4, 856)} />
      <div style={line(95, 955, 900, 4)} />
      <div style={{ ...line(993, 940, 70, 4), transformOrigin: '0 50%', transform: 'rotate(-24deg)' }} />
      <div style={line(1057, 926, 566, 4)} />
      <div style={line(1620, 926, 4, 34)} />
      <div style={line(1620, 956, 118, 4)} />

      {/* window wall (VIEW) */}
      <div style={line(340, 198, 1082, 4)} />
      <div style={line(1418, 198, 4, 60)} />

      {/* 30'S room */}
      <div style={line(269, 344, 220, 3)} />
      <div style={line(269, 344, 3, 197)} />
      <div style={line(269, 538, 234, 3)} />
      <div style={{ position: 'absolute', left: 486, top: 341, width: 196, height: 9, ...hatchX }} />
      <div style={box(676, 336, 18, 20)} />

      {/* kitchen + Est. 1 */}
      <div style={line(95, 538, 176, 3)} />
      <div style={box(248, 541, 391, 216, 4)} />
      <div style={line(530, 818, 415, 3)} />
      <div style={line(941, 818, 3, 141)} />
      <div style={line(950, 818, 3, 141)} />
      <div style={box(721, 812, 167, 30)} />

      {/* bar */}
      <div style={box(690, 390, 660, 40)} />
      <div style={{ ...box(690, 430, 660, 42), background: 'oklch(88% 0.015 85 / 0.5)' }} />

      {/* 50'S alcove */}
      <div style={{ position: 'absolute', left: 1425, top: 240, width: 8, height: 160, ...hatchY }} />
      <div style={{ position: 'absolute', left: 1425, top: 394, width: 62, height: 8, ...hatchX }} />
      <div style={box(1479, 388, 20, 18)} />
      <div style={line(1580, 210, 3, 214)} />

      {/* Est. 2 */}
      <div style={box(1488, 448, 122, 151, 4)} />

      {/* 10'S / service side */}
      <div style={line(1102, 520, 3, 258)} />
      <div style={line(1102, 775, 258, 3)} />
      <div style={box(1088, 891, 114, 34)} />
      <div style={box(1330, 916, 292, 40)} />
      <div style={box(1345, 870, 76, 24)} />
      <div style={{ position: 'absolute', left: 1334, top: 806, width: 116, height: 10, ...hatchX }} />
      <div style={{ position: 'absolute', left: 1476, top: 806, width: 107, height: 10, ...hatchX }} />
      <div style={line(1330, 806, 3, 112)} />
      <div style={line(1620, 700, 3, 226)} />

      {/* 80'S strip */}
      <div style={{ ...box(1655, 588, 74, 372, 3), borderRadius: 3 }} />
      <div className="fp-tag" style={{ ...box(1660, 925, 64, 26), fontSize: 11 }}>Willy&rsquo;s S.</div>

      {/* labels */}
      <div className="fp-tag" style={{ position: 'absolute', left: 248, top: 541, width: 391, height: 216, fontSize: 40, fontWeight: 700 }}>Est. 1</div>
      <div className="fp-tag" style={{ position: 'absolute', left: 1488, top: 448, width: 122, height: 151, fontSize: 26, fontWeight: 700 }}>Est. 2</div>
      <div style={{ position: 'absolute', left: 200, top: 856, fontSize: 44, fontWeight: 600, color: INK }}>kitchen</div>
      <div className="fp-tag" style={{ position: 'absolute', left: 1088, top: 891, width: 114, height: 34, fontSize: 15, fontWeight: 600 }}>Hostess</div>
      <div className="fp-tag" style={{ position: 'absolute', left: 1330, top: 916, width: 292, height: 40, fontSize: 19 }}>Restroom</div>
      <div className="fp-tag" style={{ position: 'absolute', left: 1345, top: 870, width: 76, height: 24, fontSize: 12, fontWeight: 600 }}>ATM</div>
      <div style={{ position: 'absolute', left: 950, top: 966, fontSize: 15, fontWeight: 600, letterSpacing: 1.4, color: INK }}>ENTRANCE</div>
      <div className="fp-bar-label" style={{ position: 'absolute', left: 690, top: 430, width: 660, height: 42 }}>BAR LINDO M. BAR</div>
      <div className="fp-exit" style={{ left: 306, top: 206 }}>Exit</div>
      <div className="fp-exit" style={{ left: 148, top: 546 }}>Exit</div>
      <div className="fp-exit" style={{ left: 1626, top: 594, transformOrigin: '0 0', transform: 'rotate(90deg)' }}>Exit</div>
    </>
  );
}

export default function FloorPlanMap({
  activeFloor = 'ALL',
  tableStatuses = {},
  tableServerNames = {},
  tableReservedNames = {},
  assignMode = false,
  unassignMode = false,
  reserveMode = false,
  pendingAssignTables = new Set(),
  pendingReserveTables = new Set(),
  setPendingAssignTables,
  setPendingReserveTables,
  handleTableSelection,
  getInitials = (n) => n,
  showChairs = true,
  dimOtherZones = true,
}) {
  const wrapRef = useRef(null);
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setFit(el.clientWidth / PLAN_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zone = activeFloor && ZONE_BOXES[activeFloor] ? activeFloor : 'ALL';
  const [x0, y0, x1, y1] = ZONE_BOXES[zone];
  const scale = Math.max(1, Math.min(Math.min(PLAN_W / (x1 - x0), PLAN_H / (y1 - y0)), 4.2));
  const tx = PLAN_W / 2 - ((x0 + x1) / 2) * scale;
  const ty = PLAN_H / 2 - ((y0 + y1) / 2) * scale;

  const toggle = (setter, key) =>
    setter((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });

  return (
    <div className="fp-canvas" ref={wrapRef}>
      <div className="fp-grid" />
      <div className="fp-fit" style={{ width: PLAN_W, height: PLAN_H, transform: `scale(${fit})` }}>
        <div className="fp-zoom" style={{ width: PLAN_W, height: PLAN_H, transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
          <Structure />

          {ZONE_MARKS.map((m) => (
            <div
              key={m.label}
              className="fp-mark"
              style={{
                left: m.left,
                top: m.top,
                color: zone === 'ALL' || zone === m.zone ? 'oklch(38% 0.04 255)' : 'oklch(70% 0.02 255 / 0.4)',
              }}
            >
              {m.label}
            </div>
          ))}

          {ALL_TABLES.map((t) => {
            const key = `${t.zone}-${t.id}`;
            const status = tableStatuses[key] ?? 'av';
            const pal = PAL[status] || PAL.av;
            const servers = tableServerNames?.[key] ?? [];
            const reservedName = tableReservedNames?.[key] ?? null;
            const pending =
              (assignMode && pendingAssignTables.has(key) && 'oklch(58% 0.16 145)') ||
              (unassignMode && pendingAssignTables.has(key) && 'oklch(55% 0.18 28)') ||
              (reserveMode && pendingReserveTables.has(key) && 'oklch(72% 0.14 82)') ||
              null;

            const d = SHAPE_SIZES[t.shape];
            const inZone = zone === 'ALL' || t.zone === zone;
            const isBooth = t.shape === 'booth';
            const up = BOOTH_UP.has(t.id);
            const longH = t.shape === 'long-h';
            const longV = t.shape === 'long-v';
            const stroke = pending || pal.stroke;

            const onClick = () => {
              if (assignMode || unassignMode) toggle(setPendingAssignTables, key);
              else if (reserveMode) toggle(setPendingReserveTables, key);
              else handleTableSelection?.(t);
            };

            return (
              <button
                key={key}
                type="button"
                className="fp-table"
                onClick={onClick}
                style={{
                  left: t.x - d.w / 2,
                  top: t.y - d.h / 2,
                  width: d.w,
                  height: d.h,
                  transform: `rotate(${t.rot}deg)`,
                  opacity: dimOtherZones && !inZone ? 0.28 : 1,
                  zIndex: pending ? 30 : inZone ? 12 : 8,
                }}
              >
                {showChairs && chairsFor(t.shape, d.w, d.h).map((c, i) => (
                  <span key={i} className="fp-chair" style={{ left: c.x, top: c.y, width: c.w, height: c.h, borderColor: stroke }} />
                ))}

                {isBooth ? (
                  <span className="fp-surface" style={{ background: pal.fill, borderColor: stroke, boxShadow: pending ? `0 0 0 3px ${pending}` : 'none' }}>
                    <span
                      className="fp-booth-seat"
                      style={{
                        borderColor: stroke,
                        top: up ? 7 : 18,
                        bottom: up ? 18 : 7,
                        borderRadius: up ? '30px 30px 4px 4px' : '4px 4px 30px 30px',
                      }}
                    >
                      <b>{t.id}</b>
                      <i>{t.cap}p</i>
                    </span>
                  </span>
                ) : (
                  <span
                    className="fp-surface"
                    style={{
                      background: pal.fill,
                      borderColor: stroke,
                      borderRadius: t.shape === 'round' || t.shape === 'stool' ? '50%' : 3,
                      boxShadow: pending ? `0 0 0 3px ${pending}` : 'none',
                    }}
                  >
                    {(longH || longV) && (
                      <span
                        className="fp-divider"
                        style={{
                          background: stroke,
                          left: longH ? '50%' : 0,
                          top: longV ? '50%' : 0,
                          width: longH ? 2 : '100%',
                          height: longV ? 2 : '100%',
                        }}
                      />
                    )}
                    <span className="fp-num" style={{ transform: `rotate(${-t.rot}deg)`, fontSize: t.shape === 'stool' ? 11 : t.shape === 'sq' || t.shape === 'diamond' ? 12 : 14 }}>
                      <b>{t.id}</b>
                      {t.shape !== 'stool' && <i>{t.cap}p</i>}
                    </span>
                  </span>
                )}

                {status === 'reserved' && reservedName ? (
                  <span className="fp-badge fp-badge-gold">{reservedName}</span>
                ) : servers.length > 0 ? (
                  <span className="fp-badge fp-badge-info">{servers.map((n) => getInitials(n)).join(' · ')}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
