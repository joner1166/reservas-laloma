import { useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dt = (iso) => new Date(iso + 'T12:00:00');
const fmt = (hhmm) => {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 && h < 24 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
};
const shortDate = (iso) => dt(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const TIMES = Array.from({ length: 61 }, (_, i) => {
  const m = 540 + i * 15;
  return m === 1440 ? '24:00' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
});

const GOLD = 'linear-gradient(180deg, oklch(80% 0.14 85), oklch(72% 0.14 82))';
const NAVY = 'oklch(15% 0.015 255)';
const MUTED = 'oklch(48% 0.01 90)';
const INK = 'oklch(20% 0.01 90)';
const C = {
  closed: { tint: 'oklch(93% 0.03 25)', line: 'oklch(85% 0.06 25)', ink: 'oklch(45% 0.16 25)', solid: 'oklch(62% 0.16 28)' },
  walkin_only: { tint: 'oklch(93% 0.06 85)', line: 'oklch(80% 0.1 80)', ink: 'oklch(42% 0.11 70)', solid: 'oklch(70% 0.14 70)' },
};

const S = {
  label: { fontSize: 10.5, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: 2 },
  input: { height: 46, padding: '0 14px', border: '1px solid oklch(85% 0.008 90)', background: '#fff', fontSize: 15, fontFamily: "'Jost',sans-serif", color: INK, borderRadius: 0, width: '100%', cursor: 'text' },
  select: { height: 46, padding: '0 14px', border: '1px solid oklch(85% 0.008 90)', background: '#fff', fontSize: 15, fontFamily: "'Jost',sans-serif", color: INK, borderRadius: 0, width: '100%', cursor: 'pointer' },
  serifTitle: { fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 600 },
  monthBtn: { width: 28, height: 28, border: '1px solid oklch(88% 0.006 90)', background: '#fff', cursor: 'pointer', fontSize: 14, color: 'oklch(30% 0.01 90)' },
  group: { display: 'flex', flexDirection: 'column', gap: 10 },
};

export default function BlackoutManager({ blackoutDates = [], onSubmit, removeBlackoutRow }) {
  const now = new Date();
  const today = isoOf(now.getFullYear(), now.getMonth(), now.getDate());

  const [type, setType] = useState('closed');
  const [dur, setDur] = useState('day');
  const [cal, setCal] = useState(today.slice(0, 7));
  const [form, setForm] = useState({ date: '', notes: '', start: '', end: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const stepMonth = (d) => {
    const [y, m] = cal.split('-').map(Number);
    const x = new Date(y, m - 1 + d, 1);
    setCal(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`);
  };

  const fullDayRow = (date) => blackoutDates.find((b) => b.date_iso === date && !b.start_time);
  const timedRows = (date) => blackoutDates.filter((b) => b.date_iso === date && b.start_time);
  const existing = form.date ? fullDayRow(form.date) : null;
  const hours = dur === 'hours';

  const submit = async () => {
    if (!form.date || saving) return;
    setSaving(true);
    try {
      const ok = await onSubmit({
        date: form.date,
        notes: form.notes,
        type,
        start: hours ? form.start : '',
        end: hours ? form.end : '',
      });
      if (ok) setForm({ date: '', notes: '', start: '', end: '' });
    } finally {
      setSaving(false);
    }
  };

  const [cy, cm] = cal.split('-').map(Number);
  const first = new Date(cy, cm - 1, 1);
  const off = first.getDay();
  const dim = new Date(cy, cm, 0).getDate();
  const total = Math.ceil((off + dim) / 7) * 7;
  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let cta = { label: 'Select a date', bg: 'oklch(94% 0.006 90)', color: 'oklch(60% 0.01 90)', border: 'none', disabled: true };
  let hint = '';
  if (form.date) {
    const ds = shortDate(form.date);
    if (!hours && existing) {
      cta = { label: `Unblock ${ds}`, bg: '#fff', color: 'oklch(30% 0.01 90)', border: '1px solid oklch(85% 0.008 90)', disabled: false };
      hint = `${ds} is already ${existing.type === 'closed' ? 'closed' : 'walk-in only'} all day.`;
    } else if (hours && !(form.start && form.end)) {
      cta = { label: 'Choose start and end time', bg: 'oklch(94% 0.006 90)', color: 'oklch(60% 0.01 90)', border: 'none', disabled: true };
    } else {
      const win = hours ? ` · ${fmt(form.start)} – ${fmt(form.end)}` : '';
      const verb = type === 'closed' ? (hours ? 'Close hours' : 'Close restaurant') : 'Set walk-in only';
      cta = type === 'closed'
        ? { label: `${verb} · ${ds}${win}`, bg: C.closed.solid, color: '#fff', border: 'none', disabled: false }
        : { label: `${verb} · ${ds}${win}`, bg: GOLD, color: 'oklch(18% 0.02 85)', border: 'none', disabled: false };
      if (hours && existing) hint = `${ds} is already ${existing.type === 'closed' ? 'closed' : 'walk-in only'} all day.`;
      else if (timedRows(form.date).length) hint = `${timedRows(form.date).length} timed block(s) already on this date.`;
    }
  }
  if (saving) cta = { ...cta, label: 'Saving…', disabled: true };

  const list = [...blackoutDates].sort((a, b) =>
    (a.date_iso + (a.start_time || '')).localeCompare(b.date_iso + (b.start_time || ''))
  );
  const nClosed = list.filter((b) => b.type === 'closed').length;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start', fontFamily: "'Jost',sans-serif", color: INK }}>
      <div style={{ flex: '1 1 340px', maxWidth: 420, background: '#fff', border: '1px solid oklch(90% 0.006 90)', boxShadow: '0 20px 45px -24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid oklch(92% 0.006 90)' }}>
          <div style={S.serifTitle}>New block</div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={S.group}>
            <div style={S.label}>Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { k: 'closed', label: 'Closed', sub: 'No reservations or walk-ins' },
                { k: 'walkin_only', label: 'Walk-in only', sub: 'Online & phone bookings off' },
              ].map((t) => (
                <button key={t.k} type="button" onClick={() => setType(t.k)}
                  style={{ textAlign: 'left', padding: '12px 14px', cursor: 'pointer', background: type === t.k ? C[t.k].tint : '#fff', border: `1.5px solid ${type === t.k ? C[t.k].solid : 'oklch(88% 0.006 90)'}`, display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'inherit' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: INK }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: C[t.k].solid, flexShrink: 0 }} />{t.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.35 }}>{t.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={S.group}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={S.label}>Date</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={() => stepMonth(-1)} style={S.monthBtn} aria-label="Previous month">‹</button>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, minWidth: 118, textAlign: 'center' }}>{monthLabel}</div>
                <button type="button" onClick={() => stepMonth(1)} style={S.monthBtn} aria-label="Next month">›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 3 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                <div key={'w' + i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'oklch(60% 0.01 90)', padding: '4px 0' }}>{w}</div>
              ))}
              {Array.from({ length: total }, (_, i) => {
                const d = i - off + 1;
                if (d < 1 || d > dim) return <div key={'e' + i} />;
                const iso = isoOf(cy, cm - 1, d);
                const past = iso < today;
                const sel = iso === form.date;
                const full = fullDayRow(iso);
                const part = timedRows(iso)[0];
                let bg = '#fff', border = 'oklch(92% 0.006 90)', color = INK;
                if (full) { bg = C[full.type]?.tint || bg; border = C[full.type]?.line || border; color = C[full.type]?.ink || color; }
                if (iso === today) border = 'oklch(72% 0.14 82)';
                if (sel) { bg = NAVY; border = NAVY; color = '#fff'; }
                const label = `${monthLabel} ${d}${full ? `, ${full.type === 'closed' ? 'closed' : 'walk-in only'} all day` : ''}${part ? ', partial hours blocked' : ''}`;
                return (
                  <button key={iso} type="button" disabled={past} aria-label={label} onClick={() => set('date', iso)}
                    style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: `1px solid ${border}`, background: bg, color, fontSize: 13, fontWeight: sel || full || iso === today ? 600 : 400, cursor: past ? 'not-allowed' : 'pointer', padding: 0, opacity: past ? 0.35 : 1, fontFamily: 'inherit' }}>
                    <span>{d}</span>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: part ? (sel ? '#fff' : C[part.type]?.solid) : 'transparent' }} />
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: MUTED, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: C.closed.tint, border: `1px solid ${C.closed.line}` }} />Closed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: C.walkin_only.tint, border: `1px solid ${C.walkin_only.line}` }} />Walk-in only</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: MUTED }} />Partial hours</span>
            </div>
          </div>

          <div style={S.group}>
            <div style={S.label}>Duration</div>
            <div style={{ display: 'flex', gap: 4, background: NAVY, padding: 5, borderRadius: 12 }}>
              {[{ k: 'day', label: 'All day' }, { k: 'hours', label: 'Specific hours' }].map((d) => (
                <button key={d.k} type="button" onClick={() => setDur(d.k)}
                  style={{ flex: 1, padding: '9px 14px', border: 'none', background: dur === d.k ? GOLD : 'transparent', color: dur === d.k ? 'oklch(18% 0.02 85)' : 'oklch(65% 0.01 90)', fontWeight: 600, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}>
                  {d.label}
                </button>
              ))}
            </div>
            {hours && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>From</span>
                  <select value={form.start} onChange={(e) => set('start', e.target.value)} style={S.select}>
                    <option value="">—</option>
                    {TIMES.slice(0, -1).map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>To</span>
                  <select value={form.end} onChange={(e) => set('end', e.target.value)} style={S.select}>
                    <option value="">—</option>
                    {TIMES.map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={S.group}>
            <div style={S.label}>Reason <span style={{ textTransform: 'none', letterSpacing: 0, color: 'oklch(60% 0.01 90)' }}>· optional</span></div>
            <input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Evento privado, Christmas…" style={S.input} />
          </div>
        </div>

        <div style={{ padding: '16px 24px 24px', borderTop: '1px solid oklch(92% 0.006 90)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hint && <div style={{ fontSize: 12, color: 'oklch(45% 0.12 70)' }}>{hint}</div>}
          <button type="button" onClick={submit} disabled={cta.disabled}
            style={{ width: '100%', padding: 16, border: cta.border, background: cta.bg, color: cta.color, fontSize: 15, fontWeight: 500, cursor: cta.disabled ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.10)', borderRadius: 0, fontFamily: 'inherit' }}>
            {cta.label}
          </button>
        </div>
      </div>

      <div style={{ flex: '1 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div style={S.serifTitle}>Blocks</div>
          <div style={{ fontSize: 12, color: MUTED }}>{nClosed} closed · {list.length - nClosed} walk-in only</div>
        </div>

        {list.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center', border: '1px dashed oklch(85% 0.008 90)', fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontSize: 19, color: 'oklch(45% 0.01 90)' }}>
            No blocked dates.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'oklch(90% 0.006 90)', boxShadow: '0 20px 45px -24px rgba(0,0,0,0.18)' }}>
            {list.map((b) => {
              const d = dt(b.date_iso);
              const c = C[b.type] || C.closed;
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#fff' }}>
                  <div style={{ width: 58, height: 62, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: c.tint, border: `1px solid ${c.line}`, color: c.ink }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5 }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 600, lineHeight: 1.05 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: b.notes ? INK : MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.notes || (b.type === 'walkin_only' ? 'Walk-in only' : 'Closed')}
                    </div>
                    <div style={{ fontSize: 12.5, color: MUTED }}>
                      {d.toLocaleDateString('en-US', { weekday: 'long' })} · {b.start_time && b.end_time ? `${fmt(b.start_time)} – ${fmt(b.end_time)}` : 'All day'}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '4px 10px', borderRadius: 20, background: c.tint, color: c.ink, border: `1px solid ${c.line}`, whiteSpace: 'nowrap' }}>
                    {b.type === 'walkin_only' ? 'WALK-IN ONLY' : 'CLOSED'}
                  </span>
                  <button type="button" title="Remove" aria-label="Remove block" onClick={() => removeBlackoutRow(b.id)}
                    style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', border: '1px solid oklch(88% 0.006 90)', background: '#fff', color: MUTED, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
