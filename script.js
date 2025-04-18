let data = [];
let filteredData = [];

// Execute a function when the window is being scrolled
window.onscroll = function () { scrollFunction() };

const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const buildingCheckboxes = document.getElementById("buildingCheckboxes");
const resetButton = document.getElementById("resetButton");
const tableBody = document.querySelector("#dataTable tbody");

fetch("data.json")
	.then((res) => res.json())
	.then((json) => {
		data = json;
		populateFilters(data);
		applyFilters();
	});

function populateFilters(data) {
	const categories = [
		...new Set(data.map((item) => item.catégorie).filter(Boolean)),
	].sort();
	const buildings = [
		...new Set(data.map((item) => item.Bâtiment).filter(Boolean)),
	].sort();

	// Catégories
	categories.forEach((cat) => {
		const option = document.createElement("option");
		option.value = cat;
		option.textContent = cat;
		categorySelect.appendChild(option);
	});

	// Bâtiments
	buildings.forEach((b) => {
		const label = document.createElement("label");
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.value = b;
		label.appendChild(checkbox);
		label.appendChild(document.createTextNode(b));
		buildingCheckboxes.appendChild(label);
	});
}

function applyFilters() {
	const searchTerm = searchInput.value.trim().toLowerCase();
	const selectedCategory = categorySelect.value;
	const selectedBuildings = [
		...buildingCheckboxes.querySelectorAll("input:checked"),
	].map((cb) => cb.value);

	filteredData = data.filter((item) => {
		const matchName = item.Nom.toLowerCase().includes(searchTerm);
		const matchCategory =
			!selectedCategory || item.catégorie === selectedCategory;
		const matchBuilding =
			selectedBuildings.length === 0 ||
			selectedBuildings.includes(item.Bâtiment);
		return matchName && matchCategory && matchBuilding;
	});

	renderTable(filteredData);
}

function renderTable(rows) {
	tableBody.innerHTML = "";
	rows.forEach((row) => {
		const tr = document.createElement("tr");
		tr.innerHTML = `
      <td>${row.Nom}</td>
      <td>${row.Capacité}</td>
      <td>${row.examen}</td>
      <td>${row.catégorie}</td>
	  <td>${row.Réservé}</td>
      <td>${row.Bâtiment}</td>
      <td>${row.Accessibilité || ""}</td>
      <td>${row.observation || ""}</td>
    `;
		tableBody.appendChild(tr);
	});
}

searchInput.addEventListener("input", applyFilters);
categorySelect.addEventListener("change", applyFilters);
buildingCheckboxes.addEventListener("change", applyFilters);
resetButton.addEventListener("click", () => {
	searchInput.value = "";
	categorySelect.value = "";
	buildingCheckboxes
		.querySelectorAll("input")
		.forEach((cb) => (cb.checked = false));
	applyFilters();
});

// -----------------------------

function scrollFunction() {
	// Get the button
	var mybutton = document.getElementById("scrollToTopButton");

	if ( document.documentElement.scrollTop > 20 ) {
		mybutton.style.opacity = 1;
		mybutton.style.visibility = "visible";
	} else {
		mybutton.style.opacity = 0;
		mybutton.style.visibility = "hidden";
	}
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
	document.documentElement.scrollTop = 0;
}
