import { useMemo, useRef, useState } from "react";
import "./App.css";
import logo from "/logo.png";

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
  const [activeTab, setActiveTab] = useState("waitlist");
  const [activeFloor, setActiveFloor] = useState("BAR");
  
  const [dateISO, setDateISO] = useState(() => dateISOFromDate(new Date()));
  const [guests, setGuests] = useState(2);
  const [timeHHMM, setTimeHHMM] = useState("19:00");

  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const dateLabel = useMemo(() => formatDateLabel(dateISO), [dateISO]);
  const timeLabel = useMemo(() => formatTimeLabel(timeHHMM), [timeHHMM]);

  // Almacenamiento Separado
  const [history, setHistory] = useState([]);      // Reservaciones
  const [waitList, setWaitList] = useState([]);    // Wait List
  const [seatedList, setSeatedList] = useState([]); // SEATED HISTORY (NUEVO)

  // Campos del Formulario Walk-in
  const [walkInForm, setWalkInForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    celebration: "None",
    notes: ""
  });

  // Campos Vista Cliente
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [celebration, setCelebration] = useState("None");
  const [notes, setNotes] = useState("");

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

  const handleAddToWaitlist = () => {
    if(!walkInForm.firstName) return alert("First name is required.");
    const newWaitEntry = {
      ...walkInForm,
      guests,
      id: Date.now(),
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setWaitList([newWaitEntry, ...waitList]);
    setWalkInForm({ firstName: "", lastName: "", phone: "", celebration: "None", notes: "" });
    setActiveTab('waitlist');
  };

  // LOGICA PARA SENTAR (Se usa en Waitlist y Reservations)
  const handleSeatParty = (party, fromList) => {
    const seatedParty = {
      ...party,
      seatedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (fromList === 'waitlist') {
      setWaitList(waitList.filter(item => item.id !== party.id));
    } else {
      setHistory(history.filter(item => item.id !== party.id));
    }

    setSeatedList([seatedParty, ...seatedList]);
    alert(`${party.firstName} has been seated.`);
  };

  const handleTableSelection = (table) => {
    if (table.status === 'occ') return;
    alert(`Table ${table.id} | Capacity: ${table.cap}`);
  };

  /* --- VISTA HOSTESS --- */
  if (viewMode === "hostess") {
    return (
      <div className="sr-page hostess-view">
        <main className="sr-card hostess-layout">
          <aside className="sr-hostess-sidebar">
            <div className="sr-sidebar-header">
              <img src={logo} alt="Lindo Michoacán" className="sr-logo-small" />
            </div>
            <nav className="sr-sidebar-nav">
              <button className={activeTab === 'walkin' ? 'active' : ''} onClick={() => setActiveTab('walkin')}>Walk-in</button>
              <button className={activeTab === 'waitlist' ? 'active' : ''} onClick={() => setActiveTab('waitlist')}>Wait List ({waitList.length})</button>
              <button className={activeTab === 'reservations' ? 'active' : ''} onClick={() => setActiveTab('reservations')}>Reservations ({history.length})</button>
              <button className={activeTab === 'seated' ? 'active' : ''} onClick={() => setActiveTab('seated')}>Seated ({seatedList.length})</button>
              <button className={activeTab === 'floorplan' ? 'active' : ''} onClick={() => setActiveTab('floorplan')}>Floor Plan</button>
            </nav>
            <div className="sr-sidebar-footer">
              <div className="sr-status-dot"></div> Hostess Online
            </div>
          </aside>

          <section className="sr-hostess-main">
            <header className="sr-main-header">
              <h2>{
                activeTab === 'walkin' ? 'New Walk-in' : 
                activeTab === 'waitlist' ? 'Wait List' : 
                activeTab === 'reservations' ? 'Reservations' : 
                activeTab === 'seated' ? 'Seated History' : 'Floor Plan'
              }</h2>
              <div className="sr-current-date">{dateLabel}</div>
            </header>
            
            <div className="sr-main-content">
              {activeTab === 'walkin' && (
                <div className="sr-walkin-form">
                  <div className="sr-center">
                    <label className="sr-fieldLabel">PARTY SIZE</label>
                    <div className="sr-row-simple">
                      <button className="sr-btn-mini" onClick={() => stepGuests(-1)}>−</button>
                      <span className="sr-guests-count">{guests}</span>
                      <button className="sr-btn-mini" onClick={() => stepGuests(1)}>+</button>
                    </div>
                  </div>
                  
                  <div className="sr-formGrid" style={{marginTop: '20px'}}>
                    <div className="sr-field"><label className="sr-fieldLabel">First Name</label>
                      <input className="sr-input" value={walkInForm.firstName} onChange={e => setWalkInForm({...walkInForm, firstName: e.target.value})} />
                    </div>
                    <div className="sr-field"><label className="sr-fieldLabel">Last Name</label>
                      <input className="sr-input" value={walkInForm.lastName} onChange={e => setWalkInForm({...walkInForm, lastName: e.target.value})} />
                    </div>
                    <div className="sr-field"><label className="sr-fieldLabel">Phone</label>
                      <input className="sr-input" value={walkInForm.phone} onChange={e => setWalkInForm({...walkInForm, phone: e.target.value})} />
                    </div>
                    <div className="sr-field"><label className="sr-fieldLabel">Celebration</label>
                      <select className="sr-input" value={walkInForm.celebration} onChange={e => setWalkInForm({...walkInForm, celebration: e.target.value})}>
                        <option>None</option><option>Birthday</option><option>Anniversary</option><option>Other</option>
                      </select>
                    </div>
                    <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label>
                      <textarea className="sr-textarea" value={walkInForm.notes} onChange={e => setWalkInForm({...walkInForm, notes: e.target.value})} />
                    </div>
                  </div>

                  <button className="sr-btn sr-btnPrimary" style={{marginTop: '20px'}} onClick={handleAddToWaitlist}>
                    Add to Wait List
                  </button>
                </div>
              )}

              {activeTab === 'waitlist' && (
                <div className="sr-res-list">
                  {waitList.length === 0 ? <p>No guests in wait list.</p> : waitList.map(item => (
                    <div key={item.id} className="sr-list-item" style={{padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <strong>{item.firstName} {item.lastName}</strong> ({item.guests} pax)<br/>
                        <small>Added at: {item.timeAdded}</small>
                      </div>
                      <button className="sr-btn-mini" style={{background: '#f2c300', color: '#000', fontWeight: 'bold'}} onClick={() => handleSeatParty(item, 'waitlist')}>
                        SEAT
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'reservations' && (
                <div className="sr-res-list">
                  {history.length === 0 ? <p>No active reservations.</p> : history.map(res => (
                    <div key={res.id} className="sr-list-item" style={{padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <strong>{res.firstName} {res.lastName}</strong> ({res.guests} pax)
                      </div>
                      <button className="sr-btn-mini" style={{background: '#f2c300', color: '#000', fontWeight: 'bold'}} onClick={() => handleSeatParty(res, 'reservations')}>
                        SEAT
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'seated' && (
                <div className="sr-res-list">
                  {seatedList.length === 0 ? <p>No seated guests today.</p> : seatedList.map(item => (
                    <div key={item.id} style={{padding: '15px', borderBottom: '1px solid #eee'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <strong>{item.firstName} {item.lastName}</strong>
                        <span style={{color: 'green', fontSize: '0.75rem', fontWeight: 'bold'}}>SEATED</span>
                      </div>
                      <small>{item.guests} pax | Seated at: {item.seatedTime}</small>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'floorplan' && (
                <div className="sr-floor-manager">
                  <div className="sr-zone-selector">
                    {Object.keys(FLOOR_CONFIG).map(f => (
                      <button key={f} className={activeFloor === f ? 'active' : ''} onClick={() => setActiveFloor(f)}>
                        {f === 'ROOM1' ? 'Floor 1' : f === 'ROOM2' ? 'Room 2' : f === 'ROOM3' ? 'Room 3' : 'Bar'}
                      </button>
                    ))}
                  </div>
                  <div className="sr-map-canvas">
                    <div className="sr-image-wrapper">
                      <img src={activeFloor === 'BAR' ? '/BAR.png' : activeFloor === 'ROOM1' ? '/FLOOR 1.jpg' : activeFloor === 'ROOM2' ? '/ROOM 2.jpg' : '/ROOM 3.jpg'} alt={activeFloor} className="sr-floor-img" />
                      {FLOOR_CONFIG[activeFloor].map(table => (
                        <button 
                          key={table.id}
                          className={`sr-table-marker shape-${table.shape || 'square'} ${table.status === 'occ' ? 'is-occupied' : 'is-available'}`}
                          style={{ top: table.top, left: table.left }}
                          onClick={() => handleTableSelection(table)}
                        >
                          <span className="table-id">{table.id}</span>
                          <span className="table-cap">{table.cap}</span>
                        </button>
                      ))}
                    </div>
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

  /* --- VISTA CLIENTE --- */
  if (step === "search") {
    return (
      <div className="sr-page">
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
          <button className="sr-search" onClick={() => setStep("details")}>Search</button>
          <div className="sr-foot">Max party size: {MAX_GUESTS} · 15 min slots</div>
        </main>
        <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
      </div>
    );
  }

  return (
    <div className="sr-page sr-form-step">
      <main className="sr-card">
        <header className="sr-header"><img className="sr-logo" src={logo} alt="Logo" /></header>
        <div className="sr-summary">
          <div className="sr-summaryTitle">{dateLabel} · {timeLabel} · {guests} guests</div>
          <div className="sr-label">Reservation details</div>
        </div>
        <section className="sr-form">
          <div className="sr-formGrid">
            <div className="sr-field"><label className="sr-fieldLabel">First name</label><input className="sr-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Last name</label><input className="sr-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Telephone</label><input className="sr-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(702) 000-0000" /></div>
            <div className="sr-field"><label className="sr-fieldLabel">Email</label><input className="sr-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Celebration</label>
              <select className="sr-input" value={celebration} onChange={e => setCelebration(e.target.value)}>
                <option>None</option><option>Birthday</option><option>Anniversary</option><option>Graduation</option><option>Other</option>
              </select>
            </div>
            <div className="sr-field sr-span2"><label className="sr-fieldLabel">Notes</label><textarea className="sr-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special requests..." /></div>
          </div>
          <div className="sr-actions">
            <button className="sr-btn" onClick={() => setStep("search")}>Back</button>
            <button className="sr-btn sr-btnPrimary" onClick={() => {
              const resId = Date.now();
              setHistory([{id: resId, firstName, lastName, phone, email, celebration, notes, guests, time: timeLabel, date: dateLabel}, ...history]);
              alert("Reserved!");
              setStep("search");
            }}>Submit</button>
          </div>
        </section>
      </main>
      <button className="sr-view-toggle" onClick={handleSwitchToHostess}>Switch to Hostess View</button>
    </div>
  );
}