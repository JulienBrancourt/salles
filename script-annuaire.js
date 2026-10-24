const table = document.getElementById("dataTableAnnuaire");
const tableBody = table.querySelector("tbody");
const errorBox = document.getElementById("dataError");

// Colonnes du tableau : [libellé affiché (data-name), clé dans annuaireData.json]
const COLUMNS = [
  ["Prénom", "prenom"],
  ["Nom", "nom"],
  ["Tel", "tel"],
  ["Mail", "mail"],
];

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

// "0643268553" -> "06 43 26 85 53" ; les postes à 4 chiffres et les listes
// ("8280 / 8295 / 8294") sont conservés tels quels.
function formatTel(raw) {
  return String(raw ?? "")
    .split("/")
    .map((part) => {
      const num = part.replace(/[\s.]/g, "");
      return /^\d{10}$/.test(num) ? num.replace(/(\d{2})(?=\d)/g, "$1 ") : part.trim();
    })
    .join(" / ");
}

fetch("annuaireData.json")
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((json) => {
    if (!Array.isArray(json)) throw new Error("format inattendu : un tableau est attendu");
    renderTable([...json].sort((a, b) => a.prenom.localeCompare(b.prenom, "fr")));
  })
  .catch((err) => {
    console.error("Chargement de annuaireData.json impossible :", err);
    showError("Impossible d'afficher l'annuaire. Vérifiez votre connexion, puis rechargez la page.");
  });

// textContent / createElement : les données ne sont jamais interprétées comme du HTML
function renderTable(rows) {
  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    COLUMNS.forEach(([label, key]) => {
      const td = document.createElement("td");
      td.dataset.name = label;

      if (key === "tel") {
        td.textContent = formatTel(row.tel);
      } else if (key === "mail" && row.mail) {
        const a = document.createElement("a");
        a.href = `mailto:${row.mail}`;
        a.textContent = row.mail;
        td.appendChild(a);
      } else {
        td.textContent = row[key] ?? "";
      }
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  tableBody.replaceChildren(fragment);
}
