const body = document.body; 
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');

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

            // Générer le calendrier pour chaque mois de l'année scolaire
            months.forEach(month => {
                const monthCard = document.createElement('div');
                monthCard.className = 'month-card';

                const monthTitle = document.createElement('div');
                monthTitle.className = 'month-title';
                monthTitle.textContent = `${month.name} ${month.year}`;
                monthCard.appendChild(monthTitle);

                const table = document.createElement('table');

                // En-tête du tableau (numéro de semaine + jours)
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

                // Calculer le premier jour du mois
                const firstDay = new Date(month.year, month.monthIndex, 1);
                const lastDay = new Date(month.year, month.monthIndex + 1, 0); //astuce pour dernier jour du mois !

                let currentWeek = new Date(firstDay);
                currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1);

                // Générer les lignes du calendrier
                while (currentWeek <= lastDay) {
                    const weekRow = document.createElement('tr');

                    // Numéro de la semaine
                    const weekNumberCell = document.createElement('td');
                    weekNumberCell.className = 'week-number';
                    const weekNumber = getWeekNumber(currentWeek);
                    weekNumberCell.textContent = weekNumber;
                    weekRow.appendChild(weekNumberCell);

                    // Jours de la semaine
                    for (let day = 0; day < 7; day++) {
                        const dayCell = document.createElement('td');
                        const currentDay = new Date(currentWeek);
                        currentDay.setDate(currentWeek.getDate() + day);

                        if (currentDay.getMonth() === month.monthIndex) {
                            dayCell.textContent = currentDay.getDate();

                            // Mettre en évidence le week-end
                            if (day === 5 || day === 6) {
                                dayCell.classList.add('weekend');
                            }

                            // Mettre en évidence le jour actuel (si applicable)
                            if (currentDay.toDateString() === today.toDateString()) {
                                dayCell.classList.add('today');
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

        // Fonction pour obtenir le numéro de la semaine (ISO)
        function getWeekNumber(date) {
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        }