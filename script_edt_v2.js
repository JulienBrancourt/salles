/* Mise en page : une page par bâtiment (E, F, G x3), puis Global */
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
// Un worker cross-origin est refusé par les navigateurs : on passe par un blob.
const workerReady = fetch(WORKER_URL)
  .then(r => r.blob())
  .then(b => { pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(b); })
  .catch(() => { pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL; }); // repli : mode sans worker

const T0 = 7 * 60, T1 = 22 * 60, ROWS = 10;
const ORDER = [['B',1],['C',1],['D',1],['E',3],['F',3],['G',3],['H',1],['J',1],['Global',1]];
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const bldg = code => /^CIT-Hall/.test(code) ? null : (code.match(/^CIT-([A-Z])/) || [])[1] || null;
const cmp = (a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true });

function lanes(evts) {          // chevauchements -> sous-lignes dans la salle
  const ends = [], res = [];
  [...evts].sort((a, b) => a.s - b.s || a.e - b.e).forEach(e => {
    let i = ends.findIndex(x => x <= e.s); if (i < 0) i = ends.length;
    ends[i] = e.e; res.push({ ...e, lane: i });
  });
  return { list: res, n: Math.max(1, ends.length) };
}

function roomRow(r) {
  const { list, n } = lanes(r.events);
  const ev = list.map(e => {
    const l = (e.s - T0) / (T1 - T0) * 100, w = (e.e - e.s) / (T1 - T0) * 100;
    const txt = e.lines.slice(1).map(esc).join('<br>');
    return `<div class="ev" style="left:${l}%;width:${w}%;top:${e.lane/n*100}%;height:${100/n}%;background:${e.color}" title="${esc(e.lines.join(' | '))}">${txt}</div>`;
  }).join('');
  return `<div class="row"><div class="room">${esc(r.label)}</div><div class="grid">${ev}</div></div>`;
}

function sheet(title, sub, rooms) {
  let h = '';
  for (let i = 0; i < Math.max(rooms.length, 1); i += ROWS) {
    const hrs = Array.from({ length: 15 }, (_, k) => `<span>${String(7 + k).padStart(2, '0')}:00</span>`).join('');
    h += `<section class="sheet"><div class="ttl"><b>${title}</b> – ${esc(sub)}</div>
      <div class="row head"><div class="room">Salle</div><div class="grid hours">${hrs}</div></div>
      ${rooms.slice(i, i + ROWS).map(roomRow).join('')}</section>`;
  }
  return h;
}

function render(data) {
  const all = [...data.rooms].sort(cmp);
  let html = '';
  ORDER.forEach(([b, copies]) => {
    const rooms = b === 'Global' ? all : all.filter(r => bldg(r.code) === b);
    for (let c = 1; c <= copies; c++)
      html += sheet(b === 'Global' ? 'Global' : 'Bâtiment ' + b + (copies > 1 ? ` (${c}/${copies})` : ''), data.title, rooms);
  });
  $('out').innerHTML = html;
  $('status').textContent = `${data.rooms.length} salles, ${data.rooms.reduce((a, r) => a + r.events.length, 0)} créneaux, ${$('out').children.length} pages.`;
  $('print').disabled = false;
}

$('file').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  $('status').textContent = 'Lecture du PDF…';
  try {
    await workerReady;
    render(await CelcatParser.parsePdf(pdfjsLib, new Uint8Array(await f.arrayBuffer())));
  } catch (err) { $('status').textContent = 'Erreur : ' + err.message; }
});
$('print').onclick = () => print();