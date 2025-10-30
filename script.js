
window.addEventListener("scroll", scrollFunction);

let data = [];
let filteredData = [];
let mybutton = document.getElementById("scrollToTopButton");
let chartInstance;

// const themeToggle = document.getElementById('themeToggle');
const body = document.body

const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const buildingCheckboxes = document.getElementById("buildingCheckboxes");
const resetButton = document.getElementById("resetButton");
const table = document.getElementById("dataTable");
const tableBody = table.querySelector("tbody");


// const savedTheme = localStorage.getItem('theme');

// if (savedTheme) {
//   body.classList.remove('light-theme', 'dark-theme'); //supprime les  deux classes si un thème est dans le local strorage pour mettre le thème engeregistré
//   body.classList.add(savedTheme);
//   themeToggle.checked = savedTheme === 'dark-theme';
// }

// Selection du le site
const siteSelect = document.getElementById("siteSelect");

// // Charge le choix du site depuis le localStorage
// const savedSite = localStorage.getItem('selectedSite') || "";
// populateFilters(data, savedSite);
// applyFilters();


// Écouteur pour sauvegarder le choix du site
siteSelect.addEventListener("change", function() {
  localStorage.setItem('selectedSite', this.value);
  populateFilters(data, this.value); // Met à jour les filtres disponibles
  applyFilters(); // Applique les filtres
});




// Gestion du thème dark / light
// themeToggle.addEventListener('change', function () {
//   if (this.checked) {
//     body.classList.replace('light-theme', 'dark-theme');
//     localStorage.setItem('theme', 'dark-theme');
//   } else {
//     body.classList.replace('dark-theme', 'light-theme');
//     localStorage.setItem('theme', 'light-theme');
//   }
// });


// 1. Récupérer les données
fetch("data.json")
  .then((res) => res.json())
  .then((json) => {
    data = json;
    const savedSite = localStorage.getItem('selectedSite') || "";
    siteSelect.value = savedSite; // Met à jour la valeur affichée dans la liste déroulante
    
    populateFilters(data, savedSite);
    applyFilters();
    initResizers(); // initialise les redimensionneurs
    
  });

// 2. Remplir les filtres
function populateFilters(data, selectedSite = "") {
  // Filtrer les données selon le site sélectionné
  let filteredBySite = data;
  if (selectedSite) {
    filteredBySite = data.filter(item => item.Code.startsWith(selectedSite));
  }

  // Extraire les catégories et bâtiments uniques pour le site sélectionné
  const categories = [...new Set(filteredBySite.map(item => item.catégorie).filter(Boolean))].sort();
  const buildings = [...new Set(filteredBySite.map(item => item.Bâtiment).filter(Boolean))].sort();

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
    const matchName = item.Nom.toLowerCase().includes(searchTerm);
    const matchCategory = !selectedCategory || item.catégorie === selectedCategory;
    const matchBuilding = selectedBuildings.length === 0 || selectedBuildings.includes(item.Bâtiment);
    const matchSite = !selectedSite || item.Code.startsWith(selectedSite);
    return matchName && matchCategory && matchBuilding && matchSite;
  });

  filteredData.sort((a, b) => a.Nom.localeCompare(b.Nom));
  renderTable(filteredData);
  updateChart(filteredData);
  console.log(filteredData.length);
  if (filteredData.length > 1) {
    document.querySelector('#btnExportExcel span').textContent = `Exporter les ${filteredData.length} salles vers Excel`;
  }
  else {
    document.querySelector('#btnExportExcel span').textContent = `Exporter vers Excel`;
  }
  console.log(filteredData.length);
  
  
}

// 4. Afficher la table
function renderTable(rows) {
  
  tableBody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-name="Nom">${row.Nom}</td>
      <td data-name="Capacité">${row.Capacité}</td>
      <td data-name="Examen">${row.examen}</td>
      <td data-name="Catégorie">${row.catégorie}</td>
      <td data-name="Réservé">${row.Réservé}</td>
      <td data-name="Bâtiment">${row.Bâtiment}</td>
      <td data-name="Accessibilité">${row.Accessibilité || ""}</td>
      <td data-name="Observation">${row.observation || ""}</td>
    `;
    tableBody.appendChild(tr);
  });
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

function updateChart(data) {
  const labels = data.map(item => item.Nom);
  const capacities = data.map(item => Number(item.Capacité));
  const exams = data.map(item => Number(item.examen));

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

