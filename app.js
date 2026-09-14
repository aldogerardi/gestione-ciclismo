/* ===================== COSTANTI ===================== */
const APP_VERSION = "1.61";
const NICKNAME_KEY = "gestione_ciclismo_nickname";

/* ===================== FIREBASE ===================== */
const firebaseConfig = {
  apiKey: "AIzaSyCsF0cL2OLwdcA2T_yVYDD0jdmThhViFmo",
  authDomain: "gestione-ciclismo.firebaseapp.com",
  projectId: "gestione-ciclismo",
  storageBucket: "gestione-ciclismo.firebasestorage.app",
  messagingSenderId: "252606351948",
  appId: "1:252606351948:web:64d0deb54a61edaefd02e9",
  measurementId: "G-0MHZR04Y0S",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
try {
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
} catch (e) {}
const statoDocRef = db.collection("gestioneCiclismo").doc("statoSquadra");

let statoCaricato = false;

const SEZIONI = [
  { id: "societa", nome: "Società", icona: "🏛️" },
  { id: "anagrafica", nome: "Anagrafica", icona: "👤" },
  { id: "quota", nome: "Quota", icona: "💶" },
  { id: "sponsor", nome: "Sponsor", icona: "🤝" },
  { id: "abbigliamento", nome: "Abbigliamento", icona: "👕" },
  { id: "uscite", nome: "Uscite gruppo", icona: "🚴" },
  { id: "presenze", nome: "Presenze", icona: "✅" },
  { id: "gare", nome: "Gare", icona: "🏁" },
  { id: "circuiti", nome: "Circuiti", icona: "🗺️" },
  { id: "report", nome: "Report", icona: "📊" },
  { id: "cassa", nome: "Cassa", icona: "💰" },
];

const CATEGORIE = [
  "Debuttanti (15 - 18 anni)",
  "Junior (19 - 29 anni)",
  "Senior 1 / Senior A (30 - 34 anni)",
  "Senior 2 / Senior B (35 - 39 anni)",
  "Veterani 1 / Veterano A (40 - 44 anni)",
  "Veterani 2 / Veterano B (45 - 49 anni)",
  "Gentleman 1 / Gentleman A (50 - 54 anni)",
  "Gentleman 2 / Gentleman B (55 - 59 anni)",
  "Super Gentleman A (60 - 64 anni)",
  "Super Gentleman B (65 - 75 anni)",
  "Junior Woman / Debuttanti-Junior (15 - 18 anni)",
  "Woman A / Donna A (19 - 39 anni)",
  "Woman B / Donna B (40 - 49 anni)",
  "Woman C / Donna C (50+ anni)",
];

/* ===================== STATO / STORAGE ===================== */
function defaultState() {
  return {
    settings: {
      teamName: "Nome Squadra",
      logo: null,
      color1: "#111111",
      color2: "#ffffff",
      color3: "#7b2ff7",
      utentiAbilitati: [
        "segretariato", "pc_segretariato",
        "presidente", "pc_presidente",
        "vicepresidente", "pc_vicepresidente",
        "segretario", "pc_segretario",
      ],
    },
    anagrafica: [],
    quotaPagamenti: [],
    circuiti: [],
    gare: [],
    sponsor: [],
    uscite: [],
  };
}

function normalizzaStato(parsed) {
  const base = defaultState();
  return {
    settings: Object.assign(base.settings, parsed.settings || {}),
    anagrafica: parsed.anagrafica || [],
    quotaPagamenti: parsed.quotaPagamenti || [],
    circuiti: parsed.circuiti || [],
    gare: parsed.gare || [],
    sponsor: parsed.sponsor || [],
    uscite: parsed.uscite || [],
  };
}

function saveState() {
  statoDocRef.set(state).catch((e) => {
    console.error("Errore salvataggio su Firebase:", e);
    alert("Impossibile salvare i dati: controlla la connessione e riprova.");
  });
}

/* ===================== ACCESSO (nickname) ===================== */
function getNickname() {
  return localStorage.getItem(NICKNAME_KEY) || "";
}

function utenteAbilitato(nome) {
  const lista = (state.settings.utentiAbilitati || []).map((u) => u.toLowerCase().trim());
  return lista.includes(nome.toLowerCase().trim());
}

function confermaNickname() {
  const val = document.getElementById("inpNickname").value.trim();
  if (!val) return;
  if (!utenteAbilitato(val)) {
    alert("Nome non abilitato. Contatta un amministratore per essere aggiunto alla lista utenti.");
    return;
  }
  localStorage.setItem(NICKNAME_KEY, val);
  document.getElementById("nicknameGate").classList.remove("open");
}

function cambiaNickname() {
  closeSetup();
  document.getElementById("inpNickname").value = getNickname();
  document.getElementById("nicknameGate").classList.add("open");
}

function verificaAccesso() {
  const nick = getNickname();
  if (nick && utenteAbilitato(nick)) {
    document.getElementById("nicknameGate").classList.remove("open");
  } else {
    document.getElementById("nicknameGate").classList.add("open");
  }
}

function renderListaUtentiAbilitati() {
  const cont = document.getElementById("listaUtentiAbilitati");
  const lista = state.settings.utentiAbilitati || [];
  cont.innerHTML = lista
    .map(
      (u, i) => `
      <span class="utente-chip">
        ${u}
        <button type="button" class="rimuovi-utente" onclick="rimuoviUtenteAbilitato(${i})">✕</button>
      </span>`
    )
    .join("");
}

function aggiungiUtenteAbilitato() {
  const inp = document.getElementById("inpNuovoUtente");
  const val = inp.value.trim();
  if (!val) return;
  if (!state.settings.utentiAbilitati) state.settings.utentiAbilitati = [];
  if (utenteAbilitato(val)) {
    alert("Questo utente è già in lista.");
    return;
  }
  state.settings.utentiAbilitati.push(val);
  saveState();
  inp.value = "";
  renderListaUtentiAbilitati();
}

function rimuoviUtenteAbilitato(index) {
  const lista = state.settings.utentiAbilitati || [];
  const nome = lista[index];
  if (!confirm(`Rimuovere "${nome}" dagli utenti abilitati?`)) return;
  lista.splice(index, 1);
  saveState();
  renderListaUtentiAbilitati();
}

/* ===================== STATO ===================== */
let state = defaultState();

function avviaApp() {
  firebase.auth().signInAnonymously().catch((e) => {
    console.error("Errore autenticazione Firebase:", e);
  });

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) return;
    statoDocRef.onSnapshot(
      (doc) => {
        if (doc.exists) {
          state = normalizzaStato(doc.data());
        } else if (!statoCaricato) {
          // primo avvio in assoluto: nessun documento su Firebase, lo creiamo
          statoDocRef.set(state).catch(() => {});
        }
        statoCaricato = true;
        document.getElementById("syncLoading").classList.remove("open");
        verificaAccesso();
        render();
      },
      (e) => {
        console.error("Errore lettura da Firebase:", e);
        document.getElementById("syncLoading").classList.remove("open");
        alert("Impossibile collegarsi ai dati della squadra: controlla la connessione.");
      }
    );
  });
}
let currentSection = "anagrafica";
let editingAtletaId = null;
let filtroTesto = "";
let quotaAnnoSel = new Date().getFullYear();
let quotaAtletaSel = "";
let editingGaraId = null;
let editingSponsorId = null;
let editingUscitaId = null;
let usciteVistaTutte = false;
let abbigliamentoAnnoSel = new Date().getFullYear();

/* ===================== UTIL ===================== */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parseDataIT(str) {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
}

function isScaduta(dataStr) {
  const d = parseDataIT(dataStr);
  if (!d) return false;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  return d < oggi;
}

function applicaColori() {
  document.documentElement.style.setProperty("--c1", state.settings.color1 || "#111111");
  document.documentElement.style.setProperty("--c2", state.settings.color2 || "#ffffff");
  document.documentElement.style.setProperty("--c3", state.settings.color3 || "#7b2ff7");
}

/* ===================== TOPBAR / NAV ===================== */
function renderTopbar() {
  document.getElementById("topTeamName").firstChild.textContent = (state.settings.teamName || "Nome Squadra") + " ";
  document.getElementById("topVersion").textContent = "v" + APP_VERSION;
  const logoEl = document.getElementById("topLogo");
  if (state.settings.logo) {
    logoEl.innerHTML = `<img src="${state.settings.logo}">`;
  } else {
    const iniziali = (state.settings.teamName || "GC").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    logoEl.textContent = iniziali || "GC";
  }
}

function renderBottomnav() {
  const nav = document.getElementById("bottomnav");
  nav.innerHTML = "";
  SEZIONI.forEach(sec => {
    const btn = document.createElement("button");
    btn.className = "navbtn" + (sec.id === currentSection ? " active" : "");
    btn.innerHTML = `<span class="navicon">${sec.icona}</span><span>${sec.nome}</span>`;
    btn.onclick = () => { currentSection = sec.id; render(); };
    nav.appendChild(btn);
  });
  const activeBtn = nav.querySelector(".navbtn.active");
  if (activeBtn) {
    activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

/* ===================== BARRA: NASCONDI ALLO SCROLL ===================== */
let ultimoScrollY = 0;
function gestisciScrollNav() {
  const nav = document.getElementById("bottomnav");
  const contentEl = document.getElementById("content");
  const scrollY = contentEl.scrollTop;
  const delta = scrollY - ultimoScrollY;

  if (scrollY <= 20) {
    nav.classList.remove("hidden");
  } else if (delta > 8) {
    nav.classList.add("hidden");
  } else if (delta < -8) {
    nav.classList.remove("hidden");
  }
  ultimoScrollY = scrollY;
}

/* ===================== SWIPE ORIZZONTALE TRA SEZIONI ===================== */
let swipeStartX = 0;
let swipeStartY = 0;

function gestisciSwipeStart(e) {
  const t = e.touches ? e.touches[0] : e;
  swipeStartX = t.clientX;
  swipeStartY = t.clientY;
}

function gestisciSwipeEnd(e) {
  const t = e.changedTouches ? e.changedTouches[0] : e;
  const deltaX = t.clientX - swipeStartX;
  const deltaY = t.clientY - swipeStartY;
  if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
    const idx = SEZIONI.findIndex(s => s.id === currentSection);
    if (deltaX < 0 && idx < SEZIONI.length - 1) {
      currentSection = SEZIONI[idx + 1].id;
      render();
    } else if (deltaX > 0 && idx > 0) {
      currentSection = SEZIONI[idx - 1].id;
      render();
    }
  }
}

/* ===================== RENDER SEZIONI ===================== */
function renderContent() {
  const content = document.getElementById("content");
  if (currentSection === "anagrafica") {
    renderAnagraficaSection(content);
    return;
  }
  if (currentSection === "quota") {
    renderQuotaSection(content);
    return;
  }
  if (currentSection === "circuiti") {
    renderCircuitiSection(content);
    return;
  }
  if (currentSection === "gare") {
    renderGareSection(content);
    return;
  }
  if (currentSection === "sponsor") {
    renderSponsorSection(content);
    return;
  }
  if (currentSection === "uscite") {
    renderUsciteSection(content);
    return;
  }
  if (currentSection === "presenze") {
    renderPresenzeSection(content);
    return;
  }
  if (currentSection === "abbigliamento") {
    renderAbbigliamentoSection(content);
    return;
  }
  const sec = SEZIONI.find(s => s.id === currentSection);
  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>${sec.nome}</div>
    <div class="placeholder-card">
      <span class="icon">${sec.icona}</span>
      Sezione <b>${sec.nome}</b> pronta per lo sviluppo.<br>Struttura dati da definire.
    </div>
  `;
}

function render() {
  applicaColori();
  renderTopbar();
  renderBottomnav();
  renderContent();
  ultimoScrollY = 0;
  document.getElementById("content").scrollTop = 0;
  document.getElementById("bottomnav").classList.remove("hidden");
}

/* ===================== SEZIONE ANAGRAFICA ===================== */
function renderAnagraficaSection(content) {
  const lista = state.anagrafica
    .filter(a => {
      if (!filtroTesto) return true;
      const t = filtroTesto.toLowerCase();
      return (a.cognome + " " + a.nome).toLowerCase().includes(t);
    })
    .sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome));

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Anagrafica</div>
    <div class="list-toolbar">
      <input type="text" id="ricercaAtleta" placeholder="Cerca per nome o cognome..." value="${filtroTesto}">
      <button class="fab-add" onclick="apriNuovoAtleta()">+</button>
    </div>
    <div id="listaAtleti"></div>
  `;

  document.getElementById("ricercaAtleta").addEventListener("input", (e) => {
    filtroTesto = e.target.value;
    renderContent();
    document.getElementById("ricercaAtleta").focus();
    const val = document.getElementById("ricercaAtleta").value;
    document.getElementById("ricercaAtleta").value = val;
    document.getElementById("ricercaAtleta").setSelectionRange(val.length, val.length);
  });

  const listaEl = document.getElementById("listaAtleti");
  if (lista.length === 0) {
    listaEl.innerHTML = `<div class="empty-state">Nessun atleta in anagrafica.<br>Tocca + per aggiungerne uno.</div>`;
    return;
  }

  const WHATSAPP_SVG = `<svg width="13" height="13" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#fff" d="M23.5 8.5A10.6 10.6 0 0 0 16 5.3c-5.9 0-10.7 4.8-10.7 10.6 0 1.9.5 3.7 1.4 5.3L5.3 26.7l5.6-1.5a10.7 10.7 0 0 0 5.1 1.3c5.9 0 10.7-4.8 10.7-10.6 0-2.8-1.1-5.5-3.2-7.4zm-7.5 16.3c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3.3.9.9-3.2-.2-.3a8.8 8.8 0 0 1-1.3-4.6c0-4.8 3.9-8.8 8.8-8.8 2.3 0 4.5.9 6.2 2.6a8.7 8.7 0 0 1 2.6 6.2c-.1 4.9-4 8.6-8.9 8.6zm4.8-6.6c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3 1 2.5 1.1 2.6.1.2 1.9 3 4.7 4.1.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.6-.4z"/></svg>`;
  const SMS_SVG = `<svg width="13" height="13" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#3B82F6"/><path fill="#fff" d="M8 10a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2v3l4-3h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H8z"/></svg>`;

  listaEl.innerHTML = lista.map(a => {
    const badges = [];
    if (a.sms) badges.push(`<span class="badge" title="SMS">${SMS_SVG}</span>`);
    if (a.whatsapp) badges.push(`<span class="badge" title="WhatsApp">${WHATSAPP_SVG}</span>`);
    if (a.email) badges.push(`<span class="badge" title="Email">@</span>`);
    if (!a.privacy) badges.push(`<span class="badge warn">🔒❗</span>`);
    if (isScaduta(a.scadenzaVisita)) badges.push(`<span class="badge warn">🩺❗</span>`);
    const contatti = [a.telefono, a.cellulare].filter(Boolean).join(" - ");
    return `
      <div class="persona-card">
        <div class="persona-card-top">
          <div class="persona-info-col">
            <div class="persona-nome">${a.cognome} ${a.nome}</div>
            <div class="persona-sub">${contatti}</div>
          </div>
          <div class="persona-actions">
            <button onclick="apriModificaAtleta('${a.id}')">✏️</button>
            <button onclick="confermaEliminaAtleta('${a.id}')">🗑️</button>
          </div>
        </div>
        ${badges.length ? `<div class="persona-badges">${badges.join("")}</div>` : ""}
      </div>
    `;
  }).join("");
}

function popolaCategorieSelect() {
  const sel = document.getElementById("fCategoria");
  sel.innerHTML = `<option value="">-</option>` + CATEGORIE.map(c => `<option value="${c}">${c}</option>`).join("");
}

function apriNuovoAtleta() {
  editingAtletaId = null;
  document.getElementById("anagraficaFormTitle").textContent = "Nuovo Atleta";
  document.getElementById("eliminaAtletaRow").style.display = "none";
  popolaCategorieSelect();
  [
    "fCognome","fNome","fDataNascita","fCodiceFiscale","fLuogoNascita","fProvNascita",
    "fResidenza","fPaese","fProvincia","fCap","fTelefono","fCellulare","fEmail",
    "fNrTessera","fDataTesseramento","fSoprannome","fDataVisita","fScadenzaVisita",
    "fTagliaMagliaEstiva","fTagliaPantEstivo","fTagliaSmanicato","fTagliaAntiacqua",
    "fTagliaMagliaInvernale","fTagliaPantLunghi","fTagliaGiubbino",
    "fTagliaCalze","fTagliaGuanti","fNote"
  ].forEach(id => document.getElementById(id).value = "");
  document.getElementById("fFederazione").value = "";
  document.getElementById("fCategoria").value = "";
  document.getElementById("fSms").checked = false;
  document.getElementById("fWhatsapp").checked = false;
  document.getElementById("fPrivacy").checked = false;
  document.getElementById("fVisitaMedica").checked = false;
  document.getElementById("fPrivacyDocStatus").textContent = "Nessuno";
  document.getElementById("fVisitaDocStatus").textContent = "Nessuno";
  document.getElementById("fPrivacyDoc").value = "";
  document.getElementById("fVisitaDoc").value = "";
  tempPrivacyDoc = null;
  tempVisitaDoc = null;
  document.getElementById("storicoQuoteBlock").style.display = "none";
  document.getElementById("anagraficaOverlay").classList.add("open");
}

function apriModificaAtleta(id) {
  const a = state.anagrafica.find(x => x.id === id);
  if (!a) return;
  editingAtletaId = id;
  document.getElementById("anagraficaFormTitle").textContent = "Modifica Atleta";
  document.getElementById("eliminaAtletaRow").style.display = "block";
  popolaCategorieSelect();

  document.getElementById("fCognome").value = a.cognome || "";
  document.getElementById("fNome").value = a.nome || "";
  document.getElementById("fDataNascita").value = a.dataNascita || "";
  document.getElementById("fCodiceFiscale").value = a.codiceFiscale || "";
  document.getElementById("fLuogoNascita").value = a.luogoNascita || "";
  document.getElementById("fProvNascita").value = a.provNascita || "";
  document.getElementById("fResidenza").value = a.residenza || "";
  document.getElementById("fPaese").value = a.paese || "";
  document.getElementById("fProvincia").value = a.provincia || "";
  document.getElementById("fCap").value = a.cap || "";
  document.getElementById("fTelefono").value = a.telefono || "";
  document.getElementById("fCellulare").value = a.cellulare || "";
  document.getElementById("fEmail").value = a.email || "";
  document.getElementById("fSms").checked = !!a.sms;
  document.getElementById("fWhatsapp").checked = !!a.whatsapp;
  document.getElementById("fPrivacy").checked = !!a.privacy;
  document.getElementById("fFederazione").value = a.federazione || "";
  document.getElementById("fNrTessera").value = a.nrTessera || "";
  document.getElementById("fDataTesseramento").value = a.dataTesseramento || "";
  document.getElementById("fCategoria").value = a.categoria || "";
  document.getElementById("fSoprannome").value = a.soprannome || "";
  document.getElementById("fVisitaMedica").checked = !!a.visitaMedica;
  document.getElementById("fDataVisita").value = a.dataVisita || "";
  document.getElementById("fScadenzaVisita").value = a.scadenzaVisita || "";
  document.getElementById("fTagliaMagliaEstiva").value = a.tagliaMagliaEstiva || "";
  document.getElementById("fTagliaPantEstivo").value = a.tagliaPantEstivo || "";
  document.getElementById("fTagliaSmanicato").value = a.tagliaSmanicato || "";
  document.getElementById("fTagliaAntiacqua").value = a.tagliaAntiacqua || "";
  document.getElementById("fTagliaMagliaInvernale").value = a.tagliaMagliaInvernale || "";
  document.getElementById("fTagliaPantLunghi").value = a.tagliaPantLunghi || "";
  document.getElementById("fTagliaGiubbino").value = a.tagliaGiubbino || "";
  document.getElementById("fTagliaCalze").value = a.tagliaCalze || "";
  document.getElementById("fTagliaGuanti").value = a.tagliaGuanti || "";
  document.getElementById("fNote").value = a.note || "";

  tempPrivacyDoc = a.privacyDoc || null;
  tempVisitaDoc = a.visitaDoc || null;
  document.getElementById("fPrivacyDocStatus").textContent = a.privacyDocNome || "Nessuno";
  document.getElementById("fVisitaDocStatus").textContent = a.visitaDocNome || "Nessuno";

  renderStoricoQuote(a.id);
  document.getElementById("anagraficaOverlay").classList.add("open");
}

function closeAnagraficaForm() {
  document.getElementById("anagraficaOverlay").classList.remove("open");
}

let tempPrivacyDoc = null;
let tempPrivacyDocNome = null;
let tempVisitaDoc = null;
let tempVisitaDocNome = null;

document.getElementById("fPrivacyDoc").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    tempPrivacyDoc = ev.target.result;
    tempPrivacyDocNome = file.name;
    document.getElementById("fPrivacyDocStatus").textContent = file.name;
  };
  reader.readAsDataURL(file);
});

document.getElementById("fVisitaDoc").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    tempVisitaDoc = ev.target.result;
    tempVisitaDocNome = file.name;
    document.getElementById("fVisitaDocStatus").textContent = file.name;
  };
  reader.readAsDataURL(file);
});

function salvaAtleta() {
  const cognome = document.getElementById("fCognome").value.trim();
  const nome = document.getElementById("fNome").value.trim();
  if (!cognome || !nome) {
    alert("Cognome e Nome sono obbligatori.");
    return;
  }

  const atleta = {
    id: editingAtletaId || uid(),
    cognome, nome,
    dataNascita: document.getElementById("fDataNascita").value.trim(),
    codiceFiscale: document.getElementById("fCodiceFiscale").value.trim(),
    luogoNascita: document.getElementById("fLuogoNascita").value.trim(),
    provNascita: document.getElementById("fProvNascita").value.trim().toUpperCase(),
    residenza: document.getElementById("fResidenza").value.trim(),
    paese: document.getElementById("fPaese").value.trim(),
    provincia: document.getElementById("fProvincia").value.trim().toUpperCase(),
    cap: document.getElementById("fCap").value.trim(),
    telefono: document.getElementById("fTelefono").value.trim(),
    cellulare: document.getElementById("fCellulare").value.trim(),
    email: document.getElementById("fEmail").value.trim(),
    sms: document.getElementById("fSms").checked,
    whatsapp: document.getElementById("fWhatsapp").checked,
    privacy: document.getElementById("fPrivacy").checked,
    privacyDoc: tempPrivacyDoc,
    privacyDocNome: tempPrivacyDocNome || (editingAtletaId ? (state.anagrafica.find(x=>x.id===editingAtletaId)||{}).privacyDocNome : null),
    federazione: document.getElementById("fFederazione").value,
    nrTessera: document.getElementById("fNrTessera").value.trim(),
    dataTesseramento: document.getElementById("fDataTesseramento").value.trim(),
    categoria: document.getElementById("fCategoria").value,
    soprannome: document.getElementById("fSoprannome").value.trim(),
    visitaMedica: document.getElementById("fVisitaMedica").checked,
    visitaDoc: tempVisitaDoc,
    visitaDocNome: tempVisitaDocNome || (editingAtletaId ? (state.anagrafica.find(x=>x.id===editingAtletaId)||{}).visitaDocNome : null),
    dataVisita: document.getElementById("fDataVisita").value.trim(),
    scadenzaVisita: document.getElementById("fScadenzaVisita").value.trim(),
    tagliaMagliaEstiva: document.getElementById("fTagliaMagliaEstiva").value.trim(),
    tagliaPantEstivo: document.getElementById("fTagliaPantEstivo").value.trim(),
    tagliaSmanicato: document.getElementById("fTagliaSmanicato").value.trim(),
    tagliaAntiacqua: document.getElementById("fTagliaAntiacqua").value.trim(),
    tagliaMagliaInvernale: document.getElementById("fTagliaMagliaInvernale").value.trim(),
    tagliaPantLunghi: document.getElementById("fTagliaPantLunghi").value.trim(),
    tagliaGiubbino: document.getElementById("fTagliaGiubbino").value.trim(),
    tagliaCalze: document.getElementById("fTagliaCalze").value.trim(),
    tagliaGuanti: document.getElementById("fTagliaGuanti").value.trim(),
    note: document.getElementById("fNote").value.trim(),
  };

  if (editingAtletaId) {
    const idx = state.anagrafica.findIndex(x => x.id === editingAtletaId);
    state.anagrafica[idx] = atleta;
  } else {
    state.anagrafica.push(atleta);
  }
  saveState();
  closeAnagraficaForm();
  renderContent();
}

function confermaEliminaAtleta(id) {
  const a = state.anagrafica.find(x => x.id === id);
  if (!a) return;
  if (confirm(`Eliminare ${a.cognome} ${a.nome} dall'anagrafica?`)) {
    state.anagrafica = state.anagrafica.filter(x => x.id !== id);
    saveState();
    renderContent();
  }
}

function eliminaAtleta() {
  if (!editingAtletaId) return;
  confermaEliminaAtleta(editingAtletaId);
  closeAnagraficaForm();
}

/* ===================== SEZIONE QUOTA ===================== */
function nomeAtleta(id) {
  const a = state.anagrafica.find(x => x.id === id);
  return a ? `${a.cognome} ${a.nome}` : "";
}

function getPagamento(atletaId, anno) {
  return state.quotaPagamenti.find(p => p.atletaId === atletaId && p.anno === anno);
}

function renderQuotaSection(content) {
  const anniOptions = [];
  for (let y = 2020; y <= 2035; y++) anniOptions.push(y);

  const atletiOrdinati = [...state.anagrafica].sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome));

  const pagatiIds = new Set(
    state.quotaPagamenti.filter(p => p.anno === quotaAnnoSel && p.pagato).map(p => p.atletaId)
  );
  const nonPagati = atletiOrdinati.filter(a => !pagatiIds.has(a.id));

  const pagamentoEsistente = quotaAtletaSel ? getPagamento(quotaAtletaSel, quotaAnnoSel) : null;

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Quota</div>

    <div class="field-group">
      <label>Anno</label>
      <select id="quotaAnnoSelect">
        ${anniOptions.map(y => `<option value="${y}" ${y === quotaAnnoSel ? "selected" : ""}>${y}</option>`).join("")}
      </select>
    </div>

    <div class="quota-card">
      <div class="quota-card-title">Registra pagamento — ${quotaAnnoSel}</div>

      <div class="field-group">
        <label>Ciclista</label>
        <select id="quotaAtletaSelect">
          <option value="">-- seleziona --</option>
          ${atletiOrdinati.map(a => `<option value="${a.id}" ${a.id === quotaAtletaSel ? "selected" : ""}>${a.cognome} ${a.nome}</option>`).join("")}
        </select>
      </div>

      <div class="field-row" style="align-items:flex-end;">
        <div class="field-group">
          <label>Data pagamento</label>
          <input type="text" id="quotaData" placeholder="gg/mm/aaaa" value="${pagamentoEsistente ? (pagamentoEsistente.dataPagamento || "") : ""}">
        </div>
        <div class="field-group" style="flex:0 0 30%;">
          <label>Importo (€)</label>
          <input type="number" id="quotaImporto" value="${pagamentoEsistente ? (pagamentoEsistente.importo ?? "") : (state.settings.quota ?? "")}">
        </div>
        <div class="checkbox-row" style="flex:0 0 auto;margin-bottom:10px;">
          <input type="checkbox" id="quotaPagato" ${pagamentoEsistente && pagamentoEsistente.pagato ? "checked" : ""}>
          <label for="quotaPagato" style="margin:0;">Pagato</label>
        </div>
      </div>

      <div class="quota-tipo-block">
        <div class="checkbox-row">
          <input type="checkbox" id="quotaTipoTessera" ${pagamentoEsistente && pagamentoEsistente.tipoSoloTessera ? "checked" : ""}>
          <label for="quotaTipoTessera" style="margin:0;">Solo tessera atleta</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="quotaTipoCicloamatore" ${pagamentoEsistente && pagamentoEsistente.tipoCicloamatore ? "checked" : ""}>
          <label for="quotaTipoCicloamatore" style="margin:0;">Solo tessera cicloamatore (no visita)</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="quotaTipoAbbigliamento" ${pagamentoEsistente && pagamentoEsistente.tipoTesseraAbbigliamento ? "checked" : ""}>
          <label for="quotaTipoAbbigliamento" style="margin:0;">Tessera + abbigliamento</label>
        </div>
      </div>

      <button class="btn btn-viola" onclick="salvaQuotaPagamento()">Salva</button>
    </div>

    <div class="quota-warn-card">
      <div class="quota-card-title">⚠️ Non pagato ${quotaAnnoSel} (${nonPagati.length}/${atletiOrdinati.length})</div>
      <div class="chip-wrap">
        ${nonPagati.length === 0
          ? `<div class="empty-state" style="padding:10px 0;">Tutti in regola per il ${quotaAnnoSel}.</div>`
          : nonPagati.map(a => `<span class="nome-chip" onclick="selezionaAtletaQuota('${a.id}')">${a.cognome} ${a.nome}</span>`).join("")}
      </div>
    </div>
  `;

  document.getElementById("quotaAnnoSelect").addEventListener("change", (e) => {
    quotaAnnoSel = parseInt(e.target.value);
    renderContent();
  });
  document.getElementById("quotaAtletaSelect").addEventListener("change", (e) => {
    quotaAtletaSel = e.target.value;
    renderContent();
  });
}

function selezionaAtletaQuota(atletaId) {
  quotaAtletaSel = atletaId;
  renderContent();
}

function salvaQuotaPagamento() {
  if (!quotaAtletaSel) {
    alert("Seleziona un ciclista.");
    return;
  }
  const nomeSalvato = nomeAtleta(quotaAtletaSel);
  const dataPagamento = document.getElementById("quotaData").value.trim();
  const importoRaw = document.getElementById("quotaImporto").value;
  const importo = importoRaw !== "" ? parseFloat(importoRaw) : null;
  const pagato = document.getElementById("quotaPagato").checked;
  const tipoSoloTessera = document.getElementById("quotaTipoTessera").checked;
  const tipoCicloamatore = document.getElementById("quotaTipoCicloamatore").checked;
  const tipoTesseraAbbigliamento = document.getElementById("quotaTipoAbbigliamento").checked;

  const idx = state.quotaPagamenti.findIndex(p => p.atletaId === quotaAtletaSel && p.anno === quotaAnnoSel);
  const record = {
    atletaId: quotaAtletaSel, anno: quotaAnnoSel, dataPagamento, importo, pagato,
    tipoSoloTessera, tipoCicloamatore, tipoTesseraAbbigliamento
  };
  if (idx >= 0) {
    state.quotaPagamenti[idx] = record;
  } else {
    state.quotaPagamenti.push(record);
  }
  saveState();
  quotaAtletaSel = "";
  renderContent();
  alert(`✅ Pagamento ${quotaAnnoSel} registrato per ${nomeSalvato}.`);
}

/* ===================== SEZIONE ABBIGLIAMENTO ===================== */
const CAPI_ABBIGLIAMENTO = [
  { key: "tagliaMagliaEstiva", label: "Maglia estiva" },
  { key: "tagliaPantEstivo", label: "Pantaloncino estivo" },
  { key: "tagliaSmanicato", label: "Smanicato" },
  { key: "tagliaAntiacqua", label: "Antiacqua" },
  { key: "tagliaMagliaInvernale", label: "Maglia manica lunga" },
  { key: "tagliaPantLunghi", label: "Pantalone lungo" },
  { key: "tagliaGiubbino", label: "Giubbino" },
  { key: "tagliaCalze", label: "Calze" },
  { key: "tagliaGuanti", label: "Guanti" },
];

function ordinaTaglie(a, b) {
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

function renderAbbigliamentoSection(content) {
  const anniOptions = [];
  for (let y = 2020; y <= 2035; y++) anniOptions.push(y);

  const idAventiDiritto = new Set(
    state.quotaPagamenti.filter(p => p.anno === abbigliamentoAnnoSel && p.tipoTesseraAbbigliamento).map(p => p.atletaId)
  );
  const atletiConteggiati = state.anagrafica.filter(a => idAventiDiritto.has(a.id));

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Abbigliamento</div>

    <div class="field-group">
      <label>Anno</label>
      <select id="abbigliamentoAnnoSelect">
        ${anniOptions.map(y => `<option value="${y}" ${y === abbigliamentoAnnoSel ? "selected" : ""}>${y}</option>`).join("")}
      </select>
    </div>

    <p class="small-note" style="margin-bottom:16px;">
      Conteggio basato sugli atleti che nel ${abbigliamentoAnnoSel} hanno pagato la quota con
      <b>"Tessera + abbigliamento"</b> — atleti considerati: <b>${atletiConteggiati.length}</b>
    </p>

    <div id="abbigliamentoTotali"></div>
  `;

  document.getElementById("abbigliamentoAnnoSelect").addEventListener("change", (e) => {
    abbigliamentoAnnoSel = parseInt(e.target.value);
    renderContent();
  });

  const totaliEl = document.getElementById("abbigliamentoTotali");

  if (atletiConteggiati.length === 0) {
    totaliEl.innerHTML = `<div class="empty-state">Nessun atleta ha ancora pagato la quota con "Tessera + abbigliamento" per il ${abbigliamentoAnnoSel}.</div>`;
    return;
  }

  totaliEl.innerHTML = CAPI_ABBIGLIAMENTO.map(capo => {
    const conteggi = {};
    atletiConteggiati.forEach(a => {
      const taglia = (a[capo.key] || "").trim();
      if (!taglia) return;
      conteggi[taglia] = (conteggi[taglia] || 0) + 1;
    });
    const taglie = Object.keys(conteggi).sort(ordinaTaglie);
    const totaleCapo = taglie.reduce((s, t) => s + conteggi[t], 0);

    return `
      <div class="quota-card" style="border-left-color:var(--c3);">
        <div class="quota-card-title" style="display:flex;justify-content:space-between;">
          <span>${capo.label}</span>
          <span style="color:#888;font-weight:500;">${totaleCapo} pz</span>
        </div>
        ${taglie.length === 0
          ? `<div class="small-note">Nessuna taglia inserita per questo capo.</div>`
          : `<div class="chip-wrap">${taglie.map(t => `<span class="nome-chip" style="cursor:default;">${t}: ${conteggi[t]}</span>`).join("")}</div>`}
      </div>
    `;
  }).join("");
}

function renderStoricoQuote(atletaId) {
  const storico = state.quotaPagamenti
    .filter(p => p.atletaId === atletaId)
    .sort((a, b) => b.anno - a.anno);

  const blockEl = document.getElementById("storicoQuoteBlock");
  const tabellaEl = document.getElementById("storicoQuoteTabella");

  if (storico.length === 0) {
    blockEl.style.display = "block";
    tabellaEl.innerHTML = `<div class="empty-state" style="padding:14px 0;">Nessuna quota registrata per questo atleta.</div>`;
    return;
  }

  blockEl.style.display = "block";
  tabellaEl.innerHTML = `
    <table class="storico-table">
      <thead>
        <tr><th>Anno</th><th>Pagato</th><th>Importo</th><th>Data</th></tr>
      </thead>
      <tbody>
        ${storico.map(p => `
          <tr>
            <td>${p.anno}</td>
            <td>${p.pagato ? "✅" : "❌"}</td>
            <td>${p.importo != null ? p.importo + " €" : "-"}</td>
            <td>${p.dataPagamento || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}


/* ===================== SEZIONE CIRCUITI ===================== */
function renderCircuitiSection(content) {
  const circuitiOrdinati = [...state.circuiti].sort((a, b) => a.nome.localeCompare(b.nome));

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Circuiti</div>
    <div class="list-toolbar">
      <input type="text" id="nuovoCircuitoNome" placeholder="Nome nuovo circuito...">
      <button class="fab-add" onclick="aggiungiCircuito()">+</button>
    </div>
    <div id="listaCircuiti"></div>
  `;

  const listaEl = document.getElementById("listaCircuiti");
  if (circuitiOrdinati.length === 0) {
    listaEl.innerHTML = `<div class="empty-state">Nessun circuito inserito.</div>`;
    return;
  }
  listaEl.innerHTML = circuitiOrdinati.map(c => `
    <div class="persona-card">
      <div class="persona-card-top">
        <div class="persona-info-col">
          <div class="persona-nome">${c.nome}</div>
        </div>
        <div class="persona-actions">
          <button onclick="eliminaCircuito('${c.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");

  document.getElementById("nuovoCircuitoNome").addEventListener("keydown", (e) => {
    if (e.key === "Enter") aggiungiCircuito();
  });
}

function aggiungiCircuito() {
  const inp = document.getElementById("nuovoCircuitoNome");
  const nome = inp.value.trim();
  if (!nome) return;
  state.circuiti.push({ id: uid(), nome });
  saveState();
  renderContent();
}

function eliminaCircuito(id) {
  const c = state.circuiti.find(x => x.id === id);
  if (!c) return;
  if (confirm(`Eliminare il circuito "${c.nome}"?`)) {
    state.circuiti = state.circuiti.filter(x => x.id !== id);
    saveState();
    renderContent();
  }
}

/* ===================== SEZIONE GARE ===================== */
function renderGareSection(content) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const conData = state.gare.map(g => ({ g, d: parseDataIT(g.data) }));
  const future = conData.filter(x => !x.d || x.d >= oggi);
  const passate = conData.filter(x => x.d && x.d < oggi);

  future.sort((a, b) => {
    if (a.d && b.d && +a.d !== +b.d) return a.d - b.d;
    return a.g.nome.localeCompare(b.g.nome);
  });
  passate.sort((a, b) => b.d - a.d);

  const ordinate = [...future, ...passate].map(x => x.g);

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Gare</div>
    <div class="list-toolbar">
      <div style="flex:1;"></div>
      <button class="fab-add" onclick="apriNuovaGara()">+</button>
    </div>
    <div id="listaGare"></div>
  `;

  const listaEl = document.getElementById("listaGare");
  if (ordinate.length === 0) {
    listaEl.innerHTML = `<div class="empty-state">Nessuna gara inserita.<br>Tocca + per aggiungerne una.</div>`;
    return;
  }

  listaEl.innerHTML = ordinate.map(g => {
    const scaduta = g.data && isScaduta(g.data);
    return `
      <div class="persona-card${scaduta ? " gara-passata" : ""}">
        <div class="persona-card-top">
          <div class="persona-info-col">
            <div class="persona-nome">${g.nome}</div>
            <div class="persona-sub">${[g.data, g.luogo].filter(Boolean).join(" · ")}</div>
          </div>
          <div class="persona-actions">
            <button onclick="apriModificaGara('${g.id}')">✏️</button>
            <button onclick="eliminaGara('${g.id}')">🗑️</button>
          </div>
        </div>
        ${g.circuito ? `<div class="persona-badges"><span class="nome-chip" style="cursor:default;">🗺️ ${g.circuito}</span></div>` : ""}
      </div>
    `;
  }).join("");
}

function popolaCircuitiSelect(selected) {
  const sel = document.getElementById("fGaraCircuito");
  const circuitiOrdinati = [...state.circuiti].sort((a, b) => a.nome.localeCompare(b.nome));
  sel.innerHTML = `<option value="">-- nessuno --</option>` + circuitiOrdinati.map(c => `<option value="${c.nome}" ${c.nome === selected ? "selected" : ""}>${c.nome}</option>`).join("");
}

function apriNuovaGara() {
  editingGaraId = null;
  document.getElementById("garaFormTitle").textContent = "Nuova Gara";
  document.getElementById("eliminaGaraRow").style.display = "none";
  ["fGaraNome", "fGaraData", "fGaraLuogo", "fGaraDescrizione"].forEach(id => document.getElementById(id).value = "");
  popolaCircuitiSelect("");
  document.getElementById("garaOverlay").classList.add("open");
}

function apriModificaGara(id) {
  const g = state.gare.find(x => x.id === id);
  if (!g) return;
  editingGaraId = id;
  document.getElementById("garaFormTitle").textContent = "Modifica Gara";
  document.getElementById("eliminaGaraRow").style.display = "block";
  document.getElementById("fGaraNome").value = g.nome || "";
  document.getElementById("fGaraData").value = g.data || "";
  document.getElementById("fGaraLuogo").value = g.luogo || "";
  document.getElementById("fGaraDescrizione").value = g.descrizione || "";
  popolaCircuitiSelect(g.circuito || "");
  document.getElementById("garaOverlay").classList.add("open");
}

function closeGaraForm() {
  document.getElementById("garaOverlay").classList.remove("open");
}

function salvaGara() {
  const nome = document.getElementById("fGaraNome").value.trim();
  if (!nome) {
    alert("Il nome della gara è obbligatorio.");
    return;
  }
  const gara = {
    id: editingGaraId || uid(),
    nome,
    data: document.getElementById("fGaraData").value.trim(),
    luogo: document.getElementById("fGaraLuogo").value.trim(),
    descrizione: document.getElementById("fGaraDescrizione").value.trim(),
    circuito: document.getElementById("fGaraCircuito").value,
  };
  if (editingGaraId) {
    const idx = state.gare.findIndex(x => x.id === editingGaraId);
    state.gare[idx] = gara;
  } else {
    state.gare.push(gara);
  }
  saveState();
  closeGaraForm();
  renderContent();
}

function eliminaGara(id) {
  const g = state.gare.find(x => x.id === id);
  if (!g) return;
  if (confirm(`Eliminare la gara "${g.nome}"?`)) {
    state.gare = state.gare.filter(x => x.id !== id);
    saveState();
    if (editingGaraId === id) closeGaraForm();
    renderContent();
  }
}

function eliminaGaraCorrente() {
  if (!editingGaraId) return;
  eliminaGara(editingGaraId);
}

/* ===================== SEZIONE SPONSOR ===================== */
function renderSponsorSection(content) {
  const sponsorOrdinati = [...state.sponsor].sort((a, b) => a.nomeSocieta.localeCompare(b.nomeSocieta));

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Sponsor</div>
    <div class="list-toolbar">
      <div style="flex:1;"></div>
      <button class="fab-add" onclick="apriNuovoSponsor()">+</button>
    </div>
    <div id="listaSponsor"></div>
  `;

  const listaEl = document.getElementById("listaSponsor");
  if (sponsorOrdinati.length === 0) {
    listaEl.innerHTML = `<div class="empty-state">Nessuno sponsor inserito.<br>Tocca + per aggiungerne uno.</div>`;
    return;
  }

  listaEl.innerHTML = sponsorOrdinati.map(s => {
    const luogo = [s.paese, s.provincia].filter(Boolean).join(" (") + (s.provincia ? ")" : "");
    return `
      <div class="persona-card">
        <div class="persona-card-top">
          <div class="persona-info-col">
            <div class="persona-nome">${s.nomeSocieta}</div>
            <div class="persona-sub">${[s.personaRiferimento, luogo].filter(Boolean).join(" · ")}</div>
            ${s.email ? `<div class="persona-sub">${s.email}</div>` : ""}
          </div>
          <div class="persona-actions">
            <button onclick="apriModificaSponsor('${s.id}')">✏️</button>
            <button onclick="eliminaSponsor('${s.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function apriNuovoSponsor() {
  editingSponsorId = null;
  document.getElementById("sponsorFormTitle").textContent = "Nuovo Sponsor";
  document.getElementById("eliminaSponsorRow").style.display = "none";
  ["fSponsorNome", "fSponsorIndirizzo", "fSponsorPaese", "fSponsorProvincia", "fSponsorCap", "fSponsorReferente", "fSponsorEmail", "fSponsorNote"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("sponsorOverlay").classList.add("open");
}

function apriModificaSponsor(id) {
  const s = state.sponsor.find(x => x.id === id);
  if (!s) return;
  editingSponsorId = id;
  document.getElementById("sponsorFormTitle").textContent = "Modifica Sponsor";
  document.getElementById("eliminaSponsorRow").style.display = "block";
  document.getElementById("fSponsorNome").value = s.nomeSocieta || "";
  document.getElementById("fSponsorIndirizzo").value = s.indirizzo || "";
  document.getElementById("fSponsorPaese").value = s.paese || "";
  document.getElementById("fSponsorProvincia").value = s.provincia || "";
  document.getElementById("fSponsorCap").value = s.cap || "";
  document.getElementById("fSponsorReferente").value = s.personaRiferimento || "";
  document.getElementById("fSponsorEmail").value = s.email || "";
  document.getElementById("fSponsorNote").value = s.note || "";
  document.getElementById("sponsorOverlay").classList.add("open");
}

function closeSponsorForm() {
  document.getElementById("sponsorOverlay").classList.remove("open");
}

function salvaSponsor() {
  const nomeSocieta = document.getElementById("fSponsorNome").value.trim();
  if (!nomeSocieta) {
    alert("Il nome società è obbligatorio.");
    return;
  }
  const sponsor = {
    id: editingSponsorId || uid(),
    nomeSocieta,
    indirizzo: document.getElementById("fSponsorIndirizzo").value.trim(),
    paese: document.getElementById("fSponsorPaese").value.trim(),
    provincia: document.getElementById("fSponsorProvincia").value.trim().toUpperCase(),
    cap: document.getElementById("fSponsorCap").value.trim(),
    personaRiferimento: document.getElementById("fSponsorReferente").value.trim(),
    email: document.getElementById("fSponsorEmail").value.trim(),
    note: document.getElementById("fSponsorNote").value.trim(),
  };
  if (editingSponsorId) {
    const idx = state.sponsor.findIndex(x => x.id === editingSponsorId);
    state.sponsor[idx] = sponsor;
  } else {
    state.sponsor.push(sponsor);
  }
  saveState();
  closeSponsorForm();
  renderContent();
}

function eliminaSponsor(id) {
  const s = state.sponsor.find(x => x.id === id);
  if (!s) return;
  if (confirm(`Eliminare lo sponsor "${s.nomeSocieta}"?`)) {
    state.sponsor = state.sponsor.filter(x => x.id !== id);
    saveState();
    if (editingSponsorId === id) closeSponsorForm();
    renderContent();
  }
}

function eliminaSponsorCorrente() {
  if (!editingSponsorId) return;
  eliminaSponsor(editingSponsorId);
}

/* ===================== SEZIONE USCITE GRUPPO ===================== */
const GIORNI_SETTIMANA = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI_ITALIANI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function formattaDataUscita(isoDate) {
  if (!isoDate) return "";
  const parti = isoDate.split("-");
  if (parti.length !== 3) return isoDate;
  const d = new Date(parseInt(parti[0]), parseInt(parti[1]) - 1, parseInt(parti[2]));
  const giorno = GIORNI_SETTIMANA[d.getDay()];
  const gg = String(d.getDate()).padStart(2, "0");
  const mese = MESI_ITALIANI[d.getMonth()];
  return `${giorno} ${gg}-${mese}-${d.getFullYear()}`;
}

function renderUsciteSection(content) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  let uscite = state.uscite.filter(u => {
    if (usciteVistaTutte) return true;
    if (!u.data) return true;
    const d = new Date(u.data + "T00:00:00");
    return d >= oggi;
  });

  uscite = uscite.sort((a, b) => {
    if (a.data && b.data && a.data !== b.data) return a.data.localeCompare(b.data);
    return (a.ora || "").localeCompare(b.ora || "");
  });

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Uscite gruppo</div>
    <div class="list-toolbar">
      <button class="btn btn-outline" style="width:auto;flex:1;font-size:13px;padding:10px 12px;" onclick="creaUsciteAnno()">📅 Crea uscite</button>
      <button class="btn btn-outline" style="width:auto;flex:0 0 auto;font-size:13px;padding:10px 12px;" onclick="toggleVistaUscite()">${usciteVistaTutte ? "📅 Solo prossime" : "🕓 Vedi tutte"}</button>
      <button class="fab-add" onclick="apriNuovaUscita()">+</button>
    </div>
    <div id="listaUscite"></div>
  `;

  const listaEl = document.getElementById("listaUscite");
  if (uscite.length === 0) {
    listaEl.innerHTML = `<div class="empty-state">Nessuna uscita ${usciteVistaTutte ? "presente" : "in programma"}.<br>Tocca + per aggiungerne una.</div>`;
    return;
  }

  listaEl.innerHTML = uscite.map(u => {
    const passata = u.data && new Date(u.data + "T00:00:00") < oggi;
    return `
    <div class="persona-card${passata ? " gara-passata" : ""}">
      <div class="persona-card-top">
        <div class="persona-info-col">
          <div class="persona-nome">${u.titolo}</div>
          <div class="persona-sub">${formattaDataUscita(u.data)}${u.ora ? " · " + u.ora : ""}${u.km ? " · ~" + u.km + " km" : ""}</div>
          ${u.descrizione ? `<div class="persona-sub" style="margin-top:6px;color:#555;">${u.descrizione}</div>` : ""}
        </div>
        <div class="persona-actions">
          <button onclick="apriModificaUscita('${u.id}')">✏️</button>
          <button onclick="eliminaUscita('${u.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `;
  }).join("");
}

/* ===================== SEZIONE PRESENZE USCITE ===================== */
let presenzeUscitaSel = "";

function selezionaUscitaPresenze(id) {
  presenzeUscitaSel = id;
  render();
}

function togglePresenza(atletaId) {
  const u = state.uscite.find(x => x.id === presenzeUscitaSel);
  if (!u) return;
  if (!u.presenti) u.presenti = [];
  const idx = u.presenti.indexOf(atletaId);
  if (idx >= 0) {
    u.presenti.splice(idx, 1);
  } else {
    u.presenti.push(atletaId);
  }
  saveState();
  render();
}

function renderPresenzeSection(content) {
  const uscite = [...state.uscite].sort((a, b) => {
    if (a.data && b.data && a.data !== b.data) return b.data.localeCompare(a.data);
    return (b.ora || "").localeCompare(a.ora || "");
  });

  if (presenzeUscitaSel && !uscite.find(u => u.id === presenzeUscitaSel)) {
    presenzeUscitaSel = "";
  }

  const atletiOrdinati = [...state.anagrafica].sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome));
  const uscitaSel = presenzeUscitaSel ? state.uscite.find(u => u.id === presenzeUscitaSel) : null;
  const presentiSel = new Set(uscitaSel ? (uscitaSel.presenti || []) : []);

  // classifica presenze su tutte le uscite
  const conteggio = {};
  state.uscite.forEach(u => (u.presenti || []).forEach(id => {
    conteggio[id] = (conteggio[id] || 0) + 1;
  }));
  const classifica = atletiOrdinati
    .map(a => ({ atleta: a, count: conteggio[a.id] || 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count || (a.atleta.cognome + a.atleta.nome).localeCompare(b.atleta.cognome + b.atleta.nome));

  content.innerHTML = `
    <div class="section-title"><span class="dot"></span>Presenze uscite</div>

    <div class="field-group">
      <label>Seleziona uscita</label>
      <select id="presenzeUscitaSelect" onchange="selezionaUscitaPresenze(this.value)">
        <option value="">-- seleziona --</option>
        ${uscite.map(u => `<option value="${u.id}" ${u.id === presenzeUscitaSel ? "selected" : ""}>${formattaDataUscita(u.data)}${u.ora ? " " + u.ora : ""} — ${u.titolo}</option>`).join("")}
      </select>
    </div>

    ${!uscitaSel ? `
      <div class="empty-state">Seleziona un'uscita per segnare i presenti.</div>
    ` : atletiOrdinati.length === 0 ? `
      <div class="empty-state">Nessun ciclista in anagrafica.</div>
    ` : `
      <div class="quota-card">
        <div class="quota-card-title">Presenti — ${uscitaSel.titolo}</div>
        ${atletiOrdinati.map(a => `
          <div class="checkbox-row">
            <input type="checkbox" id="presAtleta_${a.id}" ${presentiSel.has(a.id) ? "checked" : ""} onchange="togglePresenza('${a.id}')">
            <label for="presAtleta_${a.id}" style="cursor:pointer;flex:1;">${a.cognome} ${a.nome}</label>
          </div>
        `).join("")}
        <div class="small-note">${presentiSel.size} presenti su ${atletiOrdinati.length}</div>
      </div>
    `}

    <div class="section-title" style="margin-top:22px;"><span class="dot"></span>Classifica presenze</div>
    ${classifica.length === 0 ? `
      <div class="empty-state">Nessuna presenza registrata finora.</div>
    ` : `
      <div class="quota-card">
        ${classifica.map((r, i) => `
          <div class="persona-card-top" style="padding:8px 0;${i < classifica.length - 1 ? "border-bottom:1px solid var(--grigio-bordo);" : ""}">
            <div class="persona-info-col">
              <div class="persona-nome">${i + 1}. ${r.atleta.cognome} ${r.atleta.nome}</div>
            </div>
            <div class="badge">${r.count}</div>
          </div>
        `).join("")}
      </div>
    `}
  `;
}

function popolaOraUscitaSelect(selected) {
  const sel = document.getElementById("fUscitaOra");
  let opts = `<option value="">-</option>`;
  for (let h = 0; h < 24; h++) {
    ["00", "30"].forEach(m => {
      const val = String(h).padStart(2, "0") + ":" + m;
      opts += `<option value="${val}" ${val === selected ? "selected" : ""}>${val}</option>`;
    });
  }
  sel.innerHTML = opts;
}

function apriNuovaUscita() {
  editingUscitaId = null;
  document.getElementById("uscitaFormTitle").textContent = "Nuova Uscita";
  document.getElementById("eliminaUscitaRow").style.display = "none";
  ["fUscitaData", "fUscitaTitolo", "fUscitaDescrizione", "fUscitaKm"].forEach(id => document.getElementById(id).value = "");
  popolaOraUscitaSelect("");
  document.getElementById("uscitaOverlay").classList.add("open");
}

function apriModificaUscita(id) {
  const u = state.uscite.find(x => x.id === id);
  if (!u) return;
  editingUscitaId = id;
  document.getElementById("uscitaFormTitle").textContent = "Modifica Uscita";
  document.getElementById("eliminaUscitaRow").style.display = "block";
  document.getElementById("fUscitaData").value = u.data || "";
  popolaOraUscitaSelect(u.ora || "");
  document.getElementById("fUscitaTitolo").value = u.titolo || "";
  document.getElementById("fUscitaKm").value = u.km || "";
  document.getElementById("fUscitaDescrizione").value = u.descrizione || "";
  document.getElementById("uscitaOverlay").classList.add("open");
}

function closeUscitaForm() {
  document.getElementById("uscitaOverlay").classList.remove("open");
}

function salvaUscita() {
  const titolo = document.getElementById("fUscitaTitolo").value.trim();
  if (!titolo) {
    alert("Il titolo dell'uscita è obbligatorio.");
    return;
  }
  const uscita = {
    id: editingUscitaId || uid(),
    data: document.getElementById("fUscitaData").value,
    ora: document.getElementById("fUscitaOra").value,
    titolo,
    km: document.getElementById("fUscitaKm").value ? Number(document.getElementById("fUscitaKm").value) : null,
    descrizione: document.getElementById("fUscitaDescrizione").value.trim(),
  };
  if (editingUscitaId) {
    const idx = state.uscite.findIndex(x => x.id === editingUscitaId);
    state.uscite[idx] = uscita;
  } else {
    state.uscite.push(uscita);
  }
  saveState();
  closeUscitaForm();
  renderContent();
}

function eliminaUscita(id) {
  const u = state.uscite.find(x => x.id === id);
  if (!u) return;
  if (confirm(`Eliminare l'uscita "${u.titolo}"?`)) {
    state.uscite = state.uscite.filter(x => x.id !== id);
    saveState();
    if (editingUscitaId === id) closeUscitaForm();
    renderContent();
  }
}

function eliminaUscitaCorrente() {
  if (!editingUscitaId) return;
  eliminaUscita(editingUscitaId);
}

function toggleVistaUscite() {
  usciteVistaTutte = !usciteVistaTutte;
  renderContent();
}

function isoLocale(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function nEsimoSabatoDelMese(anno, mese, n) {
  const sabati = [];
  const d = new Date(anno, mese, 1);
  while (d.getMonth() === mese) {
    if (d.getDay() === 6) sabati.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  if (sabati.length === 0) return null;
  const idx = Math.min(n, sabati.length) - 1;
  return sabati[idx];
}

let bozzeUscite = [];
let bozzeUsciteAnno = null;

function creaUsciteAnno() {
  const annoDefault = new Date().getFullYear();
  const risposta = window.prompt("Per quale anno vuoi generare le uscite (basate sullo stesso calendario dell'anno precedente)?", annoDefault);
  if (!risposta) return;
  const targetYear = parseInt(risposta);
  if (isNaN(targetYear)) {
    alert("Anno non valido.");
    return;
  }
  const sourceYear = targetYear - 1;
  const sourceUscite = state.uscite.filter(u => u.data && new Date(u.data + "T00:00:00").getFullYear() === sourceYear);

  if (sourceUscite.length === 0) {
    alert(`Nessuna uscita trovata per l'anno ${sourceYear} da cui ripartire.`);
    return;
  }

  bozzeUsciteAnno = targetYear;
  bozzeUscite = sourceUscite.map(u => {
    const d = new Date(u.data + "T00:00:00");
    const settimanaDelMese = Math.ceil(d.getDate() / 7);
    const nuovaData = nEsimoSabatoDelMese(targetYear, d.getMonth(), settimanaDelMese);
    return {
      data: nuovaData ? isoLocale(nuovaData) : "",
      ora: u.ora || "",
      titolo: u.titolo,
      descrizione: u.descrizione || "",
    };
  });

  renderAnteprimaUscite();
  document.getElementById("anteprimaUsciteOverlay").classList.add("open");
}

function renderAnteprimaUscite() {
  document.getElementById("anteprimaUsciteTitle").textContent = `Anteprima uscite ${bozzeUsciteAnno}`;
  const body = document.getElementById("anteprimaUsciteBody");

  if (bozzeUscite.length === 0) {
    body.innerHTML = `<div class="empty-state">Nessuna bozza rimasta.<br>Chiudi e riprova, oppure conferma per non creare nulla.</div>`;
    return;
  }

  body.innerHTML = `<p class="small-note" style="margin-bottom:14px;">Controlla e correggi le date/orari proposti prima di confermare. Puoi anche rimuovere singole uscite dalla bozza.</p>` +
    bozzeUscite.map((b, idx) => `
      <div class="persona-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="font-size:13px;">Uscita ${idx + 1}${b.data ? " · " + formattaDataUscita(b.data) : ""}</strong>
          <button onclick="rimuoviBozzaUscita(${idx})" style="background:var(--grigio);border:none;border-radius:8px;width:28px;height:28px;font-size:13px;cursor:pointer;">🗑️</button>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label>Data</label>
            <input type="date" value="${b.data}" oninput="aggiornaBozzaUscita(${idx}, 'data', this.value)">
          </div>
          <div class="field-group" style="flex:0 0 30%;">
            <label>Ora</label>
            <input type="text" value="${b.ora}" placeholder="hh:mm" oninput="aggiornaBozzaUscita(${idx}, 'ora', this.value)">
          </div>
        </div>
        <div class="field-group">
          <label>Titolo uscita</label>
          <input type="text" value="${b.titolo}" oninput="aggiornaBozzaUscita(${idx}, 'titolo', this.value)">
        </div>
        <div class="field-group" style="margin-bottom:0;">
          <label>Descrizione</label>
          <textarea rows="2" style="width:100%;padding:9px 10px;border:1.5px solid var(--grigio-bordo);border-radius:10px;font-size:13.5px;font-family:inherit;resize:vertical;" oninput="aggiornaBozzaUscita(${idx}, 'descrizione', this.value)">${b.descrizione}</textarea>
        </div>
      </div>
    `).join("");
}

function aggiornaBozzaUscita(idx, campo, valore) {
  if (!bozzeUscite[idx]) return;
  bozzeUscite[idx][campo] = valore;
  if (campo === "data") renderAnteprimaUscite();
}

function rimuoviBozzaUscita(idx) {
  bozzeUscite.splice(idx, 1);
  renderAnteprimaUscite();
}

function chiudiAnteprimaUscite() {
  document.getElementById("anteprimaUsciteOverlay").classList.remove("open");
  bozzeUscite = [];
  bozzeUsciteAnno = null;
}

function confermaCreaUscite() {
  if (bozzeUscite.length === 0) {
    alert("Nessuna uscita da creare.");
    return;
  }
  let create = 0;
  bozzeUscite.forEach(b => {
    if (!b.titolo || !b.titolo.trim()) return;
    state.uscite.push({
      id: uid(),
      data: b.data,
      ora: b.ora,
      titolo: b.titolo.trim(),
      descrizione: (b.descrizione || "").trim(),
    });
    create++;
  });
  const anno = bozzeUsciteAnno;
  saveState();
  chiudiAnteprimaUscite();
  renderContent();
  alert(`Create ${create} uscite per il ${anno}.`);
}

/* ===================== SETUP / IMPOSTAZIONI ===================== */
function openSetup() {
  document.getElementById("inpTeamName").value = state.settings.teamName || "";
  document.getElementById("inpColor1").value = state.settings.color1 || "#111111";
  document.getElementById("inpColor2").value = state.settings.color2 || "#ffffff";
  document.getElementById("inpColor3").value = state.settings.color3 || "#7b2ff7";
  const prev = document.getElementById("setupLogoPreview");
  if (state.settings.logo) {
    prev.innerHTML = `<img src="${state.settings.logo}">`;
  } else {
    prev.textContent = "Nessuno";
  }
  document.getElementById("appVersionLabel").textContent = APP_VERSION;
  document.getElementById("setupNicknameLabel").textContent = getNickname() || "-";
  renderListaUtentiAbilitati();
  document.getElementById("setupOverlay").classList.add("open");
}

function closeSetup() {
  document.getElementById("setupOverlay").classList.remove("open");
}

document.getElementById("inpLogo").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    document.getElementById("setupLogoPreview").innerHTML = `<img src="${ev.target.result}">`;
    state.settings.logo = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function salvaImpostazioni() {
  state.settings.teamName = document.getElementById("inpTeamName").value.trim() || "Nome Squadra";
  state.settings.color1 = document.getElementById("inpColor1").value;
  state.settings.color2 = document.getElementById("inpColor2").value;
  state.settings.color3 = document.getElementById("inpColor3").value;
  saveState();
  applicaColori();
  renderTopbar();
  closeSetup();
}

function importaAnagrafica() {
  alert("Importazione anagrafica da Excel: la colleghiamo quando servirà importare un file reale con i dati degli atleti.");
}

function fareBackup() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const oggi = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_gestione_ciclismo_${oggi}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importaBackup() {
  const inp = document.getElementById("inpBackupFile");
  inp.value = "";
  inp.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const imported = JSON.parse(ev.target.result);
        state = normalizzaStato(imported);
        saveState();
        render();
        alert("Backup importato correttamente.");
      } catch (err) {
        alert("File di backup non valido.");
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* ===================== AVVIO ===================== */
let nuovoWorkerInAttesa = null;

function mostraBannerAggiornamento(worker) {
  nuovoWorkerInAttesa = worker;
  document.getElementById("updateBanner").classList.add("show");
}

function applicaAggiornamento() {
  if (!nuovoWorkerInAttesa) return;
  nuovoWorkerInAttesa.postMessage("SKIP_WAITING");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // caso 1: un aggiornamento era già pronto e in attesa prima ancora di aprire l'app
      if (reg.waiting) {
        mostraBannerAggiornamento(reg.waiting);
      }
      // caso 2: un nuovo service worker viene scaricato mentre l'app è aperta
      reg.addEventListener("updatefound", () => {
        const nuovoWorker = reg.installing;
        if (!nuovoWorker) return;
        nuovoWorker.addEventListener("statechange", () => {
          if (nuovoWorker.state === "installed" && navigator.serviceWorker.controller) {
            mostraBannerAggiornamento(nuovoWorker);
          }
        });
      });
    }).catch(() => {});

    // quando il nuovo service worker prende il controllo, ricarica la pagina
    let ricaricaGiaFatta = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (ricaricaGiaFatta) return;
      ricaricaGiaFatta = true;
      window.location.reload();
    });
  });
}

const contentEl = document.getElementById("content");
contentEl.addEventListener("scroll", gestisciScrollNav, { passive: true });
contentEl.addEventListener("touchstart", gestisciSwipeStart, { passive: true });
contentEl.addEventListener("touchend", gestisciSwipeEnd, { passive: true });

avviaApp();
