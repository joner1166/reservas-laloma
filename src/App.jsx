/*******************************************************
 * BLOQUE 0 — IMPORTS
 *******************************************************/
import { useMemo, useRef, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";
import logo from "/logo.png"; // Logo principal para la interfaz

/*******************************************************
 * BLOQUE 1 — CONFIG / CONSTANTES
 *******************************************************/
const MAX_GUESTS = 12;
const SLOT_MINUTES = 15;
const HOSTESS_PASSWORD = "1234";

// Horarios por día (0=Dom, 1=Lun, ..., 6=Sáb)
const RESTAURANT_HOURS = {
  0: { open: "09:00", close: "23:00" }, // Domingo
  1: { open: "10:00", close: "23:00" }, // Lunes
  2: { open: "10:00", close: "23:00" }, // Martes
  3: { open: "10:00", close: "23:00" }, // Miércoles
  4: { open: "10:00", close: "23:00" }, // Jueves
  5: { open: "10:00", close: "23:59" }, // Viernes
  6: { open: "09:00", close: "23:59" }, // Sábado
};

// Tiempo mínimo antes del cierre para aceptar reservaciones (en minutos)
const LAST_RESERVATION_BUFFER = 60; // 1 hora antes del cierre

const responsiveStyles = `
  * { box-sizing: border-box; }
  @media (max-width: 900px) {
    .hostess-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .sr-hostess-sidebar { width: 100%; min-height: auto; flex-direction: row; align-items: center; padding: 10px; border-right: none; border-bottom: 1px solid #eee; overflow-x: auto; white-space: nowrap; background: #fff; z-index: 10; }
    .sr-logo-small { height: 30px; margin-right: 15px; }
    .sr-sidebar-nav { flex-direction: row; display: flex; gap: 8px; width: 100%; }
    .sr-sidebar-nav button { padding: 6px 12px; font-size: 0.85rem; flex-shrink: 0; }
    .sr-sidebar-footer { display: none; }
    .sr-hostess-main { padding: 10px; height: 100%; overflow-y: auto; }
    .sr-floor-manager { height: 60vh; }
    .sr-map-canvas { overflow: auto; }
    .sr-image-wrapper { min-width: 600px; }
  }
  @media (max-width: 600px) {
    .sr-page { padding: 0; height: 100vh; overflow: hidden; }
    .sr-card { height: 100%; width: 100%; border-radius: 0; box-shadow: none; overflow-y: auto; display: flex; flex-direction: column; padding-bottom: 20px; }
    .sr-form { flex: 1; }
    .sr-formGrid { gap: 20px; padding-bottom: 30px; }
    .sr-field { margin-bottom: 5px; }
    .sr-view-toggle { border-radius: 0; padding: 15px; margin-top: 0; width: 100%; flex-shrink: 0; }
  }
`;

const FLOOR_CONFIG = {
  BAR: [
    ...Array.from({ length: 9 }, (_, i) => ({ id: `B${i + 1}`, cap: 1, top: '22%', left: `${11.5 + (i * 9.5)}%`, status: [3, 5].includes(i + 1) ? 'occ' : 'av', shape: 'circle' })),
    { id: 'B12', cap: 2, top: '53%', left: '54%', status: 'av', shape: 'circle' }, { id: 'B11', cap: 2, top: '53%', left: '64.5%', status: 'av', shape: 'circle' }, { id: 'B10', cap: 2, top: '53%', left: '75%', status: 'av', shape: 'circle' },
    { id: 'B16', cap: 2, top: '86%', left: '7%', status: 'av', shape: 'square' }, { id: 'B15', cap: 2, top: '86%', left: '17%', status: 'av', shape: 'square' }, { id: 'B14', cap: 2, top: '86%', left: '27%', status: 'av', shape: 'square' }, { id: 'B13', cap: 2, top: '86%', left: '37%', status: 'av', shape: 'square' },
    { id: 'B17', cap: 5, top: '42%', left: '6%', status: 'av', shape: 'square' }
  ],
  ROOM1: [
    { id: '1', cap: 4, top: '82%', left: '12%', status: 'occ', shape: 'square' }, { id: '2', cap: 4, top: '82%', left: '32%', status: 'occ', shape: 'square' }, { id: '3', cap: 4, top: '82%', left: '52%', status: 'occ', shape: 'square' }, { id: '4', cap: 4, top: '82%', left: '72%', status: 'occ', shape: 'square' },
    { id: '5', cap: 4, top: '65%', left: '88%', status: 'occ', shape: 'square' }, { id: '6', cap: 4, top: '48%', left: '88%', status: 'av', shape: 'square' }, { id: '7', cap: 4, top: '31%', left: '88%', status: 'occ', shape: 'square' },
    { id: '8', cap: 4, top: '15%', left: '72%', status: 'occ', shape: 'square' }, { id: '9', cap: 4, top: '15%', left: '52%', status: 'occ', shape: 'square' }, { id: '10', cap: 4, top: '15%', left: '32%', status: 'av', shape: 'square' }, { id: '11', cap: 4, top: '15%', left: '12%', status: 'av', shape: 'square' },
    { id: '12', cap: 8, top: '48%', left: '22%', status: 'av', shape: 'rect' }, { id: '14', cap: 8, top: '48%', left: '42%', status: 'occ', shape: 'rect' }, { id: '16', cap: 8, top: '48%', left: '62%', status: 'av', shape: 'rect' }
  ],
  ROOM2: [
    { id: '21', cap: 4, top: '78%', left: '18%', status: 'occ', shape: 'square' }, { id: '22', cap: 4, top: '78%', left: '39%', status: 'av', shape: 'square' }, { id: '23', cap: 4, top: '78%', left: '61%', status: 'occ', shape: 'square' }, { id: '24', cap: 4, top: '78%', left: '82%', status: 'av', shape: 'square' },
    { id: '31', cap: 10, top: '48%', left: '32%', status: 'occ', shape: 'rect' }, { id: '32', cap: 10, top: '48%', left: '68%', status: 'occ', shape: 'rect' },
    { id: '30', cap: 4, top: '18%', left: '10%', status: 'av', shape: 'square' }, { id: '29', cap: 4, top: '18%', left: '26%', status: 'occ', shape: 'square' }, { id: '28', cap: 4, top: '18%', left: '42%', status: 'av', shape: 'square' }, { id: '27', cap: 4, top: '18%', left: '58%', status: 'occ', shape: 'square' }, { id: '26', cap: 4, top: '18%', left: '74%', status: 'av', shape: 'square' }, { id: '25', cap: 4, top: '18%', left: '90%', status: 'av', shape: 'square' }
  ],
  ROOM3: [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `${43 + i}`, cap: 4, top: '18%', left: `${9 + (i * 11.5)}%`, status: i % 3 === 0 ? 'occ' : 'av', shape: 'square' })),
    { id: '57', cap: 8, top: '48%', left: '18%', status: 'occ', shape: 'rect' }, { id: '58', cap: 8, top: '48%', left: '34%', status: 'av', shape: 'rect' }, { id: '59', cap: 8, top: '48%', left: '50%', status: 'occ', shape: 'rect' }, { id: '60', cap: 8, top: '48%', left: '66%', status: 'av', shape: 'rect' }, { id: '61', cap: 8, top: '48%', left: '82%', status: 'occ', shape: 'rect' },
    ...Array.from({ length: 6 }, (_, i) => ({ id: `${51 + i}`, cap: 4, top: '78%', left: `${17 + (i * 13)}%`, status: i % 2 === 0 ? 'av' : 'occ', shape: 'square' }))
  ]
};

/*******************************************************
 * BLOQUE 2 — HELPERS (PUROS)
 *******************************************************/
function pad2(n) { return String(n).padStart(2, "0"); }
function minutesFromHHMM(hhmm) {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
function hhmmFromMinutes(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function dateISOFromDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function addDaysISO(dateISO, days) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dateISOFromDate(dt);
}
function formatDateLabel(dateISO) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(dt);
}
function formatTimeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const dt = new Date(2000, 0, 1, h, m, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(dt);
}
function clampGuests(n) {
  const x = Number(n);
  return Math.min(Math.max(Number.isFinite(x) ? x : 1, 1), MAX_GUESTS);
}
function toLocalDateTimeISO(dateISO, timeHHMM) {
  return `${dateISO}T${timeHHMM}:00`;
}
function addMinutesToLocalDateTimeISO(dateISO, timeHHMM, addMins) {
  const [y, mo, d] = dateISO.split("-").map(Number);
  const [h, mi] = timeHHMM.split(":").map(Number);
  const dt = new Date(y, mo - 1, d, h, mi, 0);
  dt.setMinutes(dt.getMinutes() + addMins);
  const endDateISO = dateISOFromDate(dt);
  const endTimeHHMM = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
  return toLocalDateTimeISO(endDateISO, endTimeHHMM);
}

// --- NUEVOS HELPERS DE HORARIO ---
function getDayHours(dateISO) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Dom
  return RESTAURANT_HOURS[dow] || null;
}

function isRestaurantOpen(dateISO) {
  return !!getDayHours(dateISO);
}

function isTimeAllowed(dateISO, timeHHMM) {
  const hours = getDayHours(dateISO);
  if (!hours) return false;
  const requested = minutesFromHHMM(timeHHMM);
  const open = minutesFromHHMM(hours.open);
  const lastSlot = minutesFromHHMM(hours.close) - LAST_RESERVATION_BUFFER;
  return requested >= open && requested <= lastSlot;
}

function getAvailableTimeRange(dateISO) {
  const hours = getDayHours(dateISO);
  if (!hours) return null;
  return {
    open: hours.open,
    lastSlot: hhmmFromMinutes(minutesFromHHMM(hours.close) - LAST_RESERVATION_BUFFER),
  };
}

/*******************************************************
 * BLOQUE 3 — DATA LAYER (SUPABASE)
 *******************************************************/
const supabaseUrl = 'https://nouxznpzaoerjcarohsu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdXh6bnB6YW9lcmpjYXJvaHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTg4MTcsImV4cCI6MjA4Njg3NDgxN30.ClpOylubz6_5tTCcZzYVqOyfasJNu2S_vW4sIqzi2a0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchRowsForDay(supabaseClient, dateISO) {
  return supabaseClient
    .from("reservations")
    .select("*")
    .eq("dateISO", dateISO)
    .in("status", ["reserved", "waitlist", "seated", "cancelled"])
    .order("id", { ascending: false });
}

async function insertWaitlistRecord(entry) {
  return supabase.from("reservations").insert([entry]);
}

async function insertReservationRecord(entry) {
  return supabase.from("reservations").insert([entry]);
}

async function updatePartyToSeated(id) {
  return supabase
    .from("reservations")
    .update({ status: "seated", seated_at: new Date().toISOString() })
    .eq("id", id);
}

async function updateReservationRecord(id, data) {
  return supabase.from("reservations").update(data).eq("id", id);
}

async function cancelReservation(id) {
  return supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id);
}

async function revertPartyFromSeated(id, originalStatus) {
  return supabase
    .from("reservations")
    .update({ status: originalStatus, seated_at: null })
    .eq("id", id);
}

/*******************************************************
 * BLOQUE 4 — REALTIME (HOOK INTERNO)
 *******************************************************/
function useReservationsRealtime({ supabase, dateISO, setRows }) {
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data, error } = await fetchRowsForDay(supabase, dateISO);
      if (error) return console.error("Supabase fetch error:", error);
      if (isMounted) setRows(data || []);
    })();

    const channel = supabase
      .channel(`reservations-realtime-${dateISO}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          const affectsThisDay =
            (newRow && newRow.dateISO === dateISO) ||
            (oldRow && oldRow.dateISO === dateISO);

          if (!affectsThisDay) return;

          setRows((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((r) => r.id !== oldRow.id);
            if (payload.eventType === "INSERT") {
              if (prev.some((r) => r.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((r) => (r.id === newRow.id ? newRow : r));
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, dateISO, setRows]);
}

/*******************************************************
 * BLOQUE 5 — SERVICES (CALENDAR/NETLIFY)
 *******************************************************/
async function createCalendarEventService(reservation) {
  return fetch("/.netlify/functions/create-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation }),
  });
}

/*******************************************************
 * BLOQUE 6 — UI COMPONENTES INTERNOS
 *******************************************************/

function HostessView({
  // Acciones
  onAddWaitlist, onAddPhoneRes, onSeatParty, onUnseatParty, onCancelRes, onSaveEdit, onNotifyReady, toggleBlackoutDate,
  handleTableSelection, setViewMode,

  // Estado y UI
  activeTab, setActiveTab, activeFloor, setActiveFloor, isBlackout,
  dateISO, setDateISO, dateLabel, stepDate,
  guests, setGuests, stepGuests,
  timeHHMM, setTimeHHMM, timeLabel, stepTime,

  // Datos
  walkInForm, setWalkInForm, phoneResForm, setPhoneResForm,
  waitList, history, seatedList, canceledList, blackoutDates
}) {
  const dateInputRef = useRef(null);
  const blackoutInputRef = useRef(null);
  const phoneResDateRef = useRef(null);
  const phoneResTimeRef = useRef(null);
  const [editingRes, setEditingRes] = useState(null);

  const seatButtonStyle = {
    background: 'linear-gradient(135deg, #f2c300 0%, #d4ab00 100%)',
    color: '#000', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: '700',
    fontSize: '0.85rem', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease', textTransform: 'uppercase'
  };

  const range = getAvailableTimeRange(dateISO);

  return (
    <div className="sr-page hostess-view">
      <main className="sr-card hostess-layout">
        <aside className="sr-hostess-sidebar">
          <div className="sr-sidebar-header"><img src="/logo.png" alt="Lindo Michoacán" className="sr-logo-small" /></div>
          <nav className="sr-sidebar-nav">
            <button className={activeTab === 'walkin' ? 'active' : ''} onClick={() => setActiveTab('walkin')}>Walk-in</button>
            <button className={activeTab === 'phoneres' ? 'active' : ''} onClick={() => setActiveTab('phoneres')}>Phone Res</button>
            <button className={activeTab === 'waitlist' ? 'active' : ''} onClick={() => setActiveTab('waitlist')}>Wait List ({waitList.length})</button>
            <button className={activeTab === 'reservations' ? 'active' : ''} onClick={() => setActiveTab('reservations')}>Reservations ({history.length})</button>
            <button className={activeTab === 'seated' ? 'active' : ''} onClick={() => setActiveTab('seated')}>Seated ({seatedList.length})</button>
            <button className={activeTab === 'canceled' ? 'active' : ''} onClick={() => setActiveTab('canceled')} style={{color: activeTab === 'canceled' ? '#000' : '#ef4444'}}>Canceled ({canceledList.length})</button>
            <button className={activeTab === 'floorplan' ? 'active' : ''} onClick={() => setActiveTab('floorplan')}>Floor Plan</button>
            <button className={activeTab === 'blackout' ? 'active' : ''} onClick={() => setActiveTab('blackout')} style={{marginTop: 'auto', borderTop: '1px solid #eee', color: '#666'}}>Blackout</button>
          </nav>
        </aside>
        <section className="sr-hostess-main">
          <header className="sr-main-header">
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
              <h2>{activeTab === 'walkin' ? 'New Walk-in' : activeTab === 'phoneres' ? 'New Phone Reservation' : activeTab === 'waitlist' ? 'Wait List' : activeTab === 'reservations' ? 'Reservations' : activeTab === 'seated' ? 'Seated History' : activeTab === 'canceled' ? 'Canceled' : activeTab === 'blackout' ? 'Manage Blackout' : 'Floor Plan'}</h2>
              {isBlackout && <span style={{background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold'}}>CLOSED TODAY</span>}
            </div>
            <div className="sr-hostess-date-picker" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input ref={dateInputRef} type="date" className="sr-hidden" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
              <button className="sr-btn-mini" onClick={() => stepDate(-1)}>‹</button>
              <div className="sr-current-date" style={{ cursor: 'pointer', fontWeight: '500' }} onClick={() => dateInputRef.current?.showPicker()}>{dateLabel}</div>
              <button className="sr-btn-mini" onClick={() => stepDate(1)}>›</button>
            </div>
          </header>
          <div className="sr-main-content">
            {activeTab === 'walkin' && (
              <div className="sr-walkin-form">
                {isBlackout && <div style={{padding: '15px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center'}}>⚠️ The restaurant is closed.</div>}
                <div className="sr-center"><label className="sr-fieldLabel">PARTY SIZE</label>
                  <div className="sr-row-simple">
                    <button className="sr-btn-mini" onClick={() => stepGuests(-1)} disabled={isBlackout}>−</button>
                    <input type="number" className="sr-guests-count" value={guests === null ? "" : guests} onChange={(e) => setGuests(e.target.value === "" ? null : parseInt(e.target.value))} onFocus={() => setGuests(null)} style={{width: '60px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '2rem', fontWeight: 'bold', color: '#000'}} disabled={isBlackout} />
                    <button className="sr-btn-mini" onClick={() => stepGuests(1)} disabled={isBlackout}>+</button>
                  </div>
                </div>
                <div className="sr-formGrid" style={{marginTop: '20px'}}>
                  <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={walkInForm.firstName} onChange={e => setWalkInForm({...walkInForm, firstName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={walkInForm.lastName} onChange={e => setWalkInForm({...walkInForm, lastName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Phone</label><input className="sr-input" value={walkInForm.phone} onChange={e => setWalkInForm({...walkInForm, phone: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={walkInForm.celebration} onChange={e => setWalkInForm({...walkInForm, celebration: e.target.value})} disabled={isBlackout}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={walkInForm.dietary} onChange={e => setWalkInForm({...walkInForm, dietary: e.target.value})} disabled={isBlackout}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
                  <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={walkInForm.notes} onChange={e => setWalkInForm({...walkInForm, notes: e.target.value})} disabled={isBlackout}/></div>
                </div>
                <button className="sr-btn sr-btnPrimary" style={{marginTop: '20px', opacity: isBlackout ? 0.5 : 1}} onClick={onAddWaitlist} disabled={isBlackout}>Add to Wait List</button>
              </div>
            )}
            {activeTab === 'phoneres' && (
              <div className="sr-walkin-form">
                {isBlackout && <div style={{padding: '15px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center'}}>⚠️ The restaurant is closed.</div>}
                {!isBlackout && range && (
                  <div style={{padding: '10px 15px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center'}}>
                    Reservations accepted: {formatTimeLabel(range.open)} – {formatTimeLabel(range.lastSlot)}
                  </div>
                )}
                <div style={{display: 'flex', gap: '30px', justifyContent: 'center', marginBottom: '25px', flexWrap: 'wrap'}}>
                  <div className="sr-center"><label className="sr-fieldLabel">DATE</label>
                    <div className="sr-row-simple">
                      <button className="sr-btn-mini" onClick={() => stepDate(-1)} disabled={isBlackout}>−</button>
                      <input ref={phoneResDateRef} type="date" className="sr-hidden" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
                      <span style={{fontSize: '1.2rem', fontWeight: 'bold', minWidth: '120px', textAlign: 'center', cursor: 'pointer'}} onClick={() => phoneResDateRef.current?.showPicker()}>{dateLabel}</span>
                      <button className="sr-btn-mini" onClick={() => stepDate(1)} disabled={isBlackout}>+</button>
                    </div>
                  </div>
                  <div className="sr-center"><label className="sr-fieldLabel">GUESTS</label>
                    <div className="sr-row-simple">
                      <button className="sr-btn-mini" onClick={() => stepGuests(-1)} disabled={isBlackout}>−</button>
                      <input type="number" className="sr-guests-count" value={guests === null ? "" : guests} onChange={(e) => setGuests(e.target.value === "" ? null : parseInt(e.target.value))} onFocus={() => setGuests(null)} style={{width: '60px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '2rem', fontWeight: 'bold', color: '#000'}} disabled={isBlackout} />
                      <button className="sr-btn-mini" onClick={() => stepGuests(1)} disabled={isBlackout}>+</button>
                    </div>
                  </div>
                  <div className="sr-center"><label className="sr-fieldLabel">TIME</label>
                    <div className="sr-row-simple">
                      <button className="sr-btn-mini" onClick={() => stepTime(-1)} disabled={isBlackout}>−</button>
                      <input ref={phoneResTimeRef} type="time" className="sr-hidden" value={timeHHMM} onChange={(e) => setTimeHHMM(e.target.value)} />
                      <span style={{fontSize: '1.8rem', fontWeight: 'bold', minWidth: '120px', textAlign: 'center', cursor: 'pointer'}} onClick={() => phoneResTimeRef.current?.showPicker()}>{timeLabel}</span>
                      <button className="sr-btn-mini" onClick={() => stepTime(1)} disabled={isBlackout}>+</button>
                    </div>
                  </div>
                </div>
                <div className="sr-formGrid">
                  <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={phoneResForm.firstName} onChange={e => setPhoneResForm({...phoneResForm, firstName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={phoneResForm.lastName} onChange={e => setPhoneResForm({...phoneResForm, lastName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Phone</label><input className="sr-input" value={phoneResForm.phone} onChange={e => setPhoneResForm({...phoneResForm, phone: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={phoneResForm.email} onChange={e => setPhoneResForm({...phoneResForm, email: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={phoneResForm.celebration} onChange={e => setPhoneResForm({...phoneResForm, celebration: e.target.value})} disabled={isBlackout}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={phoneResForm.dietary} onChange={e => setPhoneResForm({...phoneResForm, dietary: e.target.value})} disabled={isBlackout}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
                  <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={phoneResForm.notes} onChange={e => setPhoneResForm({...phoneResForm, notes: e.target.value})} disabled={isBlackout}/></div>
                </div>
                <button className="sr-btn sr-btnPrimary" style={{marginTop: '20px'}} onClick={onAddPhoneRes} disabled={isBlackout}>Confirm Phone Reservation</button>
              </div>
            )}
            {activeTab === 'waitlist' && (
              <div className="sr-res-list">
                {waitList.length === 0 ? <p>No guests in wait list.</p> : waitList.map(item => (
                  <div key={item.id} className="sr-list-item" style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{ flex: 1 }}>
                      <strong>{item.firstName} {item.lastName}</strong> ({item.guests} pax)<br/>
                      <small style={{ color: '#999' }}>Added at: {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</small>
                      {item.celebration && item.celebration !== "None" && <div style={{ fontSize: '0.85rem', color: '#d4ab00', marginTop: '2px' }}>🎉 {item.celebration}</div>}
                      {item.dietary && item.dietary !== "None" && <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '2px' }}>🥗 {item.dietary}</div>}
                      {item.notes && <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#666', marginTop: '2px' }}>📝 "{item.notes}"</div>}
                      {item.phone && <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>📞 {item.phone}</div>}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        style={{
                          ...seatButtonStyle,
                          background: "#000",
                          color: "#fff",
                          border: "none",
                          fontSize: "0.75rem",
                          padding: "8px 12px",
                        }}
                        onClick={() => onNotifyReady(item)}
                      >
                        Notify Ready 📱
                      </button>
                      <button style={seatButtonStyle} onClick={() => onSeatParty(item)}>
                        Seat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'reservations' && (
              <div className="sr-res-list">
                {history.length === 0 ? <p>No active reservations.</p> : history.map(res => (
                  <div key={res.id} className="sr-list-item" style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px' }}>
                        <div><strong style={{ fontSize: '1.1rem' }}>{res.firstName} {res.lastName}</strong><span style={{ color: '#666', marginLeft: '8px' }}>({res.guests} pax)</span></div>
                        <span style={{ fontWeight: '700' }}>{res.timeHHMM ? formatTimeLabel(res.timeHHMM) : ""}</span>
                      </div>
                      {res.celebration && res.celebration !== "None" && <div style={{ fontSize: '0.85rem', color: '#d4ab00', marginTop: '4px' }}>🎉 {res.celebration}</div>}
                      {res.dietary && res.dietary !== "None" && <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '2px' }}>🥗 {res.dietary}</div>}
                      {res.notes && <div style={{ color: '#555', fontSize: '0.85rem', background: '#f8f8f8', padding: '6px 12px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>"{res.notes}"</div>}
                      {res.phone && <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>📞 {res.phone}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button style={seatButtonStyle} onClick={() => onSeatParty(res)}>Seat</button>
                      <button style={{ ...seatButtonStyle, background: '#000', color: '#fff', fontSize: '0.75rem', padding: '8px 12px' }} onClick={() => onNotifyReady(res)}>Notify 📱</button>
                      <button style={{ ...seatButtonStyle, background: '#f3f4f6', color: '#374151', boxShadow: 'none', border: '1px solid #d1d5db', fontSize: '0.75rem', padding: '8px 12px' }} onClick={() => setEditingRes({...res})}>Edit</button>
                      <button style={{ ...seatButtonStyle, background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', padding: '8px 12px' }} onClick={() => onCancelRes(res)}>Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'seated' && (
              <div className="sr-res-list">
                {seatedList.length === 0 ? <p>No seated guests today.</p> : seatedList.map(item => (
                  <div key={item.id} className="sr-list-item" style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px' }}>
                        <div><strong style={{ fontSize: '1.1rem' }}>{item.firstName} {item.lastName}</strong><span style={{ color: '#666', marginLeft: '8px' }}>({item.guests} pax)</span></div>
                        <span style={{ fontWeight: '700', color: '#22c55e' }}>Seated {item.seated_at ? new Date(item.seated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                      </div>
                      {item.timeHHMM && <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '2px' }}>Res. time: {formatTimeLabel(item.timeHHMM)}</div>}
                      {item.celebration && item.celebration !== "None" && <div style={{ fontSize: '0.85rem', color: '#d4ab00', marginTop: '4px' }}>🎉 {item.celebration}</div>}
                      {item.dietary && item.dietary !== "None" && <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '2px' }}>🥗 {item.dietary}</div>}
                      {item.notes && <div style={{ color: '#555', fontSize: '0.85rem', background: '#f8f8f8', padding: '6px 12px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>"{item.notes}"</div>}
                      {item.phone && <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>📞 {item.phone}</div>}
                    </div>
                    <button
                      onClick={() => onUnseatParty(item)}
                      style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'canceled' && (
              <div className="sr-res-list">
                {canceledList.length === 0 ? <p>No canceled reservations today.</p> : canceledList.map(item => (
                  <div key={item.id} style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px' }}>
                        <div><strong style={{ fontSize: '1.1rem', textDecoration: 'line-through', color: '#9ca3af' }}>{item.firstName} {item.lastName}</strong><span style={{ color: '#9ca3af', marginLeft: '8px' }}>({item.guests} pax)</span></div>
                        <span style={{ fontWeight: '700', color: '#9ca3af' }}>{item.timeHHMM ? formatTimeLabel(item.timeHHMM) : ""}</span>
                      </div>
                      {item.phone && <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px' }}>📞 {item.phone}</div>}
                      {item.notes && <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px', fontStyle: 'italic' }}>"{item.notes}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'floorplan' && (
              <div className="sr-floor-manager">
                <div className="sr-zone-selector">
                  {Object.keys(FLOOR_CONFIG).map(f => (
                    <button key={f} className={activeFloor === f ? 'active' : ''} onClick={() => setActiveFloor(f)}>{f}</button>
                  ))}
                </div>
                <div className="sr-map-canvas">
                  <div className="sr-image-wrapper">
                    <img src={activeFloor === 'BAR' ? '/BAR.png' : activeFloor === 'ROOM1' ? '/FLOOR 1.jpg' : activeFloor === 'ROOM2' ? '/ROOM 2.jpg' : '/ROOM 3.jpg'} alt={activeFloor} className="sr-floor-img" />
                    {FLOOR_CONFIG[activeFloor].map(table => (
                      <button key={table.id} className={`sr-table-marker shape-${table.shape || 'square'} ${table.status === 'occ' ? 'is-occupied' : 'is-available'}`} style={{ top: table.top, left: table.left }} onClick={() => handleTableSelection(table)}>
                        <span className="table-id">{table.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'blackout' && (
              <div className="sr-walkin-form">
                <input ref={blackoutInputRef} type="date" className="sr-input" />
                <button className="sr-btn sr-btnPrimary" style={{marginTop: '10px'}} onClick={() => toggleBlackoutDate(blackoutInputRef.current?.value)}>Toggle Block</button>
                <div style={{marginTop: '20px'}}>
                  {blackoutDates.map(d => <div key={d}>{d} <button onClick={() => toggleBlackoutDate(d)}>x</button></div>)}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <button className="sr-view-toggle" onClick={() => setViewMode("client")}>Return to Client View</button>
      {editingRes && (
        <div className="sr-modal-overlay" onClick={() => setEditingRes(null)}>
          <div className="sr-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{margin: '0 0 20px', fontSize: '1.2rem', fontWeight: '800'}}>Edit Reservation</h3>
            <div className="sr-formGrid">
              <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={editingRes.firstName} onChange={e => setEditingRes({...editingRes, firstName: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={editingRes.lastName} onChange={e => setEditingRes({...editingRes, lastName: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Phone</label><input className="sr-input" value={editingRes.phone || ''} onChange={e => setEditingRes({...editingRes, phone: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={editingRes.email || ''} onChange={e => setEditingRes({...editingRes, email: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Guests</label><input className="sr-input" type="number" min="1" max={MAX_GUESTS} value={editingRes.guests} onChange={e => setEditingRes({...editingRes, guests: parseInt(e.target.value) || 1})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Time</label><input className="sr-input" type="time" value={editingRes.timeHHMM || ''} onChange={e => setEditingRes({...editingRes, timeHHMM: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={editingRes.celebration || 'None'} onChange={e => setEditingRes({...editingRes, celebration: e.target.value})}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
              <div className="sr-field"><label className="sr-fieldLabel">Dietary</label><select className="sr-input" value={editingRes.dietary || 'None'} onChange={e => setEditingRes({...editingRes, dietary: e.target.value})}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
              <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={editingRes.notes || ''} onChange={e => setEditingRes({...editingRes, notes: e.target.value})} /></div>
            </div>
            <div className="sr-actions" style={{marginTop: '20px'}}>
              <button className="sr-btn" onClick={() => setEditingRes(null)}>Cancel</button>
              <button className="sr-btn sr-btnPrimary" onClick={async () => { await onSaveEdit(editingRes.id, { firstName: editingRes.firstName, lastName: editingRes.lastName, phone: editingRes.phone, email: editingRes.email, guests: editingRes.guests, timeHHMM: editingRes.timeHHMM, celebration: editingRes.celebration, dietary: editingRes.dietary, notes: editingRes.notes }); setEditingRes(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE CLIENT SEARCH (Paso 1) ---
function ClientSearchView({ 
  dateISO, setDateISO, dateLabel, stepDate, 
  guests, setGuests, stepGuests, 
  timeHHMM, setTimeHHMM, timeLabel, stepTime, 
  isBlackout, setStep, handleSwitchToHostess 
}) {
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const range = getAvailableTimeRange(dateISO);

  return (
    <div className="sr-page">
      <main className="sr-card">
        <header className="sr-header"><img className="sr-logo" src="/logo.png" alt="Logo" /></header>
        <input ref={dateInputRef} type="date" className="sr-hidden" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
        <input ref={timeInputRef} type="time" className="sr-hidden" value={timeHHMM} onChange={(e) => setTimeHHMM(e.target.value)} />
        <div className="sr-rows">
          <div className="sr-row" onClick={() => dateInputRef.current?.showPicker()}>
            <button className="sr-arrow" onClick={(e) => { e.stopPropagation(); stepDate(-1); }}>‹</button>
            <div className="sr-center"><div className="sr-value">{dateLabel}</div><div className="sr-label">Date</div></div>
            <button className="sr-arrow" onClick={(e) => { e.stopPropagation(); stepDate(1); }}>›</button>
          </div>
          <div className="sr-row">
            <button className="sr-arrow" onClick={() => stepGuests(-1)}>‹</button>
            <div className="sr-center">
              <input type="number" value={guests === null ? "" : guests} onChange={(e) => setGuests(e.target.value === "" ? null : parseInt(e.target.value))} onFocus={() => setGuests(null)} style={{width: '60px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '1.5rem', fontWeight: 'bold', color: '#000'}} />
              <div className="sr-label">Guests</div>
            </div>
            <button className="sr-arrow" onClick={() => stepGuests(1)}>›</button>
          </div>
          <div className="sr-row" onClick={() => timeInputRef.current?.showPicker()}>
            <button className="sr-arrow" onClick={(e) => { e.stopPropagation(); stepTime(-1); }}>‹</button>
            <div className="sr-center"><div className="sr-value">{timeLabel}</div><div className="sr-label">Time</div></div>
            <button className="sr-arrow" onClick={(e) => { e.stopPropagation(); stepTime(1); }}>›</button>
          </div>
        </div>
        {isBlackout ? (
          <div style={{marginTop: '20px', textAlign: 'center', color: '#b91c1c', background: '#fee2e2', padding: '15px', borderRadius: '8px'}}>Closed today.</div>
        ) : (
          <button className="sr-search" onClick={() => setStep("details")}>Search</button>
        )}
        <div className="sr-foot">
          {range
            ? `Available: ${formatTimeLabel(range.open)} – ${formatTimeLabel(range.lastSlot)} · Max ${MAX_GUESTS} guests`
            : `Max party size: ${MAX_GUESTS} · 15 min slots`}
        </div>
      </main>
      <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
    </div>
  );
}

// --- COMPONENTE CLIENT DETAILS (Paso 2) ---
function ClientDetailsView({
  dateLabel, timeLabel, guests,
  formState, setFormState,
  setStep, onSubmitClientRes, handleSwitchToHostess
}) {
  const { firstName, lastName, phone, email, celebration, dietary, notes } = formState;
  const updateForm = (key, val) => setFormState(prev => ({ ...prev, [key]: val }));

  return (
    <div className="sr-page sr-form-step">
      <main className="sr-card">
        <header className="sr-header"><img className="sr-logo" src="/logo.png" alt="Logo" /></header>
        <div className="sr-summary"><div className="sr-summaryTitle">{dateLabel} · {timeLabel} · {guests} guests</div></div>
        <section className="sr-form">
          <div className="sr-formGrid">
            <div className="sr-field"><label className="sr-fieldLabel">First name</label><input className="sr-input" value={firstName} onChange={e => updateForm('firstName', e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Last name</label><input className="sr-input" value={lastName} onChange={e => updateForm('lastName', e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Telephone</label><input className="sr-input" value={phone} onChange={e => updateForm('phone', e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={email} onChange={e => updateForm('email', e.target.value)} /></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={celebration} onChange={e => updateForm('celebration', e.target.value)}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
            <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={dietary} onChange={e => updateForm('dietary', e.target.value)}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={notes} onChange={e => updateForm('notes', e.target.value)} /></div>
          </div>
          <div className="sr-actions">
            <button className="sr-btn" onClick={() => setStep("search")}>Back</button>
            <button className="sr-btn sr-btnPrimary" onClick={onSubmitClientRes}>Submit</button>
          </div>
        </section>
      </main>
      <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
    </div>
  );
}

/*******************************************************
 * BLOQUE 7 — APP (CONTROLLER PRINCIPAL)
 *******************************************************/
export default function App() {
  const [viewMode, setViewMode] = useState("client");
  const [step, setStep] = useState("search");
  const [dateISO, setDateISO] = useState(() => dateISOFromDate(new Date()));
  const [guests, setGuests] = useState(2);
  const [timeHHMM, setTimeHHMM] = useState("19:00");
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [activeTab, setActiveTab] = useState("reservations");
  const [activeFloor, setActiveFloor] = useState("BAR");
  const [rows, setRows] = useState([]);
  const [walkInForm, setWalkInForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    celebration: "None",
    dietary: "None",
    notes: "",
  });
  const [phoneResForm, setPhoneResForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    celebration: "None",
    dietary: "None",
    notes: "",
  });
  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    celebration: "None",
    dietary: "None",
    notes: "",
  });

  const dateLabel = useMemo(() => formatDateLabel(dateISO), [dateISO]);
  const timeLabel = useMemo(() => formatTimeLabel(timeHHMM), [timeHHMM]);

  // isBlackout ahora también cubre días fuera del horario del restaurante
  const isBlackout = useMemo(
    () => blackoutDates.includes(dateISO) || !isRestaurantOpen(dateISO),
    [dateISO, blackoutDates]
  );

  const history = useMemo(() => rows.filter((r) => r.status === "reserved"), [rows]);
  const waitList = useMemo(() => rows.filter((r) => r.status === "waitlist"), [rows]);
  const seatedList = useMemo(() => rows.filter((r) => r.status === "seated"), [rows]);
  const canceledList = useMemo(() => rows.filter((r) => r.status === "cancelled"), [rows]);

  useReservationsRealtime({ supabase, dateISO, setRows });

  const stepDate = (dir) => setDateISO((prev) => addDaysISO(prev, dir));
  const stepGuests = (dir) => setGuests((prev) => clampGuests((prev ?? 0) + dir));

  // stepTime ahora respeta el horario del restaurante: no puede salir del rango permitido
  const stepTime = (dir) => {
    const hours = getDayHours(dateISO);
    if (!hours) return;
    const open = minutesFromHHMM(hours.open);
    const lastSlot = minutesFromHHMM(hours.close) - LAST_RESERVATION_BUFFER;
    let mins = minutesFromHHMM(timeHHMM) + SLOT_MINUTES * dir;
    mins = Math.max(open, Math.min(lastSlot, mins));
    mins = Math.round(mins / SLOT_MINUTES) * SLOT_MINUTES;
    setTimeHHMM(hhmmFromMinutes(mins));
  };

  const handleSwitchToHostess = () => {
    const pass = prompt("Enter Hostess Password:");
    if (pass === HOSTESS_PASSWORD) setViewMode("hostess");
    else if (pass !== null) alert("Incorrect password");
  };

  const toggleBlackoutDate = (dateToToggle) => {
    if (!dateToToggle) return;
    if (blackoutDates.includes(dateToToggle)) setBlackoutDates(blackoutDates.filter((d) => d !== dateToToggle));
    else setBlackoutDates([...blackoutDates, dateToToggle]);
  };

  const handleTableSelection = (table) => {
    if (table.status !== "occ") alert(`Table ${table.id} | Capacity: ${table.cap}`);
  };

  // Helper para generar tokens de cancelación únicos (seguro)
  const generateToken = () => {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    } catch (_) {}
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  };

  const handleAddToWaitlist = async () => {
    if (isBlackout) return alert("Cannot add to waitlist on a closed day.");
    if (!walkInForm.firstName) return alert("First name is required.");

    const cancelToken = generateToken();

    const newEntry = {
      firstName: walkInForm.firstName.toUpperCase(),
      lastName: (walkInForm.lastName || "").toUpperCase(),
      guests: guests || 1,
      dateISO,
      timeHHMM,
      phone: walkInForm.phone || "",
      email: null,
      celebration: walkInForm.celebration || "None",
      dietary: walkInForm.dietary || "None",
      notes: walkInForm.notes || null,
      status: "waitlist",
      source: "walkin",
      cancel_token: cancelToken,
    };

    const { error } = await insertWaitlistRecord(newEntry);
    if (error) return alert("Error adding to wait list: " + error.message);

    // SMS de Waitlist (solo si hay phone)
    if (walkInForm.phone) {
      try {
        await fetch("/.netlify/functions/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "waitlist",
            phone: walkInForm.phone,
            firstName: walkInForm.firstName,
            guests: guests || 1,
            dateLabel,
            timeLabel,
            cancel_token: cancelToken,
          }),
        });
      } catch (e) {
        console.error("SMS waitlist fail:", e);
      }
    }

    setWalkInForm({ firstName: "", lastName: "", phone: "", celebration: "None", dietary: "None", notes: "" });
    setActiveTab("waitlist");
  };

  const handleAddPhoneReservation = async () => {
    if (isBlackout) return alert("Cannot make reservations on a closed day.");
    if (!phoneResForm.firstName || !phoneResForm.lastName || !phoneResForm.phone) {
      return alert("Name, Last Name and Phone are required.");
    }

    // Validación de horario
    if (!isTimeAllowed(dateISO, timeHHMM)) {
      const range = getAvailableTimeRange(dateISO);
      return alert(
        range
          ? `Reservations only accepted between ${formatTimeLabel(range.open)} and ${formatTimeLabel(range.lastSlot)}.`
          : "The restaurant is closed this day."
      );
    }

    const cancelToken = generateToken();

    const newRes = {
      firstName: phoneResForm.firstName.toUpperCase(),
      lastName: phoneResForm.lastName.toUpperCase(),
      guests: guests || 1,
      dateISO,
      timeHHMM,
      phone: phoneResForm.phone,
      email: phoneResForm.email || null,
      celebration: phoneResForm.celebration || "None",
      dietary: phoneResForm.dietary || "None",
      notes: phoneResForm.notes || null,
      status: "reserved",
      source: "reservation",
      cancel_token: cancelToken,
    };

    try {
      const { error } = await insertReservationRecord(newRes);
      if (error) throw error;

      // SMS confirmación (teléfono)
      try {
        await fetch("/.netlify/functions/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "confirm",
            phone: phoneResForm.phone,
            firstName: phoneResForm.firstName,
            dateLabel,
            timeLabel,
            guests,
            cancel_token: cancelToken,
          }),
        });
      } catch (smsErr) {
        console.error("SMS fail:", smsErr);
      }

      // Calendar
      const startISO = toLocalDateTimeISO(dateISO, timeHHMM);
      const endISO = addMinutesToLocalDateTimeISO(dateISO, timeHHMM, 90);
      await createCalendarEventService({ ...newRes, startISO, endISO });

      alert("✅ Phone reservation confirmed!");
      setPhoneResForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        celebration: "None",
        dietary: "None",
        notes: "",
      });
      setActiveTab("reservations");
    } catch (e) {
      console.error(e);
      alert("Error saving reservation.");
    }
  };

  const handleSeatParty = async (party) => {
    const { error } = await updatePartyToSeated(party.id);
    if (error) alert("Error seating party.");
  };

  const handleSaveEdit = async (id, data) => {
    const { error } = await updateReservationRecord(id, data);
    if (error) alert("Error updating reservation: " + error.message);
  };

  const handleCancelReservation = async (res) => {
    if (!window.confirm(`Cancel reservation for ${res.firstName} ${res.lastName}?`)) return;
    const { error } = await cancelReservation(res.id);
    if (error) alert("Error canceling reservation.");
  };

  const handleUnseatParty = async (party) => {
    const originalStatus = party.source === "walkin" ? "waitlist" : "reserved";
    const { error } = await revertPartyFromSeated(party.id, originalStatus);
    if (error) alert("Error reverting party.");
  };

  const handleNotifyReady = async (party) => {
    if (!party?.phone) return alert("No phone number available for this guest.");

    try {
      await fetch("/.netlify/functions/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "table_ready",
          phone: party.phone,
          firstName: party.firstName,
        }),
      });

      alert(`SMS sent! ${party.firstName} has been notified.`);
    } catch (e) {
      console.error("Notify fail:", e);
      alert("Error sending notification.");
    }
  };

  const handleClientSubmit = async () => {
    if (!clientForm.firstName || !clientForm.lastName || !clientForm.phone) {
      return alert("Por favor completa Nombre, Apellido y Teléfono.");
    }

    // Validación de horario
    if (!isTimeAllowed(dateISO, timeHHMM)) {
      const range = getAvailableTimeRange(dateISO);
      return alert(
        range
          ? `Reservations only accepted between ${formatTimeLabel(range.open)} and ${formatTimeLabel(range.lastSlot)}.`
          : "The restaurant is closed this day."
      );
    }

    const cancelToken = generateToken();

    const newRes = {
      firstName: clientForm.firstName.toUpperCase(),
      lastName: clientForm.lastName.toUpperCase(),
      guests,
      dateISO,
      timeHHMM,
      phone: clientForm.phone,
      email: clientForm.email,
      celebration: clientForm.celebration,
      dietary: clientForm.dietary,
      notes: clientForm.notes,
      status: "reserved",
      source: "reservation",
      cancel_token: cancelToken,
    };

    try {
      const { error } = await insertReservationRecord(newRes);
      if (error) throw error;

      // SMS confirmación (cliente)
      try {
        await fetch("/.netlify/functions/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "confirm",
            phone: clientForm.phone,
            firstName: clientForm.firstName,
            dateLabel,
            timeLabel,
            guests,
            cancel_token: cancelToken,
          }),
        });
      } catch (smsErr) {
        console.error("SMS fail:", smsErr);
      }

      // Calendar
      try {
        const startISO = toLocalDateTimeISO(dateISO, timeHHMM);
        const endISO = addMinutesToLocalDateTimeISO(dateISO, timeHHMM, 90);
        await createCalendarEventService({ ...newRes, startISO, endISO });
        alert("✅ ¡Reserva confirmada!");
      } catch (e) {
        alert("✅ Reserva guardada.");
      }

      setClientForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        celebration: "None",
        dietary: "None",
        notes: "",
      });
      setStep("search");
    } catch (e) {
      alert("Error saving reservation: " + e.message);
    }
  };

  // --- RENDER ---
  if (viewMode === "hostess") {
    return (
      <HostessView
        // Acciones
        onAddWaitlist={handleAddToWaitlist}
        onAddPhoneRes={handleAddPhoneReservation}
        onSeatParty={handleSeatParty}
        onUnseatParty={handleUnseatParty}
        onCancelRes={handleCancelReservation}
        onSaveEdit={handleSaveEdit}
        onNotifyReady={handleNotifyReady}
        toggleBlackoutDate={toggleBlackoutDate}
        handleTableSelection={handleTableSelection}
        setViewMode={setViewMode}

        // Estado y UI
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeFloor={activeFloor}
        setActiveFloor={setActiveFloor}
        isBlackout={isBlackout}
        dateISO={dateISO}
        setDateISO={setDateISO}
        dateLabel={dateLabel}
        stepDate={stepDate}
        guests={guests}
        setGuests={setGuests}
        stepGuests={stepGuests}
        timeHHMM={timeHHMM}
        setTimeHHMM={setTimeHHMM}
        timeLabel={timeLabel}
        stepTime={stepTime}

        // Datos
        walkInForm={walkInForm}
        setWalkInForm={setWalkInForm}
        phoneResForm={phoneResForm}
        setPhoneResForm={setPhoneResForm}
        waitList={waitList}
        history={history}
        seatedList={seatedList}
        canceledList={canceledList}
        blackoutDates={blackoutDates}
      />
    );
  }

  if (step === "search") {
    return (
      <ClientSearchView
        dateISO={dateISO}
        setDateISO={setDateISO}
        dateLabel={dateLabel}
        stepDate={stepDate}
        guests={guests}
        setGuests={setGuests}
        stepGuests={stepGuests}
        timeHHMM={timeHHMM}
        setTimeHHMM={setTimeHHMM}
        timeLabel={timeLabel}
        stepTime={stepTime}
        isBlackout={isBlackout}
        setStep={setStep}
        handleSwitchToHostess={handleSwitchToHostess}
      />
    );
  }

  return (
    <ClientDetailsView
      dateLabel={dateLabel}
      timeLabel={timeLabel}
      guests={guests}
      formState={clientForm}
      setFormState={setClientForm}
      setStep={setStep}
      onSubmitClientRes={handleClientSubmit}
      handleSwitchToHostess={handleSwitchToHostess}
    />
  );
}
