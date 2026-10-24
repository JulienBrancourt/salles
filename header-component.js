class AppHeader extends HTMLElement {
	// balise HTML personnalisée <app-header>
	connectedCallback() {
		// appelée par le navigateur quand le composant est inséré dans le DOM
		this.innerHTML = `
      <div class="progress"></div>
      <nav aria-label="Navigation principale">
        <div class="nav-links">
          <a href="index.html">Liste des salles</a>
          <a href="annuaire.html">Annuaire</a>
          <a href="calendrier.html">Calendrier</a>
          <a href="parcours.html">Parcours</a>
          <a href="todo.html">Mémo Citadelle</a>
          <a href="edt.html">Emplois du temps</a>
          <a href="edt_v2.html">edt dev</a>
        </div>
        <div class="theme-switch">
          <label class="switch">
            <input type="checkbox" id="themeToggle" aria-label="Activer le thème sombre">
            <span></span>
          </label>
        </div>
      </nav>
    `;

		// Marque le lien de la page en cours (utilisé par le CSS et les lecteurs d'écran)
		const current = location.pathname.split("/").pop() || "index.html";
		this.querySelectorAll(".nav-links a").forEach((link) => {
			if (link.getAttribute("href") === current)
				link.setAttribute("aria-current", "page");
		});

		// Thème : le choix est porté par <html data-theme="light|dark">.
		// Un script inline dans le <head> l'applique avant le premier rendu ;
		// sans choix enregistré, le CSS suit le thème du système (prefers-color-scheme).
		const root = document.documentElement;
		const toggle = this.querySelector("#themeToggle");
		const systemDark = matchMedia("(prefers-color-scheme: dark)");

		try {
			// filet de sécurité si la page n'a pas le script inline
			const saved = localStorage.getItem("theme");
			if (saved && !root.dataset.theme)
				root.dataset.theme = saved.replace("-theme", "");
		} catch (e) {
			/* stockage indisponible */
		}

		const isDark = () =>
			(root.dataset.theme || (systemDark.matches ? "dark" : "light")) ===
			"dark";
		toggle.checked = isDark();

		toggle.addEventListener("change", () => {
			const theme = toggle.checked ? "dark" : "light";
			root.dataset.theme = theme;
			try {
				localStorage.setItem("theme", theme);
			} catch (e) {
				/* stockage indisponible */
			}
		});

		// Sans choix explicite, l'interrupteur suit les changements du système
		systemDark.addEventListener("change", () => {
			if (!root.dataset.theme) toggle.checked = isDark();
		});
	}
}

customElements.define("app-header", AppHeader); // enregistre le composant
