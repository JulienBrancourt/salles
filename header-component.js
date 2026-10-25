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
          <button type="button" class="btn btn--sm" id="styleToggle" aria-pressed="false" aria-label="Style alternatif" title="Basculer vers le style alternatif">Style</button>
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

		// Style : style.css (par défaut) ou style_alternatif.css.
		// Le choix est lu avant le premier rendu par un script inline dans chaque
		// <head> (qui écrit <link id="siteStyle">) : même clé "style", mêmes fichiers.
		const STYLE_DEFAULT = "style.css";
		const STYLE_ALT = "style_alternatif.css";
		const styleBtn = this.querySelector("#styleToggle");
		const styleLink = () => document.getElementById("siteStyle");
		const isAlt = () => styleLink()?.getAttribute("href") === STYLE_ALT;

		const syncStyleButton = () => {
			styleBtn.setAttribute("aria-pressed", String(isAlt()));
			styleBtn.title = isAlt()
				? "Revenir au style d'origine"
				: "Basculer vers le style alternatif";
		};
		syncStyleButton();

		// Charge la nouvelle feuille AVANT de retirer l'ancienne : pas de page sans style
		const swapStylesheet = (href) =>
			new Promise((resolve) => {
				const old = styleLink();
				if (!old) return resolve();
				const next = document.createElement("link");
				next.rel = "stylesheet";
				next.href = href;
				old.removeAttribute("id");
				next.id = "siteStyle";
				next.addEventListener("load", () => {
					old.remove();
					resolve();
				});
				next.addEventListener("error", () => {
					next.remove();
					old.id = "siteStyle";
					resolve();
				});
				old.after(next);
			});

		styleBtn.addEventListener("click", async () => {
			const alt = !isAlt();
			const run = () => swapStylesheet(alt ? STYLE_ALT : STYLE_DEFAULT);
			// Fondu natif quand le navigateur le permet (le site utilise déjà les view transitions)
			if (document.startViewTransition)
				await document.startViewTransition(run).finished;
			else await run();
			syncStyleButton();
			try {
				localStorage.setItem("style", alt ? "alternatif" : "defaut");
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
