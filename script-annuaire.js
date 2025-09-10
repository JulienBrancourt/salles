let data = [];
const table = document.getElementById("dataTableAnnuaire");
const tableBody = table.querySelector("tbody");

const themeToggle = document.getElementById('themeToggle');
const body = document.body
const savedTheme = localStorage.getItem('theme');


if (savedTheme) {
  body.classList.remove('light-theme', 'dark-theme'); //supprime les  deux classes si un thème est dans le local strorage pour mettre le thème engeregistré
  body.classList.add(savedTheme);
  themeToggle.checked = savedTheme === 'dark-theme';
}

themeToggle.addEventListener('change', function () {
  if (this.checked) {
    body.classList.replace('light-theme', 'dark-theme');
    localStorage.setItem('theme', 'dark-theme');
  } else {
    body.classList.replace('dark-theme', 'light-theme');
    localStorage.setItem('theme', 'light-theme');
  }
});

fetch("annuaireData.json")
    .then((res) => res.json())
    .then((json) => {
        data = json
            .slice(1)
            .sort((a, b) => a.Prenom.localeCompare(b.Prenom));
        console.table(data)
        renderTable(data)
    })

function renderTable(rows) {
  tableBody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-name="Prénom">${row.Prenom}</td>
      <td data-name="Nom">${row.Nom}</td>
      <td data-name="Tel">${
      (() => {
        let tel = row.Tel;
        let parts = [];
        for (let i = 0; i < tel.length; i += 2) {
          parts.push(tel.slice(i, i + 2));
        }
        return parts.join(" ");
      })()
    }</td>

      <td data-name="Mail"><a href="mailto:${row.Mail}">${row.Mail}</a></td>
    `;
    tableBody.appendChild(tr);
  });
}