import { useMemo, useRef, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";
import logo from "/logo.png";

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://nouxznpzaoerjcarohsu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdXh6bnB6YW9lcmpjYXJvaHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTg4MTcsImV4cCI6MjA4Njg3NDgxN30.ClpOylubz6_5tTCcZzYVqOyfasJNu2S_vW4sIqzi2a0'; // La que empieza por sb_publishable
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAX_GUESTS = 12;
const SLOT_MINUTES = 15;
const HOSTESS_PASSWORD = "1234";

/* HELPERS */
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

/* ISO local para Google Calendar */
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

/* CONFIGURACIÓN DE MESAS POR SALA */
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

export default function App() {
  const [viewMode, setViewMode] = useState("client");
  const [step, setStep] = useState("search");
  const [activeTab, setActiveTab] = useState("reservations");
  const [activeFloor, setActiveFloor] = useState("BAR");
  const [dateISO, setDateISO] = useState(() => dateISOFromDate(new Date()));
  const [guests, setGuests] = useState(2);
  const [timeHHMM, setTimeHHMM] = useState("19:00");
  const [blackoutDates, setBlackoutDates] = useState([]);
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const blackoutInputRef = useRef(null);
  const dateLabel = useMemo(() => formatDateLabel(dateISO), [dateISO]);
  const timeLabel = useMemo(() => formatTimeLabel(timeHHMM), [timeHHMM]);
  const isBlackout = useMemo(() => blackoutDates.includes(dateISO), [dateISO, blackoutDates]);

  // Listas de datos (ahora vienen de Supabase)
  const [rows, setRows] = useState([]);

  const history = useMemo(() => rows.filter(r => r.status === "reserved"), [rows]);
  const waitList = useMemo(() => rows.filter(r => r.status === "waitlist"), [rows]);
  const seatedList = useMemo(() => rows.filter(r => r.status === "seated"), [rows]);

  // Formulario
  const [walkInForm, setWalkInForm] = useState({ firstName: "", lastName: "", phone: "", celebration: "None", dietary: "None", notes: "" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [celebration, setCelebration] = useState("None");
  const [dietary, setDietary] = useState("None");
  const [notes, setNotes] = useState("");

  // --- EFECTO TIEMPO REAL Y CARGA INICIAL (por día seleccionado) ---
  useEffect(() => {
    let isMounted = true;

    const fetchRowsForDay = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('dateISO', dateISO)
        .in('status', ['reserved', 'waitlist', 'seated'])
        .order('id', { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        return;
      }
      if (isMounted) setRows(data || []);
    };

    fetchRowsForDay();

    const channel = supabase
      .channel(`reservations-realtime-${dateISO}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          const affectsThisDay =
            (newRow && newRow.dateISO === dateISO) ||
            (oldRow && oldRow.dateISO === dateISO);

          if (!affectsThisDay) return;

          setRows((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((r) => r.id !== oldRow.id);
            }

            if (payload.eventType === 'INSERT') {
              if (prev.some((r) => r.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }

            if (payload.eventType === 'UPDATE') {
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
  }, [dateISO]);

  const stepDate = (dir) => setDateISO(prev => addDaysISO(prev, dir));
  const stepGuests = (dir) => setGuests(prev => clampGuests(prev + dir));
  const stepTime = (dir) => {
    let mins = minutesFromHHMM(timeHHMM) + (SLOT_MINUTES * dir);
    mins = ((mins % 1440) + 1440) % 1440;
    setTimeHHMM(hhmmFromMinutes(Math.round(mins / SLOT_MINUTES) * SLOT_MINUTES));
  };

  const handleSwitchToHostess = () => {
    const pass = prompt("Enter Hostess Password:");
    if (pass === HOSTESS_PASSWORD) setViewMode("hostess");
    else if (pass !== null) alert("Incorrect password");
  };

  const handleAddToWaitlist = async () => {
    if (isBlackout) return alert("Cannot add to waitlist on a closed day.");
    if (!walkInForm.firstName) return alert("First name is required.");
    const finalGuests = guests === "" ? 1 : guests;

    const newWaitEntry = {
      firstName: walkInForm.firstName.toUpperCase(),
      lastName: (walkInForm.lastName || "").toUpperCase(),
      guests: finalGuests,
      dateISO,
      timeHHMM,
      phone: walkInForm.phone || "",
      email: null,
      celebration: walkInForm.celebration || "None",
      dietary: walkInForm.dietary || "None",
      notes: walkInForm.notes || null,
      status: "waitlist",
      source: "walkin"
    };

    const { error } = await supabase.from('reservations').insert([newWaitEntry]);
    if (error) {
      console.error("Supabase insert waitlist error:", error);
      return alert("Error adding to wait list.");
    }

    setWalkInForm({ firstName: "", lastName: "", phone: "", celebration: "None", dietary: "None", notes: "" });
    setActiveTab('waitlist');
  };

  const handleSeatParty = async (party) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'seated', seated_at: new Date().toISOString() })
      .eq('id', party.id);

    if (error) {
      console.error("Supabase seat error:", error);
      alert("Error seating party.");
    }
  };

  const handleTableSelection = (table) => {
    if (table.status === 'occ') return;
    alert(`Table ${table.id} | Capacity: ${table.cap}`);
  };

  const toggleBlackoutDate = (dateToToggle) => {
    if (!dateToToggle) return;
    if (blackoutDates.includes(dateToToggle)) {
      setBlackoutDates(blackoutDates.filter(d => d !== dateToToggle));
    } else {
      setBlackoutDates([...blackoutDates, dateToToggle]);
    }
  };

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

  if (viewMode === "hostess") {
    const seatButtonStyle = {
      background: 'linear-gradient(135deg, #f2c300 0%, #d4ab00 100%)',
      color: '#000', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: '700',
      fontSize: '0.85rem', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease', textTransform: 'uppercase'
    };
    return (
      <div className="sr-page hostess-view">
        <style>{responsiveStyles}</style>
        <main className="sr-card hostess-layout">
          <aside className="sr-hostess-sidebar">
            <div className="sr-sidebar-header"><img src={logo} alt="Lindo Michoacán" className="sr-logo-small" /></div>
            <nav className="sr-sidebar-nav">
              <button className={activeTab === 'walkin' ? 'active' : ''} onClick={() => setActiveTab('walkin')}>Walk-in</button>
              <button className={activeTab === 'waitlist' ? 'active' : ''} onClick={() => setActiveTab('waitlist')}>Wait List ({waitList.length})</button>
              <button className={activeTab === 'reservations' ? 'active' : ''} onClick={() => setActiveTab('reservations')}>Reservations ({history.length})</button>
              <button className={activeTab === 'seated' ? 'active' : ''} onClick={() => setActiveTab('seated')}>Seated ({seatedList.length})</button>
              <button className={activeTab === 'floorplan' ? 'active' : ''} onClick={() => setActiveTab('floorplan')}>Floor Plan</button>
              <button className={activeTab === 'blackout' ? 'active' : ''} onClick={() => setActiveTab('blackout')} style={{marginTop: 'auto', borderTop: '1px solid #eee', color: '#666'}}>Blackout</button>
            </nav>
          </aside>
          <section className="sr-hostess-main">
            <header className="sr-main-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
                <h2>{activeTab === 'walkin' ? 'New Walk-in' : activeTab === 'waitlist' ? 'Wait List' : activeTab === 'reservations' ? 'Reservations' : activeTab === 'seated' ? 'Seated History' : activeTab === 'blackout' ? 'Manage Blackout' : 'Floor Plan'}</h2>
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
                      <input type="number" className="sr-guests-count" value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 1)} style={{width: '60px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '2rem', fontWeight: 'bold', color: '#000'}} disabled={isBlackout} />
                      <button className="sr-btn-mini" onClick={() => stepGuests(1)} disabled={isBlackout}>+</button>
                    </div>
                  </div>
                  <div className="sr-formGrid" style={{marginTop: '20px'}}>
                    <div className="sr-field"><label className="sr-fieldLabel">First Name</label><input className="sr-input" value={walkInForm.firstName} onChange={e => setWalkInForm({...walkInForm, firstName: e.target.value})} disabled={isBlackout}/></div>
                    <div className="sr-field"><label className="sr-fieldLabel">Last Name</label><input className="sr-input" value={walkInForm.lastName} onChange={e => setWalkInForm({...walkInForm, lastName: e.target.value})} disabled={isBlackout}/></div>
                    <div className="sr-field"><label className="sr-fieldLabel">Phone</label><input className="sr-input" value={walkInForm.phone} onChange={e => setWalkInForm({...walkInForm, phone: e.target.value})} disabled={isBlackout}/></div>
                    <div className="sr-field"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={walkInForm.celebration} onChange={e => setWalkInForm({...walkInForm, celebration: e.target.value})} disabled={isBlackout}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Other</option></select></div>
                    <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={walkInForm.dietary} onChange={e => setWalkInForm({...walkInForm, dietary: e.target.value})} disabled={isBlackout}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
                    <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={walkInForm.notes} onChange={e => setWalkInForm({...walkInForm, notes: e.target.value})} disabled={isBlackout}/></div>
                  </div>
                  <button className="sr-btn sr-btnPrimary" style={{marginTop: '20px', opacity: isBlackout ? 0.5 : 1}} onClick={handleAddToWaitlist} disabled={isBlackout}>Add to Wait List</button>
                </div>
              )}
              {activeTab === 'waitlist' && (
                <div className="sr-res-list">
                  {waitList.length === 0 ? <p>No guests in wait list.</p> : waitList.map(item => (
                    <div key={item.id} className="sr-list-item" style={{padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{ flex: 1 }}>
                        <strong>{item.firstName} {item.lastName}</strong> ({item.guests} pax)<br/>
                        <small style={{ color: '#999' }}>
                          Added at: {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </small>
                        {/* Se agregan datos extras en Waitlist */}
                        {item.celebration && item.celebration !== "None" && <div style={{ fontSize: '0.85rem', color: '#d4ab00', marginTop: '2px' }}>🎉 {item.celebration}</div>}
                        {item.dietary && item.dietary !== "None" && <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '2px' }}>🥗 {item.dietary}</div>}
                        {item.notes && <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#666', marginTop: '2px' }}>📝 "{item.notes}"</div>}
                      </div>
                      <button style={seatButtonStyle} onClick={() => handleSeatParty(item)}>Seat</button>
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
                          <span style={{ fontWeight: '700' }}>{res.time || formatTimeLabel(res.timeHHMM)}</span>
                        </div>
                        {/* Se agregan datos extras en Reservations */}
                        {res.celebration && res.celebration !== "None" && <div style={{ fontSize: '0.85rem', color: '#d4ab00', marginTop: '4px' }}>🎉 {res.celebration}</div>}
                        {res.dietary && res.dietary !== "None" && <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '2px' }}>🥗 {res.dietary}</div>}
                        {res.notes && <div style={{ color: '#555', fontSize: '0.85rem', background: '#f8f8f8', padding: '6px 12px', borderRadius: '6px', marginTop: '6px', display: 'inline-block' }}>"{res.notes}"</div>}
                      </div>
                      <button style={seatButtonStyle} onClick={() => handleSeatParty(res)}>Seat</button>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'seated' && (
                <div className="sr-res-list">
                  {seatedList.length === 0 ? <p>No seated guests today.</p> : seatedList.map(item => (
                    <div key={item.id} style={{padding: '15px', borderBottom: '1px solid #eee'}}>
                      <strong>{item.firstName} {item.lastName}</strong> - Seated at:{" "}
                      {item.seated_at ? new Date(item.seated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
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
      </div>
    );
  }

  if (step === "search") {
    return (
      <div className="sr-page">
        <style>{responsiveStyles}</style>
        <main className="sr-card">
          <header className="sr-header"><img className="sr-logo" src={logo} alt="Logo" /></header>
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
              <div className="sr-center"><div className="sr-value">{guests}</div><div className="sr-label">Guests</div></div>
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
          <div className="sr-foot">Max party size: {MAX_GUESTS} · 15 min slots</div>
        </main>
        <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
      </div>
    );
  }

  return (
    <div className="sr-page sr-form-step">
      <style>{responsiveStyles}</style>
      <main className="sr-card">
        <header className="sr-header"><img className="sr-logo" src={logo} alt="Logo" /></header>
        <div className="sr-summary"><div className="sr-summaryTitle">{dateLabel} · {timeLabel} · {guests} guests</div></div>
        <section className="sr-form">
          <div className="sr-formGrid">
            <div className="sr-field"><label className="sr-fieldLabel">First name</label><input className="sr-input" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Last name</label><input className="sr-input" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Telephone</label><input className="sr-input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Celebration</label><select className="sr-input" value={celebration} onChange={e => setCelebration(e.target.value)}><option>None</option><option>Birthday</option><option>Anniversary</option><option>Other</option></select></div>
            <div className="sr-field"><label className="sr-fieldLabel">Dietary Restrictions</label><select className="sr-input" value={dietary} onChange={e => setDietary(e.target.value)}><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Gluten Free</option><option>Dairy Free</option><option>Nut Allergy</option><option>Shellfish Allergy</option></select></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          <div className="sr-actions">
            <button className="sr-btn" onClick={() => setStep("search")}>Back</button>
            <button className="sr-btn sr-btnPrimary" onClick={async () => {
              if (!firstName || !lastName || !phone) return alert("Por favor completa Nombre, Apellido y Teléfono.");

              const newRes = {
                firstName: firstName.toUpperCase(),
                lastName: lastName.toUpperCase(),
                guests,
                dateISO,
                timeHHMM,
                phone,
                email,
                celebration,
                dietary,
                notes
              };

              // 1. Guardar en SUPABASE
              try {
                const { error: sbError } = await supabase.from('reservations').insert([newRes]);
                if (sbError) throw sbError;
              } catch (e) {
                console.error("Supabase Error:", e);
              }

              // 2. Enviar a GOOGLE CALENDAR (Netlify Function)
              try {
                const startISO = toLocalDateTimeISO(dateISO, timeHHMM);
                const endISO = addMinutesToLocalDateTimeISO(dateISO, timeHHMM, 90);
                await fetch("/.netlify/functions/create-event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reservation: { ...newRes, startISO, endISO }
                  })
                });
                alert("✅ ¡Reserva confirmada!");
              } catch (e) {
                alert("✅ Reserva guardada (Modo Local).");
              }

              // Limpiar
              setFirstName(""); setLastName(""); setNotes(""); setPhone(""); setStep("search");
            }}>Submit</button>
          </div>
        </section>
      </main>
      <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
    </div>
  );
}
