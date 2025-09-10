const body = document.body; 
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');

// --- Gestion du thème ---
if (savedTheme) {
  body.classList.remove('light-theme', 'dark-theme');
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

// --- Génération du calendrier ---
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

        // En-tête (numéro de semaine + jours)
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

        // Corrige le décalage pour commencer lundi
        let day = firstDay.getDay();
        if (day === 0) day = 7; // dimanche → 7
        let currentWeek = new Date(firstDay);
        currentWeek.setDate(firstDay.getDate() - day + 1);

        while (currentWeek <= lastDay) {
            const weekRow = document.createElement('tr');

            // Numéro de semaine
            const weekNumberCell = document.createElement('td');
            weekNumberCell.className = 'week-number';
            const weekNumber = getWeekNumber(currentWeek);
            weekNumberCell.textContent = weekNumber;
            weekRow.appendChild(weekNumberCell);

            // Jours de la semaine
            for (let d = 0; d < 7; d++) {
                const dayCell = document.createElement('td');
                const currentDay = new Date(currentWeek);
                currentDay.setDate(currentWeek.getDate() + d);

                if (currentDay.getMonth() === month.monthIndex) {
                    dayCell.textContent = currentDay.getDate();

                    if (d === 5 || d === 6) {
                        dayCell.classList.add('weekend'); // samedi/dimanche
                    }

                    if (currentDay.toDateString() === today.toDateString()) {
                        dayCell.classList.add('today'); // jour actuel
                    }
                }

                weekRow.appendChild(dayCell);
            }

            tbody.appendChild(weekRow);
            currentWeek.setDate(currentWeek.getDate() + 7);
        }

        table.appendChild(tbody);
        monthCard.appendChild(table);
        calendarContainer.appendChild(monthCard);
    });
});

// --- Fonction numéro de semaine ISO ---
function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // lundi=0
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = target - firstThursday;
    return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}