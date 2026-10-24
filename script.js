
window.addEventListener("scroll", scrollFunction);

let data = [];
let filteredData = [];
let mybutton = document.getElementById("scrollToTopButton");
let chartInstance;

const body = document.body

const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const buildingCheckboxes = document.getElementById("buildingCheckboxes");
const resetButton = document.getElementById("resetButton");
const table = document.getElementById("dataTable");
const tableBody = table.querySelector("tbody");
const btnExport = document.getElementById("btnExportExcel");
const errorBox = document.getElementById("dataError");

// Colonnes du tableau : [libellé affiché (data-name), clé dans data.json]
const COLUMNS = [
  ["Nom", "nom"],
  ["Capacité", "capacite"],
  ["Examen", "examen"],
  ["Catégorie", "categorie"],
  ["Réservé", "reserve"],
  ["Bâtiment", "batiment"],
  ["Accessibilité", "accessibilite"],
  ["Observation", "observation"],
];

// Affiche un message d'erreur visible (lecteurs d'écran inclus : role="alert")
function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

// Le stockage local peut être indisponible (navigation privée stricte) : ne jamais planter pour ça
function loadSite() {
  try { return localStorage.getItem("selectedSite") || ""; } catch (e) { return ""; }
}

function saveSite(value) {
  try { localStorage.setItem("selectedSite", value); } catch (e) { /* stockage indisponible */ }
}


// Selection du le site
const siteSelect = document.getElementById("siteSelect");

// Écouteur pour sauvegarder le choix du site
siteSelect.addEventListener("change", function() {
  saveSite(this.value);
  populateFilters(data, this.value); // Met à jour les filtres disponibles
  applyFilters(); // Applique les filtres
});


// 1. Récupérer les données
fetch("data.json")
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((json) => {
    if (!Array.isArray(json)) throw new Error("format inattendu : un tableau est attendu");
    data = json;
    const savedSite = loadSite();
    siteSelect.value = savedSite; // Met à jour la valeur affichée dans la liste déroulante

    populateFilters(data, savedSite);
    applyFilters();
    initResizers(); // initialise les redimensionneurs
  })
  .catch((err) => {
    console.error("Chargement de data.json impossible :", err);
    btnExport.disabled = true;
    showError("Impossible d'afficher la liste des salles. Vérifiez votre connexion, puis rechargez la page.");
  });

// 2. Remplir les filtres
function populateFilters(data, selectedSite = "") {
  // Filtrer les données selon le site sélectionné
  let filteredBySite = data;
  if (selectedSite) {
    filteredBySite = data.filter(item => item.code.startsWith(selectedSite));
  }

  // Extraire les catégories et bâtiments uniques pour le site sélectionné
  const categories = [...new Set(filteredBySite.map(item => item.categorie).filter(Boolean))].sort();
  const buildings = [...new Set(filteredBySite.map(item => item.batiment).filter(Boolean))].sort();

  // Mettre à jour les options de catégorie
  categorySelect.innerHTML = '<option value="">Toutes les catégories</option>';
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  // Mettre à jour les checkboxes des bâtiments
  buildingCheckboxes.innerHTML = '';
  buildings.forEach(b => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = b;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(b));
    buildingCheckboxes.appendChild(label);
  });
}


// 3. Appliquer les filtres
function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categorySelect.value;
  const selectedBuildings = [...buildingCheckboxes.querySelectorAll("input:checked")].map(cb => cb.value);


  const selectedSite = siteSelect.value;
  filteredData = data.filter((item) => {
    const matchName = item.nom.toLowerCase().includes(searchTerm);
    const matchCategory = !selectedCategory || item.categorie === selectedCategory;
    const matchBuilding = selectedBuildings.length === 0 || selectedBuildings.includes(item.batiment);
    const matchSite = !selectedSite || item.code.startsWith(selectedSite);
    return matchName && matchCategory && matchBuilding && matchSite;
  });

  filteredData.sort((a, b) => a.nom.localeCompare(b.nom));
  renderTable(filteredData);
  updateChart(filteredData);

  const n = filteredData.length;
  btnExport.querySelector("span").textContent = n > 1 ? `Exporter les ${n} salles vers Excel` : "Exporter vers Excel";
  btnExport.disabled = n === 0;
}

// 4. Afficher la table (textContent : les données ne sont jamais interprétées comme du HTML)
function renderTable(rows) {
  const fragment = document.createDocumentFragment();

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "empty";
    td.colSpan = COLUMNS.length;
    td.textContent = "Aucune salle ne correspond à ces filtres.";
    tr.appendChild(td);
    fragment.appendChild(tr);
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    COLUMNS.forEach(([label, key]) => {
      const td = document.createElement("td");
      td.dataset.name = label;
      td.textContent = row[key] ?? "";
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  tableBody.replaceChildren(fragment);
}

// 5. Écouteurs sur les filtres
searchInput.addEventListener("input", applyFilters);
categorySelect.addEventListener("change", applyFilters);
buildingCheckboxes.addEventListener("change", applyFilters);
resetButton.addEventListener("click", () => {
  searchInput.value = "";
  categorySelect.value = "";
  buildingCheckboxes.querySelectorAll("input").forEach((cb) => (cb.checked = false));
  applyFilters();

});

// 6. Redimensionnement des colonnes
function initResizers() {
  const thElements = table.querySelectorAll('th');

  thElements.forEach(cell => {
    const resizer = document.createElement('div');
    resizer.style.width = '5px';
    resizer.style.height = '100%';
    resizer.style.position = 'absolute';
    resizer.style.top = '0';
    resizer.style.right = '0';
    resizer.style.cursor = 'col-resize';
    resizer.style.userSelect = 'none';
    resizer.style.zIndex = '1';

    cell.style.position = 'relative';
    cell.appendChild(resizer);

    let currentTh, startX, startWidth;

    resizer.addEventListener('mousedown', function (e) {
      currentTh = cell;
      startX = e.pageX;
      startWidth = currentTh.offsetWidth;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!currentTh) return;
      const newWidth = startWidth + (e.pageX - startX);
      currentTh.style.width = newWidth + 'px';

      const index = Array.from(currentTh.parentElement.children).indexOf(currentTh);
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cell = row.children[index];
        if (cell) {
          cell.style.width = newWidth + 'px';
        }
      });
    }

    function onMouseUp() {
      currentTh = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  });
}

// ----- bouton retour en haut de page

function scrollFunction() {
	if ( document.documentElement.scrollTop > 20 ) {
		mybutton.style.opacity = 1;
		mybutton.style.visibility = "visible";
	} else {
		mybutton.style.opacity = 0;
		mybutton.style.visibility = "hidden";
	}
}

function topFunction() {
	document.documentElement.scrollTop = 0;
}

// ---- formulaire de contact
const form = document.getElementById("form");
const result = document.getElementById("result");

form.addEventListener("submit", function (e) {
	e.preventDefault();
	const formData = new FormData(form);
	const object = Object.fromEntries(formData);
	const json = JSON.stringify(object);
	
	result.style.display = "block";
	result.innerHTML = "Please wait...";

	fetch("https://api.web3forms.com/submit", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: json,
	})
		.then(async (response) => {
			let json = await response.json();
			if (response.status == 200) {
				result.innerHTML = "Form submitted successfully";
			} else {
				console.log(response);
				result.innerHTML = json.message;
			}
		})
		.catch((error) => {
			console.log(error);
			result.innerHTML = "Something went wrong!";
		})
		.then(function () {
			setTimeout(() => {
				form.reset(); // <-- ceci efface bien les champs
				result.style.display = "none";
				result.innerHTML = ""; // <-- pour tout nettoyer
			}, 3000);
		});
});

//--graphique

// Valeur tracée sur le graphique : le premier nombre du texte
// ("27 / 14" -> 27, "⚠ 34" -> 34, "24 / 25 ?" -> 24) ; 0 si la case est vide.
function premierNombre(valeur) {
  const m = String(valeur ?? "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function updateChart(data) {
  if (typeof Chart === "undefined") return; // bibliothèque non chargée (CDN indisponible)

  const labels = data.map(item => item.nom);
  const capacities = data.map(item => premierNombre(item.capacite));
  const exams = data.map(item => premierNombre(item.examen));

  const ctx = document.getElementById('capacityChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy(); // Supprime l'ancien graphique s'il existe
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cours',
          data: capacities,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
        },
        {
          label: 'Examen',
          data: exams,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Capacité des salles sélectionnées',
          font: {
            size: 18
          },
          padding: {
            top: 30,
            bottom: 10
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

//--- exporter vers excel

function exporterEnExcel(tableId) {
  if (typeof XLSX === "undefined") {
    showError("L'export Excel est indisponible : la bibliothèque n'a pas pu être chargée.");
    return;
  }
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.book_new(); // créé un nouveau classeur excel
  const ws = XLSX.utils.table_to_sheet(table); //convertit table en worksheet

  // Largeur automatique : calcule la largeur de chaque colonne selon le contenu
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10; // valeur par défaut
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && cell.v != null) {
        const cellText = String(cell.v);
        maxWidth = Math.max(maxWidth, cellText.length + 2); // marge
      }
    }
    colWidths.push({ wch: maxWidth });
  }

  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, "Salles"); //ajoute ws au classeur et lui donne le nom d'onglet 
  XLSX.writeFile(wb, "liste_des_salles.xlsx"); //génère et dl le fichier Excel
}

