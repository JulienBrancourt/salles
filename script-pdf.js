const { PDFDocument, StandardFonts, rgb } = PDFLib;
const $ = id => document.getElementById(id);

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

// ---------- Ordre imposé (bloc "Citadelle") ----------
// Certains libellés apparaissent plusieurs fois : le fichier correspondant
// sera dupliqué en autant d'exemplaires consécutifs dans la fusion finale.
const ORDRE_CITADELLE = ['B', 'C', 'D', 'E', 'E', 'E', 'F', 'F', 'F','G','G','G', 'H', 'J', 'Citadelle', 'Véhicules'];

function normaliser(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

// Un fichier correspond à un libellé si son nom (sans extension) est
// exactement ce libellé, ou commence par ce libellé suivi d'un séparateur
// (espace, tiret, underscore, point). Ex. "E.pdf", "E - remplacement.pdf".
function detecterLabel(nomFichier, labels) {
  const base = normaliser(nomFichier.replace(/\.pdf$/i, ''));
  for (const label of labels) {
    const l = normaliser(label);
    if (base === l || ['\u0020', '-', '_', '.'].some(sep => base.startsWith(l + sep))) {
      return label;
    }
  }
  return null;
}

// À partir des fichiers déposés, construit la liste ordonnée (avec doublons)
// en suivant `ordre`. Signale les libellés manquants et les fichiers non reconnus.
function construireOrdre(fichiers, ordre) {
  const labels = [...new Set(ordre)];
  const parLabel = new Map();
  const nonReconnus = [];
  for (const f of fichiers) {
    const label = detecterLabel(f.name, labels);
    if (label) {
      if (!parLabel.has(label)) parLabel.set(label, f);
    } else {
      nonReconnus.push(f.name);
    }
  }
  const manquants = [];
  const ordonnes = [];
  for (const label of ordre) {
    const f = parLabel.get(label);
    if (f) ordonnes.push(f);
    else if (!manquants.includes(label)) manquants.push(label);
  }
  return { ordonnes, manquants, nonReconnus };
}

// ---------- Fabrique d'interface pour un bloc de fusion ----------
// prefix : préfixe des ids DOM du bloc (ids inchangés pour le bloc historique).
// ordre  : si fourni, la fusion suit cet ordre imposé (avec doublons) au lieu
//          de l'ordre manuel de la liste, qui devient alors non réordonnable.
function initBloc({ prefix, ordre }) {
  const id = n => `${prefix}${n}`;
  const labels = ordre ? [...new Set(ordre)] : null;
  let files = [], outUrl = null;

  function resetSortie() {
    if (outUrl) URL.revokeObjectURL(outUrl);
    outUrl = null; $(id('print')).disabled = true;
  }

  function render() {
    resetSortie();
    const ul = $(id('list')); ul.textContent = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      const nom = document.createElement('span');
      if (labels) {
        const label = detecterLabel(f.name, labels);
        nom.textContent = label ? `${f.name}  →  ${label}` : `${f.name}  ⚠ non reconnu`;
      } else {
        nom.textContent = f.name;
      }
      li.append(nom);
      const actions = labels
        ? [['✕', () => files.splice(i, 1)]]
        : [['↑', () => i > 0 && ([files[i - 1], files[i]] = [files[i], files[i - 1]])],
           ['↓', () => i < files.length - 1 && ([files[i + 1], files[i]] = [files[i], files[i + 1]])],
           ['✕', () => files.splice(i, 1)]];
      actions.forEach(([t, fn]) => {
        const b = document.createElement('button'); b.textContent = t;
        b.onclick = () => { fn(); render(); }; li.append(b);
      });
      ul.append(li);
    });
    $(id('go')).disabled = files.length === 0;

    if (labels && files.length > 0) {
      const { manquants, nonReconnus } = construireOrdre(files, ordre);
      let msg = `${files.length} fichier(s) ajouté(s).`;
      if (manquants.length) msg += `\nManquants pour l'instant : ${manquants.join(', ')}`;
      if (nonReconnus.length) msg += `\nNon reconnus (seront ignorés) : ${nonReconnus.join(', ')}`;
      $(id('msg')).textContent = msg;
    } else {
      $(id('msg')).textContent = files.length ? `${files.length} fichier(s) prêt(s).` : '';
    }
  }

  function ajouter(nouveaux) {
    const pdfs = [...nouveaux].filter(f => /\.pdf$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
    files = files.concat(pdfs); render();
  }

  $(id('pick')).onclick = () => $(id('file')).click();
  $(id('file')).onchange = e => { ajouter(e.target.files); e.target.value = ''; };

  const drop = $(id('drop'));
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); ajouter(e.dataTransfer.files); };

  const pickDirBtn = $(id('pickDir'));
  if (pickDirBtn && window.showDirectoryPicker) {            // Chrome / Edge
    pickDirBtn.hidden = false;
    pickDirBtn.onclick = async () => {
      try {
        const dir = await showDirectoryPicker(); const trouves = [];
        for await (const [nom, h] of dir.entries())
          if (h.kind === 'file' && /\.pdf$/i.test(nom)) trouves.push(await h.getFile());
        files = []; ajouter(trouves);
      } catch (e) { /* annulé */ }
    };
  }

  $(id('go')).onclick = async () => {
    $(id('go')).disabled = true; resetSortie();
    try {
      let aFusionner = files;
      let avertissement = '';
      if (ordre) {
        const { ordonnes, manquants, nonReconnus } = construireOrdre(files, ordre);
        aFusionner = ordonnes;
        if (manquants.length) avertissement += `\nManquants : ${manquants.join(', ')}`;
        if (nonReconnus.length) avertissement += `\nNon reconnus (ignorés) : ${nonReconnus.join(', ')}`;
        if (aFusionner.length === 0) throw new Error('Aucun fichier reconnu.' + avertissement);
      }
      const r = await fusionner(aFusionner, $(id('footer')).checked, m => $(id('msg')).textContent = m);
      outUrl = URL.createObjectURL(new Blob([r.bytes], { type: 'application/pdf' }));
      $(id('print')).disabled = false;
      $(id('msg')).textContent = `Terminé : ${r.pages} page(s).` +
        (r.erreurs.length ? '\nIgnorés :\n' + r.erreurs.join('\n') : '') + avertissement;
    } catch (e) { $(id('msg')).textContent = 'Erreur : ' + e.message; }
    $(id('go')).disabled = false;
  };
  $(id('print')).onclick = () => window.open(outUrl, '_blank');
}

initBloc({ prefix: '' });                                   // Saint-Leu : ids inchangés
initBloc({ prefix: 'cit-', ordre: ORDRE_CITADELLE });        // Citadelle : ordre imposé avec doublons