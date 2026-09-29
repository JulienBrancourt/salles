/* ---------- Extraction (pdf.js) ---------- */
const H0X = 89.9, HOUR_W = 49.2, TEXT_INSET = 3.2; // calibrés sur la grille horaire du PDF CELCAT

async function extractRooms(pdf) {
  const rooms = new Map();
  const ensure = id => { if (!rooms.has(id)) rooms.set(id, { id, events: [] }); return rooms.get(id); };
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p), H = page.view[3];
    const tc = await page.getTextContent();
    const items = tc.items.filter(i => i.str.trim()).map(i => ({ s: i.str.trim(), x: i.transform[4], y: H - i.transform[5] }));
    const t07 = items.find(i => i.s === '07:00');
    const x07 = t07 ? t07.x - 1.9 : H0X;
    const lines = [];
    for (const it of items.sort((a, b) => a.y - b.y || a.x - b.x)) {
      const l = lines.find(l => Math.abs(l.y - it.y) < 0.6);
      l ? l.items.push(it) : lines.push({ y: it.y, items: [it] });
    }
    const labels = [], evs = [];
    for (const l of lines) {
      l.items.sort((a, b) => a.x - b.x);
      const left = l.items.filter(i => i.x < 85).map(i => i.s).join(' ');
      const m = left.match(/^CIT-(Hall\s*\w|[A-Z]-?\d{3})/);
      if (m) labels.push({ y: l.y, id: 'CIT-' + m[1].replace(/\s+/, ' ') });
      let prev = null;
      for (const it of l.items.filter(i => i.x >= 85)) {
        if (/^CIT-/.test(it.s) && !(prev && prev.s.endsWith(';'))) evs.push({ y: l.y, x: it.x });
        prev = it;
      }
    }
    labels.sort((a, b) => a.y - b.y);
    for (const ev of evs) {
      let lab = null;
      for (const L of labels) if (L.y <= ev.y + 0.5) lab = L;
      if (!lab) continue;
      const cancelled = items.some(i => i.s.includes('Annulé') && i.y > ev.y && i.y < ev.y + 22 && i.x > ev.x - 5 && i.x < ev.x + 60);
      const min = (ev.x - TEXT_INSET - x07) / HOUR_W * 60 + 420;
      ensure(lab.id).events.push({ start: Math.round(min / 15) * 15, cancelled });
    }
    labels.forEach(L => ensure(L.id));
  }
  return [...rooms.values()];
}

/* ---------- Regroupement par bâtiment ---------- */
const ORDER = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'Global'];
const REPEAT = { E: 3, F: 3, G: 3 };
const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const building = id => /^CIT-Hall/.test(id) ? null : (id.match(/^CIT-([A-Z])/) || [])[1] || null;

function buildData(rooms, skipCancelled) {
  const list = rooms.map(r => {
    const ev = r.events.filter(e => !(skipCancelled && e.cancelled));
    return { id: r.id, text: ev.length ? fmt(Math.min(...ev.map(e => e.start))) : 'aucune utilisation' };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const out = {};
  for (const b of ORDER) out[b] = b === 'Global' ? list : list.filter(r => building(r.id) === b);
  return out;
}

/* ---------- Aperçu ---------- */
function renderPreview(data) {
  const box = document.getElementById('preview'); box.innerHTML = '';
  for (const b of ORDER) {
    if (!data[b].length) continue;
    const s = document.createElement('div'); s.className = 'bat';
    const rep = REPEAT[b] ? ` (×${REPEAT[b]})` : '';
    s.innerHTML = `<h2>${b === 'Global' ? 'Global' : 'Bâtiment ' + b}${rep} – ${data[b].length} salles</h2><div class="grid"></div>`;
    const g = s.querySelector('.grid');
    for (const r of data[b]) {
      const d = document.createElement('div');
      d.innerHTML = `${r.id} : <span class="${r.text[0] === 'a' ? 'none' : ''}">${r.text}</span>`;
      g.appendChild(d);
    }
    box.appendChild(s);
  }
}

/* ---------- Génération du PDF (jsPDF) ---------- */
function makePdf(data) {
  const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  let first = true;
  const COLS = 3, LH = 5.2, TOP = 28, PER_COL = Math.floor((287 - TOP) / LH), W = 190 / COLS;
  const page = (b, n) => {
    if (!first) doc.addPage(); first = false;
    doc.setFont('helvetica', 'bold').setFontSize(16);
    doc.text(b === 'Global' ? 'Global' : 'Bâtiment ' + b + (n > 1 ? '' : ''), 10, 16);
    doc.setFontSize(9).setFont('helvetica', 'normal').text('Heure de début d\'utilisation – mercredi 30/09/2026 (sem. 40)', 10, 22);
  };
  for (const b of ORDER) {
    const rooms = data[b]; if (!rooms.length) continue;
    for (let n = 1; n <= (REPEAT[b] || 1); n++) {
      for (let i = 0; i < rooms.length; i += COLS * PER_COL) {
        page(b, n);
        rooms.slice(i, i + COLS * PER_COL).forEach((r, k) => {
          const c = Math.floor(k / PER_COL), row = k % PER_COL;
          doc.setFontSize(9).text(`${r.id} : ${r.text}`, 10 + c * W, TOP + row * LH);
        });
      }
    }
  }
  return doc;
}

/* ---------- Interface ---------- */
let rooms = null, doc = null;
const $ = id => document.getElementById(id);
(async () => { // worker chargé via blob (compatible ouverture en file://)
  const src = await (await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js')).text();
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
})().catch(() => { $('status').textContent = 'Impossible de charger pdf.js (connexion requise).'; });

function refresh() {
  if (!rooms) return;
  const data = buildData(rooms, $('skipCancelled').checked);
  renderPreview(data); doc = makePdf(data); $('dl').disabled = false;
}
async function handle(f) {
  if (!f) return;
  $('status').textContent = 'Analyse en cours…'; $('dl').disabled = true;
  try {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    rooms = await extractRooms(pdf);
    $('status').textContent = `${rooms.length} salles détectées dans « ${f.name} ».`;
    refresh();
  } catch (e) { $('status').textContent = 'Erreur : ' + e.message; }
}
$('file').onchange = e => handle(e.target.files[0]);
$('skipCancelled').onchange = refresh;
$('dl').onclick = () => doc && doc.save('heures-debut-salles.pdf');
const drop = $('drop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handle(e.dataTransfer.files[0]); };