let data = [];
const table = document.getElementById("dataTableAnnuaire");
const tableBody = table.querySelector("tbody");

fetch("annuaireData.json")
    .then((res) => res.json())
    .then((json) => {
        data = json
            .slice(1) //penser à ne pas utiliser l'index 0 qui sert de modèle
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