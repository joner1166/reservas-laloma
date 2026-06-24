// @ts-nocheck
/*******************************************************
 * BLOQUE 0 — IMPORTS
 *******************************************************/
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";
import logo from "/logo.png"; // Logo principal para la interfaz

/*******************************************************
 * BLOQUE 1 — CONFIG / CONSTANTES
 *******************************************************/
const MAX_GUESTS = 12;
const MAX_CLIENT_GUESTS = 25;
const SERVERS = ['JAIME 👴🏻🍋','NOE 🐪','APACHE 👴🏻','PANCHO 👨🏻‍🦲','CALERO 🎅🏻','HUGO 🧞','PATO 👰‍♂️🐍','EDGAR 🤓','VALENTIN 🧛‍♂️','WALTER 👳🏻‍♂️','DEYNI 🥦','SONIA 🦋','CHAKA SEGOVIA','SAMUEL'];
const COUNTRY_CODES = [
  { code: '+1',  label: '🇺🇸 +1'  },
  { code: '+52', label: '🇲🇽 +52' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+33', label: '🇫🇷 +33' },
  { code: '+34', label: '🇪🇸 +34' },
  { code: '+49', label: '🇩🇪 +49' },
];
const SLOT_MINUTES = 15;
const MAX_RESERVATIONS_PER_HOUR = 5;
const RESTAURANT_CAPACITY = 200;
const HOSTESS_PASSWORD = "162655";
const MANAGER_PASSWORD = "010690";

// Horarios por día (0=Dom, 1=Lun, ..., 6=Sáb)
const RESTAURANT_HOURS = {
  0: { open: "09:00", close: "23:00" }, // Domingo
  1: { open: "10:00", close: "23:00" }, // Lunes
  2: { open: "10:00", close: "23:00" }, // Martes
  3: { open: "10:00", close: "23:00" }, // Miércoles
  4: { open: "10:00", close: "23:00" }, // Jueves
  5: { open: "10:00", close: "24:00" }, // Viernes
  6: { open: "09:00", close: "24:00" }, // Sábado
};

// Tiempo mínimo antes del cierre para aceptar reservaciones (en minutos)
const LAST_RESERVATION_BUFFER = 0;
// Tiempo mínimo de anticipación para reservaciones same-day en client view (en minutos)
const SAME_DAY_BUFFER = 30;

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
    ...Array.from({ length: 7 }, (_, i) => ({ id: `${56 - i}`, cap: 4, top: '18%', left: `${9 + (i * 13.5)}%`, status: i % 3 === 0 ? 'occ' : 'av', shape: 'square' })),
    { id: '57', cap: 8, top: '48%', left: '18%', status: 'occ', shape: 'rect' }, { id: '58', cap: 8, top: '48%', left: '34%', status: 'av', shape: 'rect' }, { id: '59', cap: 8, top: '48%', left: '50%', status: 'occ', shape: 'rect' }, { id: '60', cap: 8, top: '48%', left: '66%', status: 'av', shape: 'rect' }, { id: '61', cap: 8, top: '48%', left: '82%', status: 'occ', shape: 'rect' },
    ...Array.from({ length: 7 }, (_, i) => ({ id: `${43 + i}`, cap: 4, top: '78%', left: `${9 + (i * 13.5)}%`, status: i % 2 === 0 ? 'av' : 'occ', shape: 'square' }))
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

function getTimeSlots(dateISO, applySameDayBuffer = false) {
  const hours = getDayHours(dateISO);
  if (!hours) return [];
  const open = minutesFromHHMM(hours.open);
  const lastSlot = minutesFromHHMM(hours.close) - LAST_RESERVATION_BUFFER;
  let earliest = open;
  if (applySameDayBuffer && dateISO === dateISOFromDate(new Date())) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    earliest = Math.max(open, Math.ceil((nowMins + SAME_DAY_BUFFER) / SLOT_MINUTES) * SLOT_MINUTES);
  }
  const slots = [];
  for (let m = earliest; m <= lastSlot; m += SLOT_MINUTES) slots.push(hhmmFromMinutes(m));
  return slots;
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

let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
}
function unlockAudio() {
  const ctx = _getAudioCtx();
  if (ctx?.state === 'suspended') ctx.resume();
}
function playAlertSound() {
  const ctx = _getAudioCtx();
  if (!ctx) return;
  const schedule = () => {
    [0, 0.35, 0.7, 1.2, 1.7, 2.1].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
  };
  if (ctx.state === 'suspended') ctx.resume().then(schedule);
  else schedule();
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

async function markPartyNotified(id) {
  return supabase
    .from("reservations")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id);
}

async function assignServersToTable(tableId, serverNames) {
  return supabase.from("table_status").update({ server_names: serverNames }).eq("id", tableId);
}

async function logTableOcc(tableId, serverNames, dateISO) {
  if (!serverNames?.length) return;
  const rows = serverNames.map(name => ({ table_id: tableId, server_name: name, date_iso: dateISO }));
  return supabase.from("table_events").insert(rows);
}

async function fetchTableEvents(dateISO) {
  return supabase.from("table_events").select("*").eq("date_iso", dateISO);
}

/*******************************************************
 * BLOQUE 4 — REALTIME (HOOK INTERNO)
 *******************************************************/
function useReservationsRealtime({ supabase, dateISO, setRows, onInsert }) {
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

          if (payload.eventType === "INSERT" && newRow?.dateISO === dateISO) {
            onInsert?.();
          }

          setRows((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((r) => r.id !== oldRow.id);
            if (payload.eventType === "INSERT") {
              if (prev.some((r) => r.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              if (newRow.dateISO !== dateISO) return prev.filter((r) => r.id !== newRow.id);
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

const HostessView = React.memo(function HostessView({
  // Acciones
  onAddWaitlist, onAddPhoneRes, onSeatParty, onUnseatParty, onCancelRes, onSaveEdit, onNotifyReady, onRemoveFromWaitlist, onUndoCancel, toggleBlackoutDate,
  handleTableSelection, setViewMode,

  // Estado y UI
  activeFloor, setActiveFloor, isBlackout, isWalkInOnly,
  dateISO, setDateISO, onDateChange, dateLabel, stepDate,
  guests, setGuests,
  estimatedWait, setEstimatedWait,
  timeHHMM, setTimeHHMM, timeLabel, stepTime,

  // Datos
  walkInForm, setWalkInForm, phoneResForm, setPhoneResForm,
  waitList, history, seatedList, canceledList, blackoutDates, tableStatuses, tableServerNames,
  walkinLoading, phoneResLoading
}) {
  const blackoutInputRef = useRef(null);
  const bookingDateRef = useRef(null);
  const headerDateRef = useRef(null);
  const autoCancelledRef = useRef(new Set());
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("hostessTab") || "reservations");
  useEffect(() => { localStorage.setItem("hostessTab", activeTab); }, [activeTab]);
  const [newResAlert, setNewResAlert] = useState(false);
  const notifChannelRef = useRef(null);
  const [editingRes, setEditingRes] = useState(null);
  const [editingWaitItem, setEditingWaitItem] = useState(null);
  const [blackoutForm, setBlackoutForm] = useState({ date: '', notes: '' });
  const [showWaitPicker, setShowWaitPicker] = useState(false);
  const [exitingIds, setExitingIds] = useState(new Set());
  const [assignMode, setAssignMode] = useState(false);
  const [unassignMode, setUnassignMode] = useState(false);
  const [assigningServers, setAssigningServers] = useState(new Set());
  const [pendingAssignTables, setPendingAssignTables] = useState(new Set());
  const [showAssignServerList, setShowAssignServerList] = useState(false);
  const [tableEvents, setTableEvents] = useState([]);
  useEffect(() => {
    fetchTableEvents(dateISO).then(({ data }) => setTableEvents(data || [])).catch(() => setTableEvents([]));
  }, [dateISO]);

  const mainRef = useRef(null);
  const notifiedCount = waitList.filter(i => i.notified_at).length + history.filter(i => i.notified_at).length;
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [notifiedCount]);

  const animateThenAct = (id, action) => {
    setExitingIds(prev => new Set([...prev, id]));
    action(); // acción inmediata, no espera la animación
    setTimeout(() => {
      setExitingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 200);
  };
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const [nowSec, setNowSec] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowSec(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    waitList.forEach(item => {
      if (!item.notified_at || autoCancelledRef.current.has(item.id)) return;
      const elapsed = nowSec - new Date(item.notified_at).getTime();
      if (elapsed >= 10 * 60 * 1000) {
        autoCancelledRef.current.add(item.id);
        onRemoveFromWaitlist(item);
      }
    });
  }, [nowSec, waitList]);

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
          <div className="sr-sidebar-header"><img src="/logohostessview.jpg" alt="Lindo Michoacán" className="sr-logo-small" /></div>
          <nav className="sr-sidebar-nav">
            <button className={activeTab === 'walkin' ? 'active' : ''} onClick={() => setActiveTab('walkin')}>Walk-in</button>
            <button className={activeTab === 'phoneres' ? 'active' : ''} onClick={() => setActiveTab('phoneres')}>Phone Reservation</button>
            <button className={activeTab === 'waitlist' ? 'active' : ''} onClick={() => setActiveTab('waitlist')}>Wait List ({waitList.length})</button>
            <button className={activeTab === 'reservations' ? 'active' : ''} onClick={() => { setActiveTab('reservations'); clearResAlert(); }}>Reservations ({history.length}){newResAlert && <span style={{ display: 'inline-block', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', fontWeight: '900', lineHeight: '16px', textAlign: 'center', marginLeft: '6px', verticalAlign: 'middle' }}>!</span>}</button>
            <button className={activeTab === 'seated' ? 'active' : ''} onClick={() => setActiveTab('seated')}>Seated ({seatedList.length})</button>
            <button className={activeTab === 'canceled' ? 'active' : ''} onClick={() => setActiveTab('canceled')} style={{color: activeTab === 'canceled' ? '#000' : '#ef4444'}}>Canceled ({canceledList.length})</button>
            <button className={activeTab === 'floorplan' ? 'active' : ''} onClick={() => setActiveTab('floorplan')}>Floor Plan</button>
            <button className={activeTab === 'servers' ? 'active' : ''} onClick={() => setActiveTab('servers')}>Servers</button>
            <button className={activeTab === 'blackout' ? 'active' : ''} onClick={() => setActiveTab('blackout')} style={{marginTop: 'auto', borderTop: '1px solid #eee', color: '#666'}}>Blackout</button>
          </nav>
        </aside>
        <section className="sr-hostess-main" ref={mainRef}>
          <header className="sr-main-header">
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
              <h2>{activeTab === 'walkin' ? 'New Walk-in' : activeTab === 'phoneres' ? 'New Phone Reservation' : activeTab === 'waitlist' ? 'Wait List' : activeTab === 'reservations' ? 'Reservations' : activeTab === 'seated' ? 'Seated History' : activeTab === 'canceled' ? 'Canceled' : activeTab === 'blackout' ? 'Manage Blackout' : activeTab === 'servers' ? 'Servers' : 'Floor Plan'}</h2>
              {isBlackout && <span style={{background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.64rem', fontWeight: 'bold'}}>CLOSED TODAY</span>}
              {isWalkInOnly && <span style={{background: '#f59e0b', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.64rem', fontWeight: 'bold'}}>ONLY WALK-IN</span>}
            </div>
            <div className="sr-hostess-date-picker" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="sr-btn-mini" onClick={() => stepDate(-1)}>‹</button>
              <div style={{ position: 'relative', cursor: 'pointer' }}>
                <div className="sr-current-date" style={{ fontWeight: '500' }}>{dateLabel}</div>
                <input ref={headerDateRef} type="date" value={dateISO} onChange={e => setDateISO(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
              </div>
              <button className="sr-btn-mini" onClick={() => stepDate(1)}>›</button>
              <button
                className="sr-btn-mini"
                onClick={() => window.location.reload()}
                title="Refresh"
                style={{ fontSize: '16px' }}
              >↺</button>
            </div>
          </header>
          <div className="sr-main-content">
            {activeTab === 'walkin' && (
              <div className="sr-walkin-form">
                {isBlackout && <div style={{padding: '15px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center'}}>⚠️ The restaurant is closed.</div>}
                {dateISO !== dateISOFromDate(new Date()) && <div style={{padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '12px', color: '#92400e', fontSize: '0.85rem'}}>Warning: You are viewing <strong>{dateLabel}</strong>, not today. Walk-ins cannot be added for this date.</div>}
                {isWalkInOnly && <div style={{padding: '12px 15px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', marginBottom: '16px', fontSize: '0.78rem', lineHeight: '1.6'}}>🚶 <strong>Only Walk-In today.</strong> If a customer calls to make a reservation, please tell them: <em>"We are only accepting walk-ins today, but please come by and we will try to seat you as fast as we can."</em></div>}
                <div style={{display:'flex', gap:'24px', justifyContent:'center', alignItems:'center', flexWrap:'wrap', marginBottom:'20px'}}>
                  <div style={{textAlign:'center', background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:'14px', padding:'12px 20px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)', minWidth:'110px'}}>
                    <label style={{fontSize:'0.62rem', fontWeight:'800', letterSpacing:'0.08em', color:'#6b7280', display:'block', marginBottom:'6px'}}>PARTY SIZE</label>
                    <input type="number" min="1" value={guests === null ? "" : guests} onChange={e => setGuests(e.target.value === "" ? null : parseInt(e.target.value))} disabled={isBlackout} style={{width:'60px', textAlign:'center', fontSize:'2rem', fontWeight:'800', border:'none', outline:'none', background:'transparent', color:'#111', display:'block', margin:'0 auto'}} />
                  </div>
                  <div style={{textAlign:'center', background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:'14px', padding:'12px 20px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)', minWidth:'130px', position:'relative'}}>
                    <label style={{fontSize:'0.62rem', fontWeight:'800', letterSpacing:'0.08em', color:'#6b7280', display:'block', marginBottom:'6px'}}>ESTIMATED WAIT</label>
                    <button onClick={() => !isBlackout && setShowWaitPicker(v => !v)} disabled={isBlackout} style={{fontSize:'2rem', fontWeight:'800', border:'none', background:'transparent', color:'#111', cursor:'pointer', padding:0, display:'block', margin:'0 auto', width:'100%'}}>
                      {estimatedWait}<span style={{fontSize:'1rem', fontWeight:'500', color:'#6b7280'}}> min</span>
                    </button>
                    {showWaitPicker && (
                      <div style={{position:'absolute', zIndex:50, top:'100%', left:'50%', transform:'translateX(-50%)', marginTop:'4px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:'10px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', padding:'10px', display:'flex', flexWrap:'wrap', gap:'6px', width:'220px', justifyContent:'center'}}>
                        {Array.from({length: 24}, (_, i) => (i + 1) * 5).map(m => (
                          <button key={m} onClick={() => { setEstimatedWait(m); setShowWaitPicker(false); }} style={{padding:'4px 10px', borderRadius:'20px', border:'1px solid #e5e7eb', background: estimatedWait === m ? '#111' : '#f9fafb', color: estimatedWait === m ? '#fff' : '#111', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer'}}>
                            {m} min
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="sr-formGrid" style={{marginTop: '20px'}}>
                  <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={walkInForm.firstName} onChange={e => setWalkInForm({...walkInForm, firstName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={walkInForm.lastName} onChange={e => setWalkInForm({...walkInForm, lastName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Phone</label><div style={{display:'flex',gap:'6px'}}><select className="sr-input" style={{width:'95px',flexShrink:0}} value={walkInForm.phoneCode} onChange={e => setWalkInForm({...walkInForm, phoneCode: e.target.value})} disabled={isBlackout}>{COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select><input className="sr-input" style={{flex:1}} value={walkInForm.phone} onChange={e => setWalkInForm({...walkInForm, phone: e.target.value})} placeholder="000-000-0000" disabled={isBlackout}/></div></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={walkInForm.celebration} onChange={e => setWalkInForm({...walkInForm, celebration: e.target.value})} disabled={isBlackout}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={walkInForm.dietary} onChange={e => setWalkInForm({...walkInForm, dietary: e.target.value})} disabled={isBlackout}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
                  <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={walkInForm.notes} onChange={e => setWalkInForm({...walkInForm, notes: e.target.value})} disabled={isBlackout}/></div>
                </div>
                <p style={{fontSize:'0.72rem',color:'#94a3b8',margin:'16px 0 0',lineHeight:'1.5'}}><strong style={{color:'#ef4444'}}>IMPORTANT NOTE:</strong> By providing their phone number, the guest consents to receive up to 2 SMS notifications (waitlist confirmation + table ready). Msg &amp; data rates may apply. Reply <strong>STOP</strong> to opt out.</p>
                <button className="sr-btn sr-btnPrimary" style={{marginTop: '20px', opacity: (isBlackout || walkinLoading) ? 0.5 : 1}} onClick={async () => { const ok = await onAddWaitlist(); if (ok) setActiveTab("waitlist"); }} disabled={isBlackout || walkinLoading}>{walkinLoading ? 'Adding...' : 'Add to Wait List'}</button>
              </div>
            )}
            {activeTab === 'phoneres' && (
              <div className="sr-walkin-form">
                {isBlackout && <div style={{padding: '15px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center'}}>⚠️ The restaurant is closed.</div>}
                {isWalkInOnly && <div style={{padding: '12px 15px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', marginBottom: '16px', fontSize: '0.78rem', lineHeight: '1.6'}}>🚶 <strong>Only Walk-In today.</strong> If a customer calls to make a reservation, please tell them: <em>"We are only accepting walk-ins today, but please come by and we will try to seat you as fast as we can."</em></div>}
                {!isBlackout && range && (
                  <div style={{padding: '10px 15px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', marginBottom: '16px', fontSize: '0.68rem', textAlign: 'center'}}>
                    Reservations accepted: {formatTimeLabel(range.open)} – {formatTimeLabel(range.lastSlot)}
                  </div>
                )}
                <div className="sr-booking-bar" style={{marginBottom: '25px'}}>
                  <div className="sr-booking-field" style={{cursor: 'pointer'}} onClick={() => bookingDateRef.current?.showPicker()}>
                    <label className="sr-fieldLabel" style={{cursor: 'pointer'}}>Date</label>
                    <input ref={bookingDateRef} type="date" className="sr-booking-input" value={dateISO} onChange={e => onDateChange(e.target.value)} disabled={isBlackout} />
                  </div>
                  <div className="sr-booking-divider" />
                  <div className="sr-booking-field">
                    <label className="sr-fieldLabel">Time</label>
                    <select className="sr-booking-input" value={timeHHMM} onChange={e => setTimeHHMM(e.target.value)} disabled={isBlackout}>
                      {getTimeSlots(dateISO).map(slot => (
                        <option key={slot} value={slot}>{formatTimeLabel(slot)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sr-booking-divider" />
                  <div className="sr-booking-field">
                    <label className="sr-fieldLabel">Guests</label>
                    <input type="number" className="sr-booking-input" min="1" placeholder="—" value={guests === null ? '' : guests} onChange={e => setGuests(e.target.value === '' ? null : parseInt(e.target.value))} onFocus={() => setGuests(null)} disabled={isBlackout} />
                  </div>
                </div>
                <div className="sr-formGrid">
                  <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={phoneResForm.firstName} onChange={e => setPhoneResForm({...phoneResForm, firstName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={phoneResForm.lastName} onChange={e => setPhoneResForm({...phoneResForm, lastName: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Phone</label><div style={{display:'flex',gap:'6px'}}><select className="sr-input" style={{width:'95px',flexShrink:0}} value={phoneResForm.phoneCode} onChange={e => setPhoneResForm({...phoneResForm, phoneCode: e.target.value})} disabled={isBlackout}>{COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select><input className="sr-input" style={{flex:1}} value={phoneResForm.phone} onChange={e => setPhoneResForm({...phoneResForm, phone: e.target.value})} placeholder="000-000-0000" disabled={isBlackout}/></div></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={phoneResForm.email} onChange={e => setPhoneResForm({...phoneResForm, email: e.target.value})} disabled={isBlackout}/></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={phoneResForm.celebration} onChange={e => setPhoneResForm({...phoneResForm, celebration: e.target.value})} disabled={isBlackout}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
                  <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={phoneResForm.dietary} onChange={e => setPhoneResForm({...phoneResForm, dietary: e.target.value})} disabled={isBlackout}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
                  <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={phoneResForm.notes} onChange={e => setPhoneResForm({...phoneResForm, notes: e.target.value})} disabled={isBlackout}/></div>
                </div>
                <button className="sr-btn sr-btnPrimary" style={{marginTop: '20px', opacity: (isBlackout || phoneResLoading) ? 0.5 : 1}} onClick={async () => { const ok = await onAddPhoneRes(); if (ok) setActiveTab("reservations"); }} disabled={isBlackout || phoneResLoading}>{phoneResLoading ? 'Saving...' : 'Confirm Phone Reservation'}</button>
              </div>
            )}
            {activeTab === 'waitlist' && (
              <div className="sr-res-list">
                {waitList.length === 0 ? <p>No guests in wait list.</p> : [...waitList].sort((a, b) => {
                  const nA = a.notified_at ? 1 : 0, nB = b.notified_at ? 1 : 0;
                  if (nB !== nA) return nB - nA;
                  return new Date(a.created_at) - new Date(b.created_at);
                }).map(item => (
                  <div key={item.id} className={`sr-list-item${exitingIds.has(item.id) ? ' sr-item-exit' : ''}`} style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(item.notified_at ? {borderLeft: '4px solid rgba(15, 40, 80, 0.85)', borderBottom: 'none', background: 'rgba(15, 40, 80, 0.15)', boxShadow: '0 2px 14px rgba(15, 40, 80, 0.28)', borderRadius: '10px', margin: '4px 8px'} : {})}}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong>{item.firstName} {item.lastName}</strong>
                        <span style={{ background: '#111', color: '#fff', borderRadius: '8px', padding: '2px 10px', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.3px' }}>👥 {item.guests} guests</span>
                        {item.created_at && (() => {
                          const mins = Math.floor((now - new Date(item.created_at).getTime()) / 60000);
                          const color = mins >= 30 ? '#ef4444' : mins >= 15 ? '#f59e0b' : '#22c55e';
                          return (
                            <span style={{ background: color, color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '0.62rem', fontWeight: '700' }}>
                              {mins < 1 ? '< 1 min' : `${mins} min`}
                            </span>
                          );
                        })()}
                        {item.estimated_wait && item.created_at && (() => {
                          const endTime = new Date(item.created_at).getTime() + item.estimated_wait * 60000;
                          const remaining = Math.max(0, endTime - nowSec);
                          const mins = Math.floor(remaining / 60000);
                          const secs = Math.floor((remaining % 60000) / 1000);
                          const isExpired = remaining === 0;
                          const color = isExpired ? '#ef4444' : remaining < 2 * 60 * 1000 ? '#f59e0b' : '#3b82f6';
                          return (
                            <span style={{ background: color, color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '0.62rem', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                              {isExpired ? '⚠️ Wait exp.' : `⏳ ${mins}:${String(secs).padStart(2, '0')}`}
                            </span>
                          );
                        })()}
                      </div>
                      <small style={{ color: '#999' }}>In at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      {item.celebration && item.celebration !== "None" && <div style={{ fontSize: '0.68rem', color: '#d4ab00', marginTop: '2px' }}>🎉 {item.celebration}</div>}
                      {item.dietary && item.dietary !== "None" && <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '2px' }}>🥗 {item.dietary}</div>}
                      {item.notes && <div style={{ fontSize: '0.68rem', fontStyle: 'italic', color: '#666', marginTop: '2px' }}>📝 "{item.notes}"</div>}
                      {item.phone && <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>📞 {item.phone}</div>}
                      {item.notified_at && (() => {
                        const remaining = Math.max(0, 10 * 60 * 1000 - (nowSec - new Date(item.notified_at).getTime()));
                        const mins = Math.floor(remaining / 60000);
                        const secs = Math.floor((remaining % 60000) / 1000);
                        const isExpired = remaining === 0;
                        const color = isExpired ? '#ef4444' : remaining < 2 * 60 * 1000 ? '#f59e0b' : '#22c55e';
                        return (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>⏱ Hold time:</span>
                            <span style={{ fontSize: '0.76rem', fontWeight: '800', color, fontVariantNumeric: 'tabular-nums' }}>
                              {isExpired ? '⚠️ Expired' : `${mins}:${String(secs).padStart(2, '0')}`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setEditingWaitItem({...item})} style={{ ...seatButtonStyle, fontSize: '0.75rem', padding: '8px 12px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}>Edit</button>
                      <button
                        style={{ ...seatButtonStyle, fontSize: '0.75rem', padding: '8px 12px', border: 'none', background: item.notified_at ? '#16a34a' : '#000', color: '#fff', cursor: item.notified_at ? 'default' : 'pointer' }}
                        onClick={() => !item.notified_at && onNotifyReady(item)}
                      >
                        {item.notified_at ? '✓ Notified' : '💬 Notify'}
                      </button>
                      <button style={seatButtonStyle} onClick={() => animateThenAct(item.id, () => onSeatParty(item))}>
                        Seat
                      </button>
                      <button style={{ ...seatButtonStyle, fontSize: '0.75rem', padding: '8px 12px', background: '#fee2e2', color: '#b91c1c' }} onClick={() => animateThenAct(item.id, () => onRemoveFromWaitlist(item))}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'reservations' && (
              <div className="sr-res-list">
                {history.length === 0 ? <p>No active reservations.</p> : history.map(res => (
                  <div key={res.id} className={`sr-list-item${exitingIds.has(res.id) ? ' sr-item-exit' : ''}`} style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(res.notified_at ? {borderLeft: '4px solid rgba(15, 40, 80, 0.85)', borderBottom: 'none', background: 'rgba(15, 40, 80, 0.15)', boxShadow: '0 2px 14px rgba(15, 40, 80, 0.28)', borderRadius: '10px', margin: '4px 8px'} : {})}}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><strong style={{ fontSize: '0.88rem' }}>{res.firstName} {res.lastName}</strong><span style={{ background: '#111', color: '#fff', borderRadius: '10px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.3px' }}>👥 {res.guests} guests</span></div>
                        <span style={{ fontWeight: '700' }}>{res.timeHHMM ? formatTimeLabel(res.timeHHMM) : ""}</span>
                      </div>
                      {res.celebration && res.celebration !== "None" && <div style={{ fontSize: '0.68rem', color: '#d4ab00', marginTop: '4px' }}>🎉 {res.celebration}</div>}
                      {res.dietary && res.dietary !== "None" && <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '2px' }}>🥗 {res.dietary}</div>}
                      {res.notes && <div style={{ color: '#555', fontSize: '0.68rem', background: '#f8f8f8', padding: '6px 12px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>"{res.notes}"</div>}
                      {res.phone && <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>📞 {res.phone}</div>}
                      {res.notified_at && (() => {
                        const remaining = Math.max(0, 10 * 60 * 1000 - (nowSec - new Date(res.notified_at).getTime()));
                        const mins = Math.floor(remaining / 60000);
                        const secs = Math.floor((remaining % 60000) / 1000);
                        const isExpired = remaining === 0;
                        const color = isExpired ? '#ef4444' : remaining < 2 * 60 * 1000 ? '#f59e0b' : '#22c55e';
                        return (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>⏱ Hold time:</span>
                            <span style={{ fontSize: '0.76rem', fontWeight: '800', color, fontVariantNumeric: 'tabular-nums' }}>
                              {isExpired ? '⚠️ Expired' : `${mins}:${String(secs).padStart(2, '0')}`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button style={seatButtonStyle} onClick={() => animateThenAct(res.id, () => onSeatParty(res))}>Seat</button>
                      <button style={{ ...seatButtonStyle, fontSize: '0.75rem', padding: '8px 12px', background: res.notified_at ? '#16a34a' : '#000', color: '#fff', cursor: res.notified_at ? 'default' : 'pointer' }} onClick={() => !res.notified_at && onNotifyReady(res)}>{res.notified_at ? '✓ Notified' : '💬 Notify'}</button>
                      <button style={{ ...seatButtonStyle, background: '#f3f4f6', color: '#374151', boxShadow: 'none', border: '1px solid #d1d5db', fontSize: '0.75rem', padding: '8px 12px' }} onClick={() => setEditingRes({...res})}>Edit</button>
                      <button style={{ ...seatButtonStyle, background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', padding: '8px 12px' }} onClick={() => animateThenAct(res.id, () => onCancelRes(res))}>Cancel</button>
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
                        <div><strong style={{ fontSize: '0.88rem' }}>{item.firstName} {item.lastName}</strong><span style={{ color: '#666', marginLeft: '8px' }}>({item.guests} pax)</span></div>
                        <span style={{ fontWeight: '700', color: '#22c55e' }}>Seated {item.seated_at ? new Date(item.seated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                      </div>
                      {item.timeHHMM && <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '2px' }}>Res. time: {formatTimeLabel(item.timeHHMM)}</div>}
                      {item.celebration && item.celebration !== "None" && <div style={{ fontSize: '0.68rem', color: '#d4ab00', marginTop: '4px' }}>🎉 {item.celebration}</div>}
                      {item.dietary && item.dietary !== "None" && <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '2px' }}>🥗 {item.dietary}</div>}
                      {item.notes && <div style={{ color: '#555', fontSize: '0.68rem', background: '#f8f8f8', padding: '6px 12px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>"{item.notes}"</div>}
                      {item.phone && <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>📞 {item.phone}</div>}
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
                        <div><strong style={{ fontSize: '1.1rem', textDecoration: 'line-through', color: '#9ca3af' }}>{item.firstName} {item.lastName}</strong><span style={{ color: '#9ca3af', marginLeft: '8px' }}>({item.guests} pax)</span>{item.notified_at && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '0.62rem', fontWeight: '800', marginLeft: '8px', verticalAlign: 'middle' }}>Didn't Show</span>}</div>
                        <span style={{ fontWeight: '700', color: '#9ca3af' }}>{item.timeHHMM ? formatTimeLabel(item.timeHHMM) : ""}</span>
                      </div>
                      {item.phone && <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '2px' }}>📞 {item.phone}</div>}
                      {item.notes && <div style={{ color: '#9ca3af', fontSize: '0.68rem', marginTop: '4px', fontStyle: 'italic' }}>"{item.notes}"</div>}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <button style={{ ...seatButtonStyle, fontSize: '0.75rem', padding: '8px 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }} onClick={() => onUndoCancel(item)}>
                        Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'floorplan' && (
              <>
              <div className="sr-floor-manager">
                <div className="sr-floor-header">
                  <div className="sr-zone-selector">
                    {Object.keys(FLOOR_CONFIG).map(f => (
                      <button key={f} className={activeFloor === f ? 'active' : ''} onClick={() => setActiveFloor(f)}>{f}</button>
                    ))}
                  </div>
                  <div className="sr-floor-legend">
                    <span className="sr-legend-dot available" /><span>Available</span>
                    <span className="sr-legend-dot occupied" /><span>Occupied</span>
                  </div>
                  <button onClick={async () => {
                    if (!window.confirm('Clear ALL server assignments for all floors?')) return;
                    const allKeys = Object.keys(FLOOR_CONFIG).flatMap(floor =>
                      FLOOR_CONFIG[floor].map(t => `${floor}-${t.id}`)
                    );
                    await supabase.from('table_status').update({ server_names: [], status: 'av' }).in('id', allKeys);
                  }} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 10px', fontWeight: '700', fontSize: '0.68rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Clear All
                  </button>
                  {!assignMode && !unassignMode ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowAssignServerList(p => !p)} style={{ background: '#f2c300', color: '#000', border: 'none', borderRadius: '8px', padding: '4px 10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Assign Tables ▾
                        </button>
                        {showAssignServerList && (
                          <div style={{ position: 'absolute', top: '110%', right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '8px', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                            {SERVERS.map(name => (
                              <button key={name} onClick={() => setAssigningServers(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; })}
                                style={{ display: 'block', width: '100%', textAlign: 'left', background: assigningServers.has(name) ? '#3b82f6' : 'transparent', color: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px 10px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}>
                                {name}
                              </button>
                            ))}
                            <div style={{ borderTop: '1px solid #334155', marginTop: '6px', paddingTop: '6px' }}>
                              <button onClick={() => { if (assigningServers.size > 0) { setAssignMode(true); setShowAssignServerList(false); } }}
                                style={{ width: '100%', background: assigningServers.size > 0 ? '#22c55e' : '#334155', color: assigningServers.size > 0 ? '#fff' : '#64748b', border: 'none', borderRadius: '6px', padding: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: assigningServers.size > 0 ? 'pointer' : 'default' }}>
                                Assign {assigningServers.size > 0 ? `(${assigningServers.size}) →` : ''}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setUnassignMode(true); setPendingAssignTables(new Set()); }}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Unassign
                      </button>
                    </div>
                  ) : assignMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {[...assigningServers].map(n => n.split(' ')[0]).join(', ')} — {pendingAssignTables.size}
                      </span>
                      <button onClick={async () => {
                        await Promise.all([...pendingAssignTables].map(id => assignServersToTable(id, [...assigningServers])));
                        setAssignMode(false); setAssigningServers(new Set()); setPendingAssignTables(new Set());
                      }} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Confirm
                      </button>
                      <button onClick={() => { setAssignMode(false); setAssigningServers(new Set()); setPendingAssignTables(new Set()); }}
                        style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '8px', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        Remove: {pendingAssignTables.size} table(s)
                      </span>
                      <button onClick={async () => {
                        await Promise.all([...pendingAssignTables].map(id => assignServersToTable(id, [])));
                        setUnassignMode(false); setPendingAssignTables(new Set());
                      }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Confirm
                      </button>
                      <button onClick={() => { setUnassignMode(false); setPendingAssignTables(new Set()); }}
                        style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '8px', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div className="sr-map-canvas">
                  <div className="sr-image-wrapper">
                    <img src={activeFloor === 'BAR' ? '/BAR.png' : activeFloor === 'ROOM1' ? '/FLOOR 1.jpg' : activeFloor === 'ROOM2' ? '/ROOM 2.jpg' : '/ROOM 3.jpg'} alt={activeFloor} className="sr-floor-img" onError={e => { e.target.style.display = 'none'; }} />
                    {FLOOR_CONFIG[activeFloor].map(table => {
                      const key = `${activeFloor}-${table.id}`;
                      const status = tableStatuses[key] ?? 'av';
                      const servers = tableServerNames?.[key] ?? [];
                      return (
                        <button
                          key={table.id}
                          className={`sr-table-marker shape-${table.shape || 'square'} ${status === 'occ' ? 'is-occupied' : 'is-available'}`}
                          style={{ top: table.top, left: table.left, outline: assignMode && pendingAssignTables.has(key) ? '3px solid #22c55e' : unassignMode && pendingAssignTables.has(key) ? '3px solid #ef4444' : undefined, outlineOffset: '2px' }}
                          onClick={() => {
                            if (assignMode || unassignMode) {
                              setPendingAssignTables(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
                            } else {
                              handleTableSelection(table);
                            }
                          }}
                        >
                          <span className="table-id">{table.id}</span>
                          <span className="table-cap">{table.cap}p</span>
                          {servers.length > 0 && (
                            <span style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', background: '#1d4ed8', color: '#fff', fontSize: '7px', fontWeight: '800', borderRadius: '4px', padding: '1px 3px', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                              {servers.map(n => n[0]).join(' ')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              </>
            )}
            {activeTab === 'blackout' && (
              <div className="sr-walkin-form">
                <div className="sr-formGrid" style={{marginBottom: '16px'}}>
                  <div className="sr-field">
                    <label className="sr-fieldLabel">Date</label>
                    <input
                      ref={blackoutInputRef}
                      type="date"
                      className="sr-input"
                      style={{cursor: 'pointer'}}
                      value={blackoutForm.date}
                      onChange={e => setBlackoutForm(f => ({ ...f, date: e.target.value }))}
                      onClick={() => blackoutInputRef.current?.showPicker()}
                    />
                  </div>
                  <div className="sr-field">
                    <label className="sr-fieldLabel">Reason</label>
                    <input
                      className="sr-input"
                      placeholder="e.g. Evento privado, Chismas…"
                      value={blackoutForm.notes}
                      onChange={e => setBlackoutForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                  <button
                    className="sr-btn"
                    disabled={!blackoutForm.date}
                    style={{background: '#ef4444', color: '#fff', flex: 1, opacity: !blackoutForm.date ? 0.5 : 1}}
                    onClick={async () => {
                      await toggleBlackoutDate(blackoutForm.date, blackoutForm.notes, 'closed');
                      setBlackoutForm({ date: '', notes: '' });
                    }}
                  >
                    🚫 Closed Today
                  </button>
                  <button
                    className="sr-btn"
                    disabled={!blackoutForm.date}
                    style={{background: '#f59e0b', color: '#fff', flex: 1, opacity: !blackoutForm.date ? 0.5 : 1}}
                    onClick={async () => {
                      await toggleBlackoutDate(blackoutForm.date, blackoutForm.notes, 'walkin_only');
                      setBlackoutForm({ date: '', notes: '' });
                    }}
                  >
                    🚶 Only Walk-In
                  </button>
                </div>

                <div style={{marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {blackoutDates.length === 0 && <p style={{color: '#999', fontSize: '0.72rem'}}>No blocked dates.</p>}
                  {blackoutDates.map(b => (
                    <div key={b.date_iso} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: b.type === 'walkin_only' ? '#fffbeb' : '#fff5f5', border: `1px solid ${b.type === 'walkin_only' ? '#fcd34d' : '#fecaca'}`, borderRadius: '10px', padding: '12px 16px'}}>
                      <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span style={{fontWeight: '700', fontSize: '0.76rem'}}>{b.date_iso}</span>
                          <span style={{fontSize: '0.6rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', background: b.type === 'walkin_only' ? '#f59e0b' : '#ef4444', color: '#fff'}}>
                            {b.type === 'walkin_only' ? 'WALK-IN' : 'CLOSED'}
                          </span>
                        </div>
                        {b.notes && <div style={{fontSize: '0.66rem', color: b.type === 'walkin_only' ? '#92400e' : '#b91c1c', marginTop: '2px'}}>{b.notes}</div>}
                      </div>
                      <button
                        style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.1rem', fontWeight: '700', padding: '4px 8px'}}
                        onClick={() => toggleBlackoutDate(b.date_iso)}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'servers' && (
              <div className="sr-walkin-form">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {SERVERS.map(name => {
                    const myCount = tableEvents.filter(e => e.server_name === name).length;
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px 16px' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#f1f5f9' }}>{name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: myCount > 0 ? '#f87171' : '#475569' }}>{myCount}</div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '600' }}>tables today</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <button className="sr-view-toggle" onClick={() => { setViewMode("client"); localStorage.removeItem("viewMode"); }}>Return to Client View</button>
      {editingWaitItem && (
        <div className="sr-modal-overlay" onClick={() => setEditingWaitItem(null)}>
          <div className="sr-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{margin: '0 0 20px', fontSize: '0.96rem', fontWeight: '800'}}>Edit Walk-in</h3>
            <div className="sr-formGrid">
              <div className="sr-field">
                <label className="sr-fieldLabel">Guests</label>
                <input className="sr-input" type="number" min="1" value={editingWaitItem.guests ?? ''} onFocus={e => e.target.select()} onChange={e => setEditingWaitItem({...editingWaitItem, guests: e.target.value === '' ? '' : parseInt(e.target.value) || 1})} />
              </div>
              <div className="sr-field sr-span2">
                <label className="sr-fieldLabel">Notes</label>
                <textarea className="sr-textarea" value={editingWaitItem.notes || ''} onChange={e => setEditingWaitItem({...editingWaitItem, notes: e.target.value})} />
              </div>
            </div>
            <div className="sr-actions" style={{marginTop: '20px'}}>
              <button className="sr-btn" onClick={() => setEditingWaitItem(null)}>Cancel</button>
              <button className="sr-btn sr-btnPrimary" onClick={async () => {
                await updateReservationRecord(editingWaitItem.id, { guests: editingWaitItem.guests, notes: editingWaitItem.notes });
                setEditingWaitItem(null);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {editingRes && (
        <div className="sr-modal-overlay" onClick={() => setEditingRes(null)}>
          <div className="sr-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{margin: '0 0 20px', fontSize: '0.96rem', fontWeight: '800'}}>Edit Reservation</h3>
            <div className="sr-formGrid">
              <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={editingRes.firstName} onChange={e => setEditingRes({...editingRes, firstName: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={editingRes.lastName} onChange={e => setEditingRes({...editingRes, lastName: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Phone</label><input className="sr-input" value={editingRes.phone || ''} onChange={e => setEditingRes({...editingRes, phone: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={editingRes.email || ''} onChange={e => setEditingRes({...editingRes, email: e.target.value})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Date</label><input className="sr-input" type="date" style={{cursor:'pointer'}} value={editingRes.dateISO || ''} onChange={e => setEditingRes({...editingRes, dateISO: e.target.value, timeHHMM: getTimeSlots(e.target.value)[0] || editingRes.timeHHMM})} onClick={e => e.target.showPicker()} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Time</label><select className="sr-input" value={editingRes.timeHHMM || ''} onChange={e => setEditingRes({...editingRes, timeHHMM: e.target.value})}>{getTimeSlots(editingRes.dateISO).map(slot => (<option key={slot} value={slot}>{formatTimeLabel(slot)}</option>))}</select></div>
              <div className="sr-field"><label className="sr-fieldLabel">Guests</label><input className="sr-input" type="number" min="1" placeholder="—" value={editingRes.guests ?? ''} onFocus={e => e.target.select()} onChange={e => setEditingRes({...editingRes, guests: e.target.value === '' ? '' : parseInt(e.target.value) || 1})} /></div>
              <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={editingRes.celebration || 'None'} onChange={e => setEditingRes({...editingRes, celebration: e.target.value})}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
              <div className="sr-field"><label className="sr-fieldLabel">Dietary</label><select className="sr-input" value={editingRes.dietary || 'None'} onChange={e => setEditingRes({...editingRes, dietary: e.target.value})}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
              <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={editingRes.notes || ''} onChange={e => setEditingRes({...editingRes, notes: e.target.value})} /></div>
            </div>
            <div className="sr-actions" style={{marginTop: '20px'}}>
              <button className="sr-btn" onClick={() => setEditingRes(null)}>Cancel</button>
              <button className="sr-btn sr-btnPrimary" onClick={async () => { await onSaveEdit(editingRes.id, { firstName: editingRes.firstName, lastName: editingRes.lastName, phone: editingRes.phone, email: editingRes.email, guests: editingRes.guests, dateISO: editingRes.dateISO, timeHHMM: editingRes.timeHHMM, celebration: editingRes.celebration, dietary: editingRes.dietary, notes: editingRes.notes }); setEditingRes(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// --- COMPONENTE CLIENT CONFIRMATION (Paso 3) ---
const ClientConfirmationView = React.memo(function ClientConfirmationView({ firstName, setStep, setClientForm }) {
  return (
    <div className="sr-page">
      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', textAlign: 'center', padding: '40px 20px', gap: '32px'
      }}>
        <img src="/logo.png" alt="Logo" style={{ width: '220px', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.9))' }} />
        <div style={{ color: '#f2c300', fontSize: '1.1rem', fontWeight: '700', letterSpacing: '4px', textTransform: 'uppercase' }}>
          Reservation Confirmed
        </div>
        <div style={{ color: '#fff', fontSize: '2.6rem', fontWeight: '900', lineHeight: '1.2', maxWidth: '600px' }}>
          Thank you for your reservation,<br />
          <span style={{ color: '#f2c300' }}>{firstName}</span>!
        </div>
        <div style={{ color: '#ccc', fontSize: '1.4rem', fontWeight: '400', letterSpacing: '1px' }}>
          We look forward to seeing you soon.
        </div>
        <button
          onClick={() => {
            setClientForm({ firstName: '', lastName: '', phone: '', phoneCode: '+1', email: '', celebration: 'None', dietary: 'None', notes: '', smsOptIn: false });
            setStep('search');
          }}
          style={{
            marginTop: '20px', background: '#f2c300', color: '#000', border: 'none',
            padding: '14px 40px', borderRadius: '14px', fontSize: '1rem', fontWeight: '800',
            cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase'
          }}
        >
          Make Another Reservation
        </button>
      </main>
    </div>
  );
});

// --- COMPONENTE CLIENT SEARCH (Paso 1) ---
const ClientSearchView = React.memo(function ClientSearchView({
  dateISO, onDateChange, dateLabel, stepDate,
  guests, setGuests,
  timeHHMM, setTimeHHMM,
  isBlackout, isWalkInOnly, setStep, handleSwitchToHostess,
  bookedHourCounts, bookedHourGuests
}) {
  const range = getAvailableTimeRange(dateISO);
  const [tick, setTick] = useState(0);
  const [searchError, setSearchError] = useState('');
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const availableSlots = getTimeSlots(dateISO, true).filter(slot => {
    const hour = Math.floor(minutesFromHHMM(slot) / 60);
    return (bookedHourCounts[hour] || 0) < MAX_RESERVATIONS_PER_HOUR &&
           (bookedHourGuests[hour] || 0) < RESTAURANT_CAPACITY;
  });
  // Auto-reset time if selected slot is no longer available (e.g. same-day cutoff advancing)
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(timeHHMM)) {
      setTimeHHMM(availableSlots[0]);
    }
  }, [dateISO, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sr-page">
      <main className="sr-card">
        <header className="sr-header"><img className="sr-logo" src="/logo.png" alt="Logo" /></header>
        <div className="sr-rows">
          <div className="sr-row">
            <button className="sr-arrow" style={{ position: 'relative', zIndex: 3 }} onClick={(e) => { e.stopPropagation(); setSearchError(''); stepDate(-1); }}>‹</button>
            <div className="sr-center" style={{ position: 'relative' }}>
              <div className="sr-value">{dateLabel}</div>
              <div className="sr-label">Date</div>
              <input type="date" value={dateISO} min={dateISOFromDate(new Date())} onChange={(e) => { setSearchError(''); onDateChange(e.target.value); }}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
            </div>
            <button className="sr-arrow" style={{ position: 'relative', zIndex: 3 }} onClick={(e) => { e.stopPropagation(); setSearchError(''); stepDate(1); }}>›</button>
          </div>
          <div className="sr-row" style={{cursor: 'default'}}>
            <div className="sr-center" style={{gridColumn: '1 / -1'}}>
              <input
                type="number"
                min="1"
                max={MAX_CLIENT_GUESTS}
                inputMode="numeric"
                value={guests === null ? '' : guests}
                onChange={e => setGuests(e.target.value === '' ? null : Math.min(parseInt(e.target.value) || 1, MAX_CLIENT_GUESTS))}
                style={{
                  width: '90px', textAlign: 'center', fontSize: '1.8rem', fontWeight: '800',
                  border: 'none', outline: 'none', background: 'transparent', color: '#111',
                  display: 'block', margin: '0 auto',
                  MozAppearance: 'textfield', WebkitAppearance: 'none',
                }}
              />
              <div className="sr-label" style={{marginTop: '4px'}}>Guests</div>
            </div>
          </div>
          <div className="sr-row" style={{cursor: 'default'}}>
            <div className="sr-center" style={{gridColumn: '1 / -1'}}>
              {availableSlots.length > 0 ? (
                <select className="sr-time-select" value={timeHHMM} onChange={e => setTimeHHMM(e.target.value)}>
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>{formatTimeLabel(slot)}</option>
                  ))}
                </select>
              ) : (
                <div style={{fontSize: '1rem', fontWeight: '700', color: '#b91c1c'}}>No availability</div>
              )}
              <div className="sr-label" style={{marginTop: '6px'}}>Time</div>
            </div>
          </div>
        </div>
        {isBlackout ? (
          <div style={{marginTop: '20px', textAlign: 'center', color: '#b91c1c', background: '#fee2e2', padding: '15px', borderRadius: '8px'}}>We are closed today, but please visit us on any other date! We will be more than happy to host your party.</div>
        ) : isWalkInOnly ? (
          <div style={{marginTop: '20px', textAlign: 'center', color: '#92400e', background: '#fef3c7', padding: '15px', borderRadius: '8px', fontWeight: '600'}}>Today we are only accepting walk-ins, but please come by and we will do our best to seat you as quickly as possible!</div>
        ) : availableSlots.length === 0 ? (
          <div style={{marginTop: '20px', textAlign: 'center', color: '#b91c1c', background: '#fee2e2', padding: '15px', borderRadius: '8px'}}>No availability for this date. Please try another day.</div>
        ) : (
          <>
            {searchError && (
              <div style={{ margin: '16px 0 8px', padding: '12px 16px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '12px', color: '#92400e', fontSize: '0.88rem', textAlign: 'center', fontWeight: '500' }}>
                {searchError}
              </div>
            )}
            <button className="sr-search" onClick={() => {
              setSearchError('');
              if (dateISO < dateISOFromDate(new Date())) {
                setSearchError('Please select another date, bookings in past dates are not allowed.');
                return;
              }
              if (!guests || guests < 1) return alert("Please enter the number of guests.");
              setStep("details");
            }}>Search</button>
          </>
        )}
        <div className="sr-foot">
          If your party is over 25 people please{' '}
          <a href="tel:7027356828" style={{color: '#222', fontWeight: '700', textDecoration: 'underline'}}>
            call us at (702) 735-6828
          </a>
          {' '}so we can properly accommodate you.
        </div>
      </main>
      <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
    </div>
  );
});

// --- COMPONENTE CLIENT DETAILS (Paso 2) ---
const ClientDetailsView = React.memo(function ClientDetailsView({
  dateLabel, timeLabel, guests,
  formState, setFormState,
  setStep, onSubmitClientRes, submitting, handleSwitchToHostess
}) {
  const { firstName, lastName, phone, phoneCode, email, celebration, dietary, notes, smsOptIn } = formState;
  const updateForm = (key, val) => setFormState(prev => ({ ...prev, [key]: val }));
  const [smsReminderShown, setSmsReminderShown] = useState(false);

  const handleSubmit = () => {
    if (!smsOptIn && !smsReminderShown) {
      setSmsReminderShown(true);
      return;
    }
    onSubmitClientRes();
  };

  return (
    <div className="sr-page sr-form-step">
      <main className="sr-card">
        <header className="sr-header"><img className="sr-logo" src="/logo.png" alt="Logo" /></header>
        <div className="sr-summary"><div className="sr-summaryTitle">{dateLabel} · {timeLabel} · {guests} guests</div></div>
        <section className="sr-form">
          <div className="sr-formGrid">
            <div className="sr-field"><label className="sr-fieldLabel">First name</label><input className="sr-input" value={firstName} onChange={e => updateForm('firstName', e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Last name</label><input className="sr-input" value={lastName} onChange={e => updateForm('lastName', e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Telephone</label><div style={{display:'flex',gap:'6px'}}><select className="sr-input" style={{width:'95px',flexShrink:0}} value={phoneCode} onChange={e => updateForm('phoneCode', e.target.value)}>{COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select><input className="sr-input" style={{flex:1}} value={phone} onChange={e => updateForm('phone', e.target.value)} placeholder="000-000-0000"/></div></div>
            <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={email} onChange={e => updateForm('email', e.target.value)} /></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={celebration} onChange={e => updateForm('celebration', e.target.value)}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Graduation</option><option>Other</option></select></div>
            <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={dietary} onChange={e => updateForm('dietary', e.target.value)}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={notes} onChange={e => updateForm('notes', e.target.value)} /></div>
          </div>
          {smsReminderShown && !smsOptIn && (
            <div style={{margin:'12px 0 0',padding:'10px 14px',background:'#fef9c3',border:'1px solid #fbbf24',borderRadius:'10px',fontSize:'0.78rem',color:'#92400e',display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'1.1rem'}}>📱</span>
              <span>Don't miss reservation updates! Check the box below to receive SMS notifications. You can still proceed without it.</span>
            </div>
          )}
          <label style={{display:'flex',alignItems:'flex-start',gap:'10px',margin:'12px 0 4px',cursor:'pointer',fontSize:'0.78rem',color:'#374151',lineHeight:'1.5',outline: smsReminderShown && !smsOptIn ? '2px solid #fbbf24' : 'none',borderRadius:'8px',padding: smsReminderShown && !smsOptIn ? '6px 8px' : '0'}}>
            <input type="checkbox" checked={smsOptIn} onChange={e => updateForm('smsOptIn', e.target.checked)} style={{marginTop:'3px',flexShrink:0,width:'16px',height:'16px',accentColor:'#1d4ed8'}} />
            <span>
              I agree to receive SMS notifications about my reservation from Lindo Michoacan (up to 2 messages per reservation). Msg &amp; data rates may apply. Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help. Consent is not required to complete your reservation.{' '}
              <a href="/privacy.html" target="_blank" rel="noopener" style={{color:'#1d4ed8'}}>Privacy Policy</a>
              {' | '}
              <a href="/terms.html" target="_blank" rel="noopener" style={{color:'#1d4ed8'}}>Terms &amp; Conditions</a>
            </span>
          </label>
          <div className="sr-actions">
            <button className="sr-btn" onClick={() => setStep("search")}>Back</button>
            <button className="sr-btn sr-btnPrimary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Enviando...' : 'Submit'}</button>
          </div>
        </section>
      </main>
      <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
    </div>
  );
});

/*******************************************************
 * BLOQUE 7 — MANAGER VIEW
 *******************************************************/

function ManagerPinView({ onSuccess }) {
  const [pin, setPin] = useState('');
  const check = () => { if (pin === MANAGER_PASSWORD) onSuccess(); else alert('Incorrect PIN'); };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '60px', background: '#000', padding: '60px 24px 24px' }}>
      <img src="/logo.png" alt="Logo" style={{ width: '304px', marginBottom: '32px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px' }} />
      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', width: '100%', maxWidth: '360px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>Manager Access</h2>
        <input
          type="password" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="Enter PIN"
          style={{ width: '100%', padding: '14px', fontSize: '1.4rem', textAlign: 'center', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '10px', outline: 'none', letterSpacing: '6px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          autoFocus
        />
        <button onClick={check} style={{ width: '100%', marginTop: '16px', padding: '14px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>
          Access
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: onClick ? 'pointer' : 'default', marginBottom: '10px' }}>
      <div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontSize: '2rem', fontWeight: '800', color }}>{value}</div>
        {onClick && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1.2rem' }}>›</span>}
      </div>
    </div>
  );
}

const SECTION_COLORS = { reservations: '#60a5fa', waitlist: '#fbbf24', seated: '#4ade80', canceled: '#f87171' };
const SECTION_LABELS = { reservations: 'Reservations', waitlist: 'Wait List', seated: 'Seated', canceled: 'Canceled' };

function StatusBadge({ status, source }) {
  const color = source === 'walkin' && status === 'waitlist' ? '#22d3ee'
    : status === 'reserved' ? '#60a5fa'
    : status === 'waitlist' ? '#fbbf24'
    : status === 'seated' ? '#4ade80'
    : status === 'cancelled' ? '#f87171'
    : 'rgba(255,255,255,0.3)';
  const label = source === 'walkin' && status !== 'seated' && status !== 'cancelled' ? 'Walk-in'
    : status === 'reserved' ? 'Reserved'
    : status === 'waitlist' ? 'Waiting'
    : status === 'seated' ? 'Seated'
    : status === 'cancelled' ? 'Canceled'
    : status;
  return (
    <span style={{ background: `${color}22`, border: `1px solid ${color}55`, color, borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: '600' }}>{label}</span>
  );
}

function RecordCard({ r, onClick }) {
  const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || '—';
  const sourceLabel = r.source === 'walkin' ? 'Walk-in' : r.source === 'phone' ? 'Phone' : r.source === 'online' ? 'Online' : r.source || '';
  return (
    <div onClick={onClick} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={r.status} source={r.source} />
          {onClick && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.1rem' }}>›</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
        {r.guests != null && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Guests: <strong style={{ color: '#fff' }}>{r.guests}</strong></span>}
        {r.timeHHMM && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Time: <strong style={{ color: '#fff' }}>{r.timeHHMM}</strong></span>}
        {r.phone && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Phone: <strong style={{ color: '#fff' }}>{r.phone}</strong></span>}
        {sourceLabel && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Source: <strong style={{ color: '#fff' }}>{sourceLabel}</strong></span>}
        {r.celebration && r.celebration !== 'None' && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Celebration: <strong style={{ color: '#fff' }}>{r.celebration}</strong></span>}
        {r.dietary && r.dietary !== 'None' && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Dietary: <strong style={{ color: '#fff' }}>{r.dietary}</strong></span>}
        {r.notes && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', width: '100%' }}>Notes: <strong style={{ color: '#fff' }}>{r.notes}</strong></span>}
      </div>
    </div>
  );
}

const CELEBRATION_OPTIONS = ['None','Birthday','Anniversary','Quinceañera','Graduation','Baby Shower','Other'];
const DIETARY_OPTIONS = ['None','Vegetarian','Vegan','Gluten-Free','Nut Allergy','Dairy-Free','Other'];
const mgInput = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', outline: 'none' };
const mgLabel = { display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' };

const ManagerView = React.memo(function ManagerView({ dateISO, dateLabel, stepDate, onDateChange, history, waitList, seatedList, canceledList, rows, tableStatuses, isBlackout, onRefresh }) {
  const [activeSection, setActiveSection] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [addMode, setAddMode] = useState(null);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', phone: '', guests: 2, timeHHMM: '19:00', celebration: 'None', dietary: 'None', notes: '' });
  const [addSaving, setAddSaving] = useState(false);
  const aef = (field) => (e) => setAddForm(prev => ({ ...prev, [field]: e.target.value }));
  const resetAdd = () => { setAddMode(null); setAddForm({ firstName: '', lastName: '', phone: '', guests: 2, timeHHMM: '19:00', celebration: 'None', dietary: 'None', notes: '' }); };
  const mkToken = () => { try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch(_){} return `${Date.now()}-${Math.random().toString(16).slice(2)}`; };

  const handleAddWalkin = async () => {
    if (isBlackout) return alert('Cannot add walk-ins on a closed day.');
    if (dateISO !== dateISOFromDate(new Date())) return alert('Walk-ins can only be added for today\'s date.');
    if (!addForm.firstName.trim()) return alert('First name is required.');
    setAddSaving(true);
    try {
      const cancelToken = mkToken();
      const { error } = await insertWaitlistRecord({ firstName: addForm.firstName.trim().toUpperCase(), lastName: (addForm.lastName || '').trim().toUpperCase(), guests: Number(addForm.guests) || 1, dateISO, timeHHMM: addForm.timeHHMM, phone: addForm.phone || null, celebration: addForm.celebration, dietary: addForm.dietary, notes: addForm.notes || null, status: 'waitlist', source: 'walkin', cancel_token: cancelToken, estimated_wait: 15 });
      if (error) throw error;
      if (addForm.phone) {
        try { await fetch('/.netlify/functions/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'waitlist', phone: addForm.phone, firstName: addForm.firstName, guests: Number(addForm.guests) || 1, cancel_token: cancelToken }) }); } catch(e) { console.error('SMS fail', e); }
      }
      resetAdd();
    } catch(e) { alert('Error: ' + (e?.message || e)); }
    finally { setAddSaving(false); }
  };

  const handleAddReservation = async () => {
    if (isBlackout) return alert('Cannot make reservations on a closed day.');
    if (dateISO < dateISOFromDate(new Date())) return alert('Cannot make reservations for a past date.');
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) return alert('First and last name are required.');
    if (!isTimeAllowed(dateISO, addForm.timeHHMM)) {
      const range = getAvailableTimeRange(dateISO);
      return alert(range ? `Reservations only accepted between ${formatTimeLabel(range.open)} and ${formatTimeLabel(range.lastSlot)}.` : 'The restaurant is closed this day.');
    }
    setAddSaving(true);
    try {
      const cancelToken = mkToken();
      const phone = addForm.phone || null;
      const { error } = await insertReservationRecord({ firstName: addForm.firstName.trim().toUpperCase(), lastName: addForm.lastName.trim().toUpperCase(), guests: Number(addForm.guests) || 1, dateISO, timeHHMM: addForm.timeHHMM, phone, celebration: addForm.celebration, dietary: addForm.dietary, notes: addForm.notes || null, status: 'reserved', source: 'reservation', cancel_token: cancelToken });
      if (error) throw error;
      if (phone) {
        try { await fetch('/.netlify/functions/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'confirm', phone, firstName: addForm.firstName, dateLabel, timeLabel: formatTimeLabel(addForm.timeHHMM), guests: Number(addForm.guests) || 1, cancel_token: cancelToken }) }); } catch(e) { console.error('SMS fail', e); }
      }
      resetAdd();
    } catch(e) { alert('Error: ' + (e?.message || e)); }
    finally { setAddSaving(false); }
  };

  const openEdit = (r) => {
    setEditingRecord(r);
    setEditForm({ firstName: r.firstName || '', lastName: r.lastName || '', guests: r.guests ?? '', timeHHMM: r.timeHHMM || '', phone: r.phone || '', notes: r.notes || '', celebration: r.celebration || 'None', dietary: r.dietary || 'None' });
  };
  const closeEdit = () => { setEditingRecord(null); setEditForm({}); };

  const handleSave = async () => {
    setEditSaving(true);
    try {
      await updateReservationRecord(editingRecord.id, { firstName: editForm.firstName, lastName: editForm.lastName, guests: Number(editForm.guests) || editingRecord.guests, timeHHMM: editForm.timeHHMM || null, phone: editForm.phone, notes: editForm.notes, celebration: editForm.celebration, dietary: editForm.dietary });
      closeEdit();
    } finally { setEditSaving(false); }
  };

  const handleCancelReservation = async () => {
    if (!window.confirm('Cancel this reservation?')) return;
    setEditSaving(true);
    try { await cancelReservation(editingRecord.id); closeEdit(); }
    finally { setEditSaving(false); }
  };

  const ef = (field) => (e) => setEditForm(prev => ({ ...prev, [field]: e.target.value }));

  const totalResGuests = history.reduce((s, r) => s + (r.guests || 0), 0);
  const seatedGuests = seatedList.reduce((s, r) => s + (r.guests || 0), 0);
  const tableKeys = Object.keys(tableStatuses);
  const occupiedTables = tableKeys.filter(k => tableStatuses[k] === 'occ').length;
  const totalTables = tableKeys.length;
  const occupancyPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const allDayGuests = rows.reduce((s, r) => s + (r.guests || 0), 0);

  const hourlyRes = {};
  history.forEach(r => { if (r.timeHHMM) { const h = r.timeHHMM.split(':')[0]; hourlyRes[h] = (hourlyRes[h] || 0) + 1; } });

  const sectionData = { reservations: history, waitlist: waitList, seated: seatedList, canceled: canceledList };

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <button onClick={() => { if (addMode) { resetAdd(); } else if (editingRecord) { closeEdit(); } else if (activeSection) { setActiveSection(null); } else { stepDate(-1); } }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.4rem', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer' }}>‹</button>
        <div style={{ textAlign: 'center', flex: 1, margin: '0 8px' }}>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
            {addMode === 'walkin' ? 'Add Walk-in' : addMode === 'reservation' ? 'Add Reservation' : editingRecord ? 'Edit Record' : activeSection ? SECTION_LABELS[activeSection] : 'Manager Dashboard'}
          </div>
          {activeSection || editingRecord || addMode ? (
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>{dateLabel}</div>
          ) : (
            <input type="date" value={dateISO} onChange={e => e.target.value && onDateChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: '700', textAlign: 'center', outline: 'none', cursor: 'pointer', width: '100%', colorScheme: 'dark' }} />
          )}
        </div>
        {activeSection || editingRecord || addMode ? (
          <div style={{ width: '44px' }} />
        ) : (
          <button onClick={() => stepDate(1)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.4rem', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer' }}>›</button>
        )}
      </div>

      <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
        {addMode ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={mgLabel}>First Name *</label><input style={mgInput} value={addForm.firstName} onChange={aef('firstName')} autoFocus /></div>
              <div><label style={mgLabel}>Last Name</label><input style={mgInput} value={addForm.lastName} onChange={aef('lastName')} /></div>
              <div><label style={mgLabel}>Guests</label><input type="number" min="1" max="20" style={mgInput} value={addForm.guests} onChange={aef('guests')} /></div>
              {addMode === 'reservation' && <div><label style={mgLabel}>Time</label><input type="time" style={mgInput} value={addForm.timeHHMM} onChange={aef('timeHHMM')} /></div>}
            </div>
            <div style={{ marginBottom: '12px' }}><label style={mgLabel}>Phone</label><input type="tel" style={mgInput} value={addForm.phone} onChange={aef('phone')} placeholder="+1..." /></div>
            <div style={{ marginBottom: '12px' }}>
              <label style={mgLabel}>Celebration</label>
              <select style={{ ...mgInput, appearance: 'none' }} value={addForm.celebration} onChange={aef('celebration')}>
                {CELEBRATION_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={mgLabel}>Dietary</label>
              <select style={{ ...mgInput, appearance: 'none' }} value={addForm.dietary} onChange={aef('dietary')}>
                {DIETARY_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={mgLabel}>Notes</label><textarea rows={3} style={{ ...mgInput, resize: 'vertical' }} value={addForm.notes} onChange={aef('notes')} /></div>
            <button onClick={addMode === 'walkin' ? handleAddWalkin : handleAddReservation} disabled={addSaving} style={{ width: '100%', padding: '14px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>
              {addSaving ? 'Saving...' : addMode === 'walkin' ? 'Add to Wait List' : 'Confirm Reservation'}
            </button>
          </div>
        ) : editingRecord ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={mgLabel}>First Name</label><input style={mgInput} value={editForm.firstName} onChange={ef('firstName')} /></div>
              <div><label style={mgLabel}>Last Name</label><input style={mgInput} value={editForm.lastName} onChange={ef('lastName')} /></div>
              <div><label style={mgLabel}>Guests</label><input type="number" min="1" max="20" style={mgInput} value={editForm.guests} onChange={ef('guests')} /></div>
              {(editingRecord.status === 'reserved' || editingRecord.status === 'seated') && (
                <div><label style={mgLabel}>Time</label><input type="time" style={mgInput} value={editForm.timeHHMM} onChange={ef('timeHHMM')} /></div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}><label style={mgLabel}>Phone</label><input style={mgInput} value={editForm.phone} onChange={ef('phone')} /></div>
            <div style={{ marginBottom: '12px' }}>
              <label style={mgLabel}>Celebration</label>
              <select style={{ ...mgInput, appearance: 'none' }} value={editForm.celebration} onChange={ef('celebration')}>
                {CELEBRATION_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={mgLabel}>Dietary</label>
              <select style={{ ...mgInput, appearance: 'none' }} value={editForm.dietary} onChange={ef('dietary')}>
                {DIETARY_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={mgLabel}>Notes</label><textarea rows={3} style={{ ...mgInput, resize: 'vertical' }} value={editForm.notes} onChange={ef('notes')} /></div>
            <button onClick={handleSave} disabled={editSaving} style={{ width: '100%', padding: '14px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginBottom: '10px' }}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {editingRecord.status === 'waitlist' && (
              <button onClick={async () => { setEditSaving(true); try { await updatePartyToSeated(editingRecord.id); closeEdit(); } finally { setEditSaving(false); } }} disabled={editSaving} style={{ width: '100%', padding: '14px', background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginBottom: '10px' }}>
                Seat Party
              </button>
            )}
            {editingRecord.status !== 'cancelled' && (
              <button onClick={handleCancelReservation} disabled={editSaving} style={{ width: '100%', padding: '14px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>
                Cancel Reservation
              </button>
            )}
          </div>
        ) : activeSection ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: SECTION_COLORS[activeSection] }}>{SECTION_LABELS[activeSection]}</div>
              <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{sectionData[activeSection].length}</span>
            </div>
            {sectionData[activeSection].length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '40px 0', fontSize: '0.9rem' }}>No records for this date</div>
            ) : (
              sectionData[activeSection].map((r, i) => <RecordCard key={r.id || i} r={r} onClick={() => openEdit(r)} />)
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: '2px' }}>
              <StatCard label="Reservations" value={history.length} sub={`${totalResGuests} guests`} color="#f87171" onClick={() => setActiveSection('reservations')} />
              <StatCard label="Wait List" value={waitList.length} sub="currently waiting" color="#f87171" onClick={() => setActiveSection('waitlist')} />
              <StatCard label="Seated" value={seatedList.length} sub={`${seatedGuests} guests`} color="#f87171" onClick={() => setActiveSection('seated')} />
              <StatCard label="Canceled" value={canceledList.length} sub="today" color="#f87171" onClick={() => setActiveSection('canceled')} />
              <StatCard label="Occupancy" value={`${occupancyPct}%`} sub={`${occupiedTables}/${totalTables} tables`} color="#f87171" />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Guests Today</div>
              <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#fff', lineHeight: 1.1 }}>{allDayGuests}</div>
            </div>

            {Object.keys(hourlyRes).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Reservations by Hour</div>
                {Object.keys(hourlyRes).sort().map(h => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', width: '48px', flexShrink: 0 }}>{h}:00</span>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '22px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((hourlyRes[h] / MAX_RESERVATIONS_PER_HOUR) * 100, 100)}%`, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', height: '100%', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff', width: '18px', textAlign: 'right' }}>{hourlyRes[h]}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              <button onClick={() => setAddMode('walkin')} style={{ padding: '14px', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' }}>+ Walk-in</button>
              <button onClick={() => setAddMode('reservation')} style={{ padding: '14px', background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' }}>+ Reservation</button>
            </div>
          </>
        )}
      </div>
      <button onClick={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }} style={{ position: 'fixed', bottom: '24px', right: '20px', width: '48px', height: '48px', borderRadius: '50%', background: '#1e3a5f', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', opacity: refreshing ? 0.5 : 1, zIndex: 50 }}>
        {refreshing ? '…' : '↻'}
      </button>
    </div>
  );
});

/*******************************************************
 * BLOQUE 8 — APP (CONTROLLER PRINCIPAL)
 *******************************************************/
export default function App() {
  const isSubmitting = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const walkinSubmittingRef = useRef(false);
  const [phoneResLoading, setPhoneResLoading] = useState(false);
  const phoneResSubmittingRef = useRef(false);
  const [viewMode, setViewMode] = useState(() => {
    if (window.location.pathname === '/managerview') return 'manager-lock';
    return localStorage.getItem("viewMode") || "client";
  });
  const [step, setStep] = useState("search");
  const [dateISO, setDateISO] = useState(() => dateISOFromDate(new Date()));
  const [guests, setGuests] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(15);
  const [timeHHMM, setTimeHHMM] = useState("19:00");
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [activeFloor, setActiveFloor] = useState("BAR");
  const [rows, setRows] = useState([]);
  const [tableStatuses, setTableStatuses] = useState({});
  const [tableServerNames, setTableServerNames] = useState({});
  const [walkInForm, setWalkInForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    phoneCode: "+1",
    celebration: "None",
    dietary: "None",
    notes: "",
  });
  const [phoneResForm, setPhoneResForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    phoneCode: "+1",
    email: "",
    celebration: "None",
    dietary: "None",
    notes: "",
  });
  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    phoneCode: "+1",
    email: "",
    celebration: "None",
    dietary: "None",
    notes: "",
    smsOptIn: false,
  });

  const dateLabel = useMemo(() => formatDateLabel(dateISO), [dateISO]);
  const timeLabel = useMemo(() => formatTimeLabel(timeHHMM), [timeHHMM]);

  // dayStatus: 'open' | 'closed' | 'walkin_only'
  const dayStatus = useMemo(() => {
    if (!isRestaurantOpen(dateISO)) return 'closed';
    const entry = blackoutDates.find(b => b.date_iso === dateISO);
    if (!entry) return 'open';
    return entry.type || 'closed';
  }, [dateISO, blackoutDates]);
  const isBlackout = dayStatus === 'closed';
  const isWalkInOnly = dayStatus === 'walkin_only';

  const history = useMemo(() => rows.filter((r) => r.status === "reserved").sort((a, b) => {
    const notifDiff = (b.notified_at ? 1 : 0) - (a.notified_at ? 1 : 0);
    if (notifDiff !== 0) return notifDiff;
    return (a.timeHHMM || "").localeCompare(b.timeHHMM || "");
  }), [rows]);
  const waitList = useMemo(() => rows.filter((r) => r.status === "waitlist").sort((a, b) => (b.notified_at ? 1 : 0) - (a.notified_at ? 1 : 0)), [rows]);
  const seatedList = useMemo(() => rows.filter((r) => r.status === "seated"), [rows]);
  const canceledList = useMemo(() => rows.filter((r) => r.status === "cancelled"), [rows]);

  // Cuenta reservaciones y guests por ventana de 1 hora (para límites en client/hostess view)
  const bookedHourCounts = useMemo(() => {
    const counts = {};
    rows.filter(r => r.status === "reserved").forEach(r => {
      if (r.timeHHMM) {
        const hour = Math.floor(minutesFromHHMM(r.timeHHMM) / 60);
        counts[hour] = (counts[hour] || 0) + 1;
      }
    });
    return counts;
  }, [rows]);

  const bookedHourGuests = useMemo(() => {
    const counts = {};
    rows.filter(r => r.status === "reserved").forEach(r => {
      if (r.timeHHMM) {
        const hour = Math.floor(minutesFromHHMM(r.timeHHMM) / 60);
        counts[hour] = (counts[hour] || 0) + (r.guests || 0);
      }
    });
    return counts;
  }, [rows]);

  useReservationsRealtime({ supabase, dateISO, setRows, onInsert: viewMode === 'server' ? () => setNewResAlert(true) : undefined });

  useEffect(() => {
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (viewMode !== 'server') return;
    const ch = supabase
      .channel('hostess-notifications')
      .on('broadcast', { event: 'reservations_seen' }, () => setNewResAlert(false))
      .subscribe();
    notifChannelRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [viewMode]);

  const clearResAlert = () => {
    setNewResAlert(false);
    notifChannelRef.current?.send({ type: 'broadcast', event: 'reservations_seen', payload: {} });
  };

  // Cargar y sincronizar table_status en tiempo real
  useEffect(() => {
    supabase.from('table_status').select('id, status, server_names').then(({ data }) => {
      if (data) {
        const statusMap = {};
        const serverMap = {};
        data.forEach(r => { statusMap[r.id] = r.status; serverMap[r.id] = r.server_names || []; });
        setTableStatuses(statusMap);
        setTableServerNames(serverMap);
      }
    });
    const channel = supabase
      .channel('table_status_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_status' }, ({ new: row }) => {
        if (row?.id) {
          setTableStatuses(prev => ({ ...prev, [row.id]: row.status }));
          setTableServerNames(prev => ({ ...prev, [row.id]: row.server_names || [] }));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Cargar y sincronizar blackout_dates en tiempo real
  useEffect(() => {
    const load = () =>
      supabase.from('blackout_dates').select('date_iso, notes, type').then(({ data }) => {
        if (data) setBlackoutDates(data.map(r => ({ date_iso: r.date_iso, notes: r.notes || '', type: r.type || 'closed' })));
      });
    load();
    const channel = supabase
      .channel('blackout_dates_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blackout_dates' }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const isDateBlocked = (d) => !isRestaurantOpen(d);

  const stepDate = (dir) => {
    setDateISO(prev => {
      let next = addDaysISO(prev, dir);
      let i = 0;
      while (isDateBlocked(next) && i++ < 14) next = addDaysISO(next, dir);
      return next;
    });
  };

  const handleDateChange = (val) => {
    let date = val;
    let i = 0;
    while (isDateBlocked(date) && i++ < 14) date = addDaysISO(date, 1);
    setDateISO(date);
  };
  const stepGuests = (dir) => setGuests((prev) => clampGuests((prev ?? 0) + dir));
  const stepWait = (dir) => setEstimatedWait((prev) => Math.min(120, Math.max(5, (prev ?? 15) + dir * 5)));

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
    if (pass === HOSTESS_PASSWORD) {
      setViewMode("hostess");
      localStorage.setItem("viewMode", "hostess");
    } else if (pass !== null) alert("Incorrect password");
  };

  const toggleBlackoutDate = async (dateToToggle, notes, type = 'closed') => {
    if (!dateToToggle) return;
    if (blackoutDates.some(b => b.date_iso === dateToToggle)) {
      await supabase.from('blackout_dates').delete().eq('date_iso', dateToToggle);
    } else {
      await supabase.from('blackout_dates').insert({ date_iso: dateToToggle, notes: notes || null, type });
    }
  };

  const handleTableSelection = async (table) => {
    const key = `${activeFloor}-${table.id}`;
    const current = tableStatuses[key] ?? 'av';
    const next = current === 'av' ? 'occ' : 'av';
    setTableStatuses(prev => ({ ...prev, [key]: next }));
    await supabase.from('table_status').upsert({ id: key, status: next });
    if (next === 'occ') {
      const servers = tableServerNames[key] ?? [];
      await logTableOcc(key, servers, dateISO);
    }
  };

  // Helper para generar tokens de cancelación únicos (seguro)
  const generateToken = () => {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    } catch (_) {}
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  };

  const handleAddToWaitlist = async () => {
    if (walkinSubmittingRef.current) return;
    walkinSubmittingRef.current = true;
    if (isBlackout) { walkinSubmittingRef.current = false; return alert("Cannot add to waitlist on a closed day."); }
    const todayISO = dateISOFromDate(new Date());
    if (dateISO !== todayISO) { walkinSubmittingRef.current = false; return alert("Walk-ins can only be added for today's date. Please switch to today."); }
    if (!walkInForm.firstName) { walkinSubmittingRef.current = false; return alert("First name is required."); }
    setWalkinLoading(true);

    const cancelToken = generateToken();

    const newEntry = {
      firstName: walkInForm.firstName.toUpperCase(),
      lastName: (walkInForm.lastName || "").toUpperCase(),
      guests: guests || 1,
      dateISO,
      timeHHMM,
      phone: (walkInForm.phoneCode || '+1') + (walkInForm.phone || '').replace(/\D/g, ''),
      email: null,
      celebration: walkInForm.celebration || "None",
      dietary: walkInForm.dietary || "None",
      notes: walkInForm.notes || null,
      status: "waitlist",
      source: "walkin",
      cancel_token: cancelToken,
      estimated_wait: estimatedWait,
    };

    try {
      const { error } = await insertWaitlistRecord(newEntry);
      if (error) throw error;

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
      setEstimatedWait(15);
      return true;
    } catch (e) {
      console.error(e);
      alert("Error adding to wait list: " + (e?.message || e));
    } finally {
      walkinSubmittingRef.current = false;
      setWalkinLoading(false);
    }
  };

  const handleAddPhoneReservation = async () => {
    if (phoneResSubmittingRef.current) return;
    phoneResSubmittingRef.current = true;

    const _resetPhoneRef = () => { phoneResSubmittingRef.current = false; };

    if (isBlackout) { _resetPhoneRef(); return alert("Cannot make reservations on a closed day."); }
    if (dateISO < dateISOFromDate(new Date())) { _resetPhoneRef(); return alert("Cannot make reservations for a past date."); }
    if (!phoneResForm.firstName || !phoneResForm.lastName || !phoneResForm.phone) {
      _resetPhoneRef(); return alert("Name, Last Name and Phone are required.");
    }

    // Validación de horario
    if (!isTimeAllowed(dateISO, timeHHMM)) {
      const range = getAvailableTimeRange(dateISO);
      _resetPhoneRef();
      return alert(
        range
          ? `Reservations only accepted between ${formatTimeLabel(range.open)} and ${formatTimeLabel(range.lastSlot)}.`
          : "The restaurant is closed this day."
      );
    }

    // Advertencia de overbooking (límite por hora)
    const selectedHour = Math.floor(minutesFromHHMM(timeHHMM) / 60);
    const hourResCount = rows.filter(
      r => r.status === "reserved" && r.timeHHMM &&
           Math.floor(minutesFromHHMM(r.timeHHMM) / 60) === selectedHour
    ).length;
    const hourGuestCount = rows
      .filter(r => r.status === "reserved" && r.timeHHMM &&
                   Math.floor(minutesFromHHMM(r.timeHHMM) / 60) === selectedHour)
      .reduce((sum, r) => sum + (r.guests || 0), 0);

    const resOver = hourResCount >= MAX_RESERVATIONS_PER_HOUR;
    const capOver = hourGuestCount + (guests || 1) > RESTAURANT_CAPACITY;

    if (resOver || capOver) {
      const reasons = [];
      if (resOver) reasons.push(`${hourResCount}/${MAX_RESERVATIONS_PER_HOUR} reservations in this hour`);
      if (capOver) reasons.push(`${hourGuestCount + (guests || 1)} guests would exceed capacity of ${RESTAURANT_CAPACITY}`);
      const proceed = window.confirm(`⚠️ Overbooking warning:\n${reasons.join('\n')}\n\nContinue anyway?`);
      if (!proceed) { _resetPhoneRef(); return; }
    }

    setPhoneResLoading(true);
    const cancelToken = generateToken();

    const newRes = {
      firstName: phoneResForm.firstName.toUpperCase(),
      lastName: phoneResForm.lastName.toUpperCase(),
      guests: guests || 1,
      dateISO,
      timeHHMM,
      phone: (phoneResForm.phoneCode || '+1') + phoneResForm.phone.replace(/\D/g, ''),
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
            phone: (phoneResForm.phoneCode || '+1') + phoneResForm.phone.replace(/\D/g, ''),
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
      try {
        const startISO = toLocalDateTimeISO(dateISO, timeHHMM);
        const endISO = addMinutesToLocalDateTimeISO(dateISO, timeHHMM, 90);
        await createCalendarEventService({ ...newRes, startISO, endISO });
      } catch (calErr) {
        console.error("Calendar fail:", calErr);
      }

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
      return true;
    } catch (e) {
      console.error(e);
      alert("Error saving reservation.");
    } finally {
      phoneResSubmittingRef.current = false;
      setPhoneResLoading(false);
    }
  };
  const handleSeatParty = useCallback(async (party) => {
    setRows(prev => prev.map(r => r.id === party.id ? { ...r, status: 'seated', seated_at: new Date().toISOString() } : r));
    const { error } = await updatePartyToSeated(party.id);
    if (error) {
      setRows(prev => prev.map(r => r.id === party.id ? party : r));
      alert("Error seating party.");
    }
  }, []);

  const handleSaveEdit = useCallback(async (id, data) => {
    const { error } = await updateReservationRecord(id, data);
    if (error) alert("Error updating reservation: " + error.message);
  }, []);

  const handleRemoveFromWaitlist = useCallback(async (item) => {
    setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: 'cancelled' } : r));
    const { error } = await updateReservationRecord(item.id, { status: 'cancelled' });
    if (error) {
      setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: 'waitlist' } : r));
      alert("Error removing from waitlist.");
    }
  }, []);

  const handleUndoCancel = useCallback(async (item) => {
    const originalStatus = item.source === 'walkin' ? 'waitlist' : 'reserved';
    setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: originalStatus, notified_at: null } : r));
    const { error } = await updateReservationRecord(item.id, { status: originalStatus, notified_at: null });
    if (error) {
      setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: 'cancelled', notified_at: item.notified_at } : r));
      alert("Error reverting cancellation.");
    }
  }, []);

  const handleCancelReservation = useCallback(async (res) => {
    if (!window.confirm(`Cancel reservation for ${res.firstName} ${res.lastName}?`)) return;
    setRows(prev => prev.map(r => r.id === res.id ? { ...r, status: 'cancelled' } : r));
    const { error } = await cancelReservation(res.id);
    if (error) {
      setRows(prev => prev.map(r => r.id === res.id ? { ...r, status: 'reserved' } : r));
      alert("Error canceling reservation.");
    }
  }, []);

  const handleUnseatParty = useCallback(async (party) => {
    const originalStatus = party.source === "walkin" ? "waitlist" : "reserved";
    setRows(prev => prev.map(r => r.id === party.id ? { ...r, status: originalStatus, seated_at: null } : r));
    const { error } = await revertPartyFromSeated(party.id, originalStatus);
    if (error) {
      setRows(prev => prev.map(r => r.id === party.id ? party : r));
      alert("Error reverting party.");
    }
  }, []);

  const handleNotifyReady = useCallback(async (party) => {
    if (!party?.phone) { alert("No phone number available for this guest."); return false; }
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
      await markPartyNotified(party.id);
      return true;
    } catch (e) {
      console.error("Notify fail:", e);
      alert("Error sending notification.");
      return false;
    }
  }, []);

  const handleClientSubmit = async () => {
    if (isSubmitting.current) return;
    if (!clientForm.firstName || !clientForm.lastName || !clientForm.phone) {
      return alert("Por favor completa Nombre, Apellido y Teléfono.");
    }
    isSubmitting.current = true;
    setSubmitting(true);

    // Validación de fecha y horario
    if (dateISO < dateISOFromDate(new Date())) {
      isSubmitting.current = false;
      setSubmitting(false);
      return;
    }
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
      phone: (clientForm.phoneCode || '+1') + clientForm.phone.replace(/\D/g, ''),
      email: clientForm.email,
      celebration: clientForm.celebration,
      dietary: clientForm.dietary,
      notes: clientForm.notes,
      status: "reserved",
      source: "reservation",
      cancel_token: cancelToken,
      sms_opt_in: clientForm.smsOptIn,
    };

    try {
      const { error } = await insertReservationRecord(newRes);
      if (error) throw error;

      // SMS confirmación (cliente) — solo si optó por recibir SMS
      if (clientForm.smsOptIn) {
        try {
          await fetch("/.netlify/functions/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "confirm",
              phone: (clientForm.phoneCode || '+1') + clientForm.phone.replace(/\D/g, ''),
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
      }

      // Calendar
      try {
        const startISO = toLocalDateTimeISO(dateISO, timeHHMM);
        const endISO = addMinutesToLocalDateTimeISO(dateISO, timeHHMM, 90);
        await createCalendarEventService({ ...newRes, startISO, endISO });
      } catch (e) {
        console.error("Calendar fail:", e);
      }

      setStep("confirmation");
    } catch (e) {
      alert("Error saving reservation: " + e.message);
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  };

  // --- RENDER ---
  if (viewMode === 'manager-lock') return <ManagerPinView onSuccess={() => setViewMode('manager')} />;
  if (viewMode === 'manager') return (
    <ManagerView
      dateISO={dateISO} dateLabel={dateLabel} stepDate={stepDate} onDateChange={handleDateChange}
      history={history} waitList={waitList} seatedList={seatedList}
      canceledList={canceledList} rows={rows} tableStatuses={tableStatuses} isBlackout={isBlackout}
      onRefresh={async () => { const { data } = await fetchRowsForDay(supabase, dateISO); setRows(data || []); }}
    />
  );

  if (viewMode === "hostess") {
    return (   
       <HostessView
        onAddWaitlist={handleAddToWaitlist}
        onAddPhoneRes={handleAddPhoneReservation}
        walkinLoading={walkinLoading}
        phoneResLoading={phoneResLoading}
        onSeatParty={handleSeatParty}
        onUnseatParty={handleUnseatParty}
        onCancelRes={handleCancelReservation}
        onRemoveFromWaitlist={handleRemoveFromWaitlist}
        onUndoCancel={handleUndoCancel}
        onSaveEdit={handleSaveEdit}
        onNotifyReady={handleNotifyReady}
        toggleBlackoutDate={toggleBlackoutDate}
        handleTableSelection={handleTableSelection}
        setViewMode={setViewMode}
        activeFloor={activeFloor}
        setActiveFloor={setActiveFloor}
        isBlackout={isBlackout}
        isWalkInOnly={isWalkInOnly}
        dateISO={dateISO}
        setDateISO={setDateISO}
        onDateChange={handleDateChange}
        dateLabel={dateLabel}
        stepDate={stepDate}
        guests={guests}
        setGuests={setGuests}
        stepGuests={stepGuests}
        estimatedWait={estimatedWait}
        setEstimatedWait={setEstimatedWait}
        stepWait={stepWait}
        timeHHMM={timeHHMM}
        setTimeHHMM={setTimeHHMM}
        timeLabel={timeLabel}
        stepTime={stepTime}
        walkInForm={walkInForm}
        setWalkInForm={setWalkInForm}
        phoneResForm={phoneResForm}
        setPhoneResForm={setPhoneResForm}
        waitList={waitList}
        history={history}
        seatedList={seatedList}
        canceledList={canceledList}
        blackoutDates={blackoutDates}
        tableStatuses={tableStatuses}
        tableServerNames={tableServerNames}
      />
    );
  }

  if (step === "search") {
    return (
      <ClientSearchView
        dateISO={dateISO}
        setDateISO={setDateISO}
        onDateChange={handleDateChange}
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
        isWalkInOnly={isWalkInOnly}
        setStep={setStep}
        handleSwitchToHostess={handleSwitchToHostess}
        bookedHourCounts={bookedHourCounts}
        bookedHourGuests={bookedHourGuests}
      />
    );
  }

  if (step === "confirmation") {
    return (
      <ClientConfirmationView
        firstName={clientForm.firstName || "Guest"}
        setStep={setStep}
        setClientForm={setClientForm}
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
      submitting={submitting}
      handleSwitchToHostess={handleSwitchToHostess}
    />
  );
}
