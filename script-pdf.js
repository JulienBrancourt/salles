const { PDFDocument, StandardFonts, rgb } = PDFLib;
const $ = id => document.getElementById(id);
let files = [], outUrl = null;

// ---------- Coeur : pied de page + fusion ----------
async function fusionner(list, avecPied, progress) {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  const erreurs = [];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    progress(`Traitement ${i + 1}/${list.length} : ${f.name}`);
    try {
      const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      let texte = 'Fichier: ' + f.name;
      try { font.widthOfTextAtSize(texte, 10); }
      catch (e) { texte = texte.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?'); }
      for (const p of pages) {
        out.addPage(p);
        if (avecPied) {
          const { width } = p.getSize();
          p.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(1, 1, 1) });
          p.drawText(texte, { x: (width - font.widthOfTextAtSize(texte, 10)) / 2, y: 15,
                              size: 10, font, color: rgb(0, 0, 0) });
        }
      }
    } catch (e) { erreurs.push(`${f.name} : ${e.message}`); }
  }
  if (out.getPageCount() === 0) throw new Error('Aucune page exploitable.\n' + erreurs.join('\n'));
  return { bytes: await out.save(), pages: out.getPageCount(), erreurs };
}

// ---------- Interface ----------
function resetSortie() {
  if (outUrl) URL.revokeObjectURL(outUrl);
  outUrl = null; $('dl').disabled = $('print').disabled = true;
}

function render() {
  resetSortie();
  const ul = $('list'); ul.textContent = '';
  files.forEach((f, i) => {
    const li = document.createElement('li');
    const nom = document.createElement('span'); nom.textContent = f.name; li.append(nom);
    [['↑', () => i > 0 && ([files[i - 1], files[i]] = [files[i], files[i - 1]])],
     ['↓', () => i < files.length - 1 && ([files[i + 1], files[i]] = [files[i], files[i + 1]])],
     ['✕', () => files.splice(i, 1)]].forEach(([t, fn]) => {
      const b = document.createElement('button'); b.textContent = t;
      b.onclick = () => { fn(); render(); }; li.append(b);
    });
    ul.append(li);
  });
  $('go').disabled = files.length === 0;
  $('msg').textContent = files.length ? `${files.length} fichier(s) prêt(s).` : '';
}

function ajouter(nouveaux) {
  const pdfs = [...nouveaux].filter(f => /\.pdf$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  files = files.concat(pdfs); render();
}

$('pick').onclick = () => $('file').click();
$('file').onchange = e => { ajouter(e.target.files); e.target.value = ''; };
const drop = $('drop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); ajouter(e.dataTransfer.files); };

if (window.showDirectoryPicker) {            // Chrome / Edge
  $('pickDir').hidden = false;
  $('pickDir').onclick = async () => {
    try {
      const dir = await showDirectoryPicker(); const trouves = [];
      for await (const [nom, h] of dir.entries())
        if (h.kind === 'file' && /\.pdf$/i.test(nom)) trouves.push(await h.getFile());
      files = []; ajouter(trouves);
    } catch (e) { /* annulé */ }
  };
}

$('go').onclick = async () => {
  $('go').disabled = true; resetSortie();
  try {
    const r = await fusionner(files, $('footer').checked, m => $('msg').textContent = m);
    outUrl = URL.createObjectURL(new Blob([r.bytes], { type: 'application/pdf' }));
    $('dl').disabled = $('print').disabled = false;
    $('msg').textContent = `Terminé : ${r.pages} page(s).` +
      (r.erreurs.length ? '\nIgnorés :\n' + r.erreurs.join('\n') : '');
  } catch (e) { $('msg').textContent = 'Erreur : ' + e.message; }
  $('go').disabled = false;
};
$('dl').onclick = () => {
  const a = document.createElement('a'); a.href = outUrl; a.download = 'IMPRESSION_COMPLETE.pdf'; a.click();
};
$('print').onclick = () => window.open(outUrl, '_blank');