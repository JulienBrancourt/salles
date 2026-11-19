/* EDT_v2 – Planning des salles Citadelle (grille horaire 8h–20h)
 * Entrées : un CSV d'export d'emploi du temps + data.json (liste des salles)
 * + enseignants.json (correspondance code -> "Nom Prénom", à la racine du projet).
 * Les salles affichées sont celles de data.json dont le code commence par "CITA".
 */
(function () {
  'use strict';

  var H_START = 8 * 60;            // 08:00
  var H_END = 20 * 60;             // 20:00
  var SPAN = H_END - H_START;
  // Ordre d'impression : [bâtiment, nombre d'exemplaires]. 'Global' = toutes les salles.
  var PRINT_PLAN = [['Global', 1], ['B', 1], ['C', 1], ['D', 1], ['E', 3], ['F', 3], ['G', 3], ['H', 1], ['J', 1]];
  var DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  var $file = document.getElementById('file');
  var $print = document.getElementById('print');
  var $status = document.getElementById('status');
  var $out = document.getElementById('out');
  var $json = document.getElementById('jsonfile');
  var $jsonLabel = document.getElementById('jsonlabel');
  var $print_out = document.getElementById('print-out');
  var $tjson = document.getElementById('teachersfile');
  var $tjsonLabel = document.getElementById('teacherslabel');

  var rooms = null;                // [{key, nom, code, batiment}]
  var lastState = null;            // {days:[{day,events,weeks}], roomList, title} du dernier rendu
  var teachers = null;             // {codeNormalisé: "Nom Prénom"}
  var TEACHERS_KEY = 'edt_enseignants';   // clé localStorage (copie privée, propre à ce navigateur)
  var unmatched = {};              // codes enseignants du CSV absents de enseignants.json
  var lastCsv = null;              // dernier CSV lu (pour re-rendu après chargement de data.json)

  /* ---------- Utilitaires ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function toMin(hhmm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  function fmt(min) {
    return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  }

  // Clé normalisée d'une salle : "CIT-B002 - 90 max", "CITA- G121 - 8 max", "CIT-J-101 …" -> "B002", "G121", "J101", "Hall B"
  var ROOM_RE = /CITA?-\s*(Hall\s*[A-Z]|[A-Z]-?\d+)/i;
  function roomKey(s) {
    var m = ROOM_RE.exec(s || '');
    if (!m) return null;
    var k = m[1].replace(/-/g, '');
    if (/^hall/i.test(k)) return 'Hall ' + k.replace(/^hall\s*/i, '').toUpperCase();
    return k.toUpperCase();
  }

  function sortRooms(a, b) {
    var ha = /^Hall/.test(a.key), hb = /^Hall/.test(b.key);
    if (ha !== hb) return ha ? 1 : -1;                 // les halls en dernier
    return a.key.localeCompare(b.key, 'fr', { numeric: true });
  }

  function buildingOf(key) {
    return /^Hall/.test(key) ? 'Halls' : key.charAt(0);
  }

  /* ---------- Lecture du CSV ---------- */

  function decode(buf) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, '');
    } catch (e) {
      return new TextDecoder('windows-1252').decode(buf);
    }
  }

  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i, c;
    var sep = (text.split('\n', 5).join('\n').split(';').length > text.split('\n', 5).join('\n').split(',').length) ? ';' : ',';
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; } else q = false;
        } else cur += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function parseEvents(rows) {
    var h = -1, i;
    for (i = 0; i < rows.length; i++) {
      var low = rows[i].map(function (x) { return x.trim().toLowerCase(); });
      if (low.indexOf('day') >= 0 && low.indexOf('start') >= 0) { h = i; break; }
    }
    if (h < 0) throw new Error("En-têtes introuvables (colonnes Day, Start, End… attendues).");
    var cols = {};
    rows[h].forEach(function (n, idx) { cols[n.trim().toLowerCase()] = idx; });
    function g(r, n) { return (r[cols[n]] || '').trim(); }

    var title = rows.slice(0, h).map(function (r) { return r.join(' ').trim(); }).filter(Boolean).join(' – ');
    var events = [], skipped = 0;
    rows.slice(h + 1).forEach(function (r) {
      if (!r.length || !r.some(function (x) { return x.trim(); })) return;
      var s = toMin(g(r, 'start')), e = toMin(g(r, 'end'));
      var day = g(r, 'day').toLowerCase();
      if (s == null || e == null || e <= s || !day) { skipped++; return; }
      var keys = g(r, 'rooms').split(';').map(roomKey).filter(Boolean);
      if (!keys.length) { skipped++; return; }
      events.push({
        day: day, start: s, end: e, weeks: g(r, 'weeks'),
        category: g(r, 'category'), module: g(r, 'modules'), staff: g(r, 'staff'),
        rooms: keys, roomsRaw: g(r, 'rooms')
      });
    });
    return { title: title, events: events, skipped: skipped };
  }

  /* ---------- Enseignants ---------- */

  function normCode(c) { return String(c || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  function lookupTeacher(code) {
    return teachers ? teachers[normCode(code)] || null : null;
  }

  // "M9557" ou "MOREL DOMINIQUE [M9557]" (plusieurs séparés par ";") -> "Morel Dominique, Dupont Jean"
  function teacherNames(staff) {
    if (!staff) return '';
    return staff.split(';').map(function (s) {
      s = s.trim();
      if (!s) return '';
      var t = lookupTeacher(s);
      if (!t) {
        var m = /\[([^\]]+)\]/.exec(s);
        if (m) t = lookupTeacher(m[1]);                       // "NOM PRENOM [CODE]"
        if (!t) t = lookupTeacher(s.replace(/\s*\[[^\]]*\]\s*$/, ''));   // "CODE [suffixe]" -> "CODE"
      }
      if (!t && teachers) unmatched[s] = true;
      return t || s;                 // code non trouvé : on garde la valeur brute
    }).filter(Boolean).join(', ');
  }

  /* ---------- Libellés des créneaux ---------- */

  // "REEES02 - Education et sociétés" -> "Education et sociétés" (sans le code du module)
  function moduleNames(mod) {
    return mod.split(';').map(function (m) {
      m = m.trim();
      var i = m.search(/\s+-\s+/);
      return (i >= 0 ? m.slice(i).replace(/^\s+-\s+/, '') : m).trim();
    }).filter(Boolean).join(' / ');
  }

  function typeClass(cat) {
    var c = cat.toLowerCase();
    if (c.indexOf('indispon') === 0) return 'indispo';
    if (c.indexOf('distanciel') >= 0) return 'dist';
    if (c.indexOf('cm/td') === 0) return 'cmtd';
    if (c.indexOf('cm') === 0) return 'cm';
    if (c.indexOf('td') === 0) return 'td';
    if (c.indexOf('tp') === 0) return 'tp';
    return 'autre';
  }

  /* ---------- Rendu ---------- */

  function assignLanes(list) {
    list.sort(function (a, b) { return a.s - b.s || a.e - b.e; });
    var ends = [];
    list.forEach(function (ev) {
      var l = 0;
      while (l < ends.length && ends[l] > ev.s) l++;
      ends[l] = ev.e;
      ev.lane = l;
    });
    return ends.length;
  }

  function dedupe(list) {
    var seen = {};
    return list.filter(function (ev) {
      var k = [ev.start, ev.end, ev.category, ev.module, ev.staff].join('|');
      if (seen[k]) return false;
      return (seen[k] = true);
    });
  }

  function hoursHeader() {
    var wrap = el('div', 'edt-hours');
    for (var h = H_START / 60; h < H_END / 60; h++) wrap.appendChild(el('span', null, h + 'h'));
    return wrap;
  }

  function renderDay(day, events, roomList, weeks, prefix) {
    var sec = el('section', 'edt-day');
    var t = day.charAt(0).toUpperCase() + day.slice(1);
    sec.appendChild(el('h2', null, (prefix ? prefix + ' – ' : '') + t + (weeks.length ? ' – semaine' + (weeks.length > 1 ? 's ' : ' ') + weeks.join(', ') : '')));

    var byRoom = {};
    events.forEach(function (ev) {
      ev.rooms.forEach(function (k) { (byRoom[k] = byRoom[k] || []).push(ev); });
    });

    var table = el('table', 'edt-table');
    var thead = el('thead');
    var trh = el('tr');
    trh.appendChild(el('th', 'edt-roomh', 'Salle'));
    var thh = el('th', 'edt-timeh');
    thh.appendChild(hoursHeader());
    trh.appendChild(thh);
    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = el('tbody');
    var lastB = null, used = 0;
    roomList.forEach(function (room) {
      var b = buildingOf(room.key);
      if (b !== lastB) {
        var trb = el('tr', 'edt-bld');
        var tdb = el('td', null, b === 'Halls' ? 'Halls' : 'Bâtiment ' + b);
        tdb.colSpan = 2;
        trb.appendChild(tdb);
        tbody.appendChild(trb);
        lastB = b;
      }
      var tr = el('tr', 'edt-row');
      var th = el('th', 'edt-room', room.label);
      th.title = room.title || room.label;
      tr.appendChild(th);
      var td = el('td', 'edt-line');

      var list = dedupe(byRoom[room.key] || []).map(function (ev) {
        return { ev: ev, s: Math.max(ev.start, H_START), e: Math.min(ev.end, H_END) };
      }).filter(function (x) { return x.e > x.s; });
      var lanes = assignLanes(list);
      if (lanes) used++;
      td.style.setProperty('--lanes', Math.max(lanes, 0));
      if (!lanes) tr.classList.add('edt-free');

      list.forEach(function (x) {
        var ev = x.ev;
        var cls = typeClass(ev.category);
        var blk = el('div', 'edt-ev edt-' + cls);
        blk.style.left = ((x.s - H_START) / SPAN * 100) + '%';
        blk.style.width = ((x.e - x.s) / SPAN * 100) + '%';
        blk.style.setProperty('--lane', x.lane);
        if (ev.start < H_START) blk.classList.add('edt-cut-l');
        if (ev.end > H_END) blk.classList.add('edt-cut-r');

        var names = moduleNames(ev.module);
        var line1 = cls === 'indispo' ? 'Indisponible' : (names ? names + ' · ' + ev.category : ev.category);
        blk.appendChild(el('span', 'edt-l1', line1));
        var teacher = cls === 'indispo' ? '' : teacherNames(ev.staff);
        blk.appendChild(el('span', 'edt-l2', fmt(ev.start) + '–' + fmt(ev.end) + (teacher ? ' · ' + teacher : '')));
        blk.title = [ev.category, ev.module, fmt(ev.start) + '–' + fmt(ev.end),
          teacher && 'Enseignant : ' + teacher, 'Salle(s) : ' + ev.roomsRaw].filter(Boolean).join('\n');
        td.appendChild(blk);
      });
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    sec.appendChild(table);
    return { node: sec, used: used };
  }

  function render(csv) {
    $out.textContent = '';
    unmatched = {};
    var data = parseEvents(csv.rows);
    var base = rooms ? rooms.slice() : [];
    var known = {};
    base.forEach(function (r) { known[r.key] = true; });

    // Salles du CSV absentes de data.json : ajoutées en fin de liste pour ne rien perdre
    var extra = {};
    data.events.forEach(function (ev) {
      ev.rooms.forEach(function (k) { if (!known[k] && !extra[k]) extra[k] = { key: k, label: k, title: k + ' (absente de data.json)' }; });
    });
    var extraList = Object.keys(extra).map(function (k) { return extra[k]; }).sort(sortRooms);
    var roomList = base.concat(extraList);

    if (data.title) $out.appendChild(el('p', 'edt-sub', data.title));

    var byDay = {};
    data.events.forEach(function (ev) { (byDay[ev.day] = byDay[ev.day] || []).push(ev); });
    var days = Object.keys(byDay).sort(function (a, b) {
      var ia = DAYS.indexOf(a), ib = DAYS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    var usedTotal = {};
    lastState = { days: [], roomList: roomList, title: data.title };
    days.forEach(function (d) {
      var weeks = [];
      byDay[d].forEach(function (ev) { if (ev.weeks && weeks.indexOf(ev.weeks) < 0) weeks.push(ev.weeks); });
      lastState.days.push({ day: d, events: byDay[d], weeks: weeks });
      var r = renderDay(d, byDay[d], roomList, weeks);
      $out.appendChild(r.node);
      byDay[d].forEach(function (ev) { ev.rooms.forEach(function (k) { usedTotal[k] = true; }); });
    });

    var msg = data.events.length + ' créneaux · ' + Object.keys(usedTotal).length + '/' + roomList.length + ' salles occupées';
    if (data.skipped) msg += ' · ' + data.skipped + ' ligne(s) ignorée(s)';
    if (extraList.length) msg += ' · ' + extraList.length + ' salle(s) hors data.json : ' + extraList.map(function (r) { return r.key; }).join(', ');
    var nUnmatched = Object.keys(unmatched).length;
    if (!teachers) msg += ' · enseignants.json non chargé (codes affichés tels quels)';
    else if (nUnmatched) msg += ' · ' + nUnmatched + ' code(s) enseignant non trouvé(s) : ' + Object.keys(unmatched).slice(0, 5).join(', ') + (nUnmatched > 5 ? '…' : '');
    if (!rooms) msg += ' · data.json non chargé (salles déduites du CSV)';
    $status.textContent = csv.name + ' – ' + msg;
    $print.disabled = false;
  }

  /* ---------- Impression (A4 paysage) ---------- */

  // Construit le contenu à imprimer dans l'ordre de PRINT_PLAN (une section = nouvelle page).
  function buildPrint() {
    $print_out.textContent = '';
    if (!lastState) return;
    PRINT_PLAN.forEach(function (p) {
      var name = p[0], copies = p[1];
      var list = name === 'Global' ? lastState.roomList
        : lastState.roomList.filter(function (r) { return buildingOf(r.key) === name; });
      if (!list.length) return;
      var prefix = 'Citadelle – ' + (name === 'Global' ? 'Global' : 'Bâtiment ' + name);
      for (var c = 0; c < copies; c++) {
        lastState.days.forEach(function (d) {
          var r = renderDay(d.day, d.events, list, d.weeks, prefix);
          r.node.classList.add('edt-page');
          $print_out.appendChild(r.node);
        });
      }
    });
  }

  window.addEventListener('beforeprint', buildPrint);
  window.addEventListener('afterprint', function () { $print_out.textContent = ''; });

  /* ---------- Chargement des salles (data.json) ---------- */

  function setRooms(arr) {
    rooms = arr.filter(function (x) { return /^CITA\b/i.test(x.code || ''); }).map(function (x) {
      var key = roomKey(x.code);
      return key ? { key: key, label: (x.nom || key), title: x.nom + (x.capacite ? ' – ' + x.capacite + ' places' : ''), code: x.code } : null;
    }).filter(Boolean).sort(sortRooms);
    $jsonLabel.hidden = true;
  }

  function loadRoomsFetch() {
    return fetch('data.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setRooms)
      .catch(function () {
        rooms = null;
        $jsonLabel.hidden = false;      // ex. page ouverte en local : chargement manuel possible
        $status.textContent = "data.json introuvable : chargez-le manuellement ou servez la page via un serveur web.";
      });
  }

  /* ---------- Chargement des enseignants (enseignants.json) ---------- */

  // Accepte [{"Nom Prénom": "...", "Code": "..."}, ...]
  function setTeachers(arr) {
    teachers = {};
    arr.forEach(function (x) {
      var name = x['Nom Prénom'] || x['Nom Prenom'] || x.nom || '';
      var code = x.Code != null ? x.Code : x.code;
      if (code != null && name) teachers[normCode(code)] = name;
    });
    $tjsonLabel.hidden = true;
  }

  function loadTeachersFetch() {
    return fetch('enseignants.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setTeachers)
      .catch(function () {
        // Pas de enseignants.json sur le serveur (cas voulu : fichier non publié) :
        // on reprend la copie mémorisée dans ce navigateur lors d'un chargement manuel précédent.
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(TEACHERS_KEY)); } catch (e) {}
        if (Array.isArray(saved)) { setTeachers(saved); return; }
        teachers = null;
        $tjsonLabel.hidden = false;     // chargement manuel possible
      });
  }

  /* ---------- Événements ---------- */

  function safeRender() {
    try { render(lastCsv); }
    catch (err) { $out.textContent = ''; $print.disabled = true; $status.textContent = 'Erreur : ' + err.message; }
  }

  $file.addEventListener('change', function () {
    var f = $file.files[0];
    if (!f) return;
    $status.textContent = 'Lecture de ' + f.name + '…';
    f.arrayBuffer().then(function (buf) {
      lastCsv = { name: f.name, rows: parseCSV(decode(buf)) };
      return Promise.all([roomsReady, teachersReady]).then(safeRender);
    });
    $file.value = '';
  });

  $json.addEventListener('change', function () {
    var f = $json.files[0];
    if (!f) return;
    f.text().then(function (t) {
      setRooms(JSON.parse(t));
      if (lastCsv) safeRender(); else $status.textContent = 'data.json chargé (' + rooms.length + ' salles Citadelle). Chargez le CSV.';
    }).catch(function () { $status.textContent = 'data.json invalide.'; });
    $json.value = '';
  });

  $tjson.addEventListener('change', function () {
    var f = $tjson.files[0];
    if (!f) return;
    f.text().then(function (t) {
      var arr = JSON.parse(t);
      setTeachers(arr);
      try { localStorage.setItem(TEACHERS_KEY, JSON.stringify(arr)); } catch (e) {}   // mémorisé pour les prochaines visites
      if (lastCsv) safeRender(); else $status.textContent = 'enseignants.json chargé (mémorisé dans ce navigateur). Chargez le CSV.';
    }).catch(function () { $status.textContent = 'enseignants.json invalide.'; });
    $tjson.value = '';
  });

  $print.addEventListener('click', function () {
    var old = document.title;
    document.title = 'Planning_Citadelle';         // nom proposé pour le fichier PDF
    window.print();
    document.title = old;
  });

  var teachersReady = loadTeachersFetch();
  var roomsReady = loadRoomsFetch().then(function () {
    if (rooms) $status.textContent = 'Aucun fichier chargé (' + rooms.length + ' salles Citadelle connues).';
  });
})();