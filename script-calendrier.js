const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  body.classList.remove('light-theme', 'dark-theme');
  body.classList.add(savedTheme);
  themeToggle.checked = savedTheme === 'dark-theme';
} else {
  body.classList.add('light-theme');
  themeToggle.checked = false;
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

document.addEventListener('DOMContentLoaded', function () {
  const months = [
    { name: "Septembre", year: 2025, monthIndex: 8 },
    { name: "Octobre", year: 2025, monthIndex: 9 },
    { name: "Novembre", year: 2025, monthIndex: 10 },
    { name: "Décembre", year: 2025, monthIndex: 11 },
    { name: "Janvier", year: 2026, monthIndex: 0 },
    { name: "Février", year: 2026, monthIndex: 1 },
    { name: "Mars", year: 2026, monthIndex: 2 },
    { name: "Avril", year: 2026, monthIndex: 3 },
    { name: "Mai", year: 2026, monthIndex: 4 },
    { name: "Juin", year: 2026, monthIndex: 5 },
    { name: "Juillet", year: 2026, monthIndex: 6 },
    { name: "Août", year: 2026, monthIndex: 7 }
  ];
  const calendarContainer = document.getElementById('calendar');
  const today = new Date();

  months.forEach(month => {
    const monthCard = document.createElement('div');
    monthCard.className = 'month-card';
    const monthTitle = document.createElement('div');
    monthTitle.className = 'month-title';
    monthTitle.textContent = `${month.name} ${month.year}`;
    monthCard.appendChild(monthTitle);
    const table = document.createElement('table');

    // En-tête du tableau
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const weekNumberHeader = document.createElement('th');
    weekNumberHeader.textContent = "Semaine";
    headerRow.appendChild(weekNumberHeader);
    const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    daysOfWeek.forEach(day => {
      const th = document.createElement('th');
      th.textContent = day;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Corps du tableau
    const tbody = document.createElement('tbody');
    const firstDay = new Date(month.year, month.monthIndex, 1);
    const lastDay = new Date(month.year, month.monthIndex + 1, 0);
    let currentWeekStart = new Date(firstDay);

    // Trouver le lundi de la première semaine du mois
    currentWeekStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

    while (currentWeekStart <= lastDay) {
      const weekRow = document.createElement('tr');
      const weekNumberCell = document.createElement('td');
      weekNumberCell.className = 'week-number';
      weekNumberCell.textContent = getISOWeekNumber(new Date(currentWeekStart));
      weekRow.appendChild(weekNumberCell);

      for (let day = 0; day < 7; day++) {
        const dayCell = document.createElement('td');
        const currentDay = new Date(currentWeekStart);
        currentDay.setDate(currentWeekStart.getDate() + day);

        if (currentDay.getMonth() === month.monthIndex) {
          dayCell.textContent = currentDay.getDate();
          if (day === 5 || day === 6) dayCell.classList.add('weekend');
          if (currentDay.toDateString() === today.toDateString()) dayCell.classList.add('today');
        }
        weekRow.appendChild(dayCell);
      }

      tbody.appendChild(weekRow);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    table.appendChild(tbody);
    monthCard.appendChild(table);
    calendarContainer.appendChild(monthCard);
  });
});

// Fonction pour obtenir le numéro de semaine ISO 8601
function getISOWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
