class AppHeader extends HTMLElement { //on définit la classe AppHeader, qui pourra utilsée comme une balise HTML personnalisée 
  connectedCallback() { // méthode de web component appelée par le navigateur quand le composant est inséré dans le DOM
      this.innerHTML = //this fait référence au composant
        ` 
            <div class="progress"></div>
            <nav>
                <div class="nav-links">
                <a href="index.html">Liste des salles</a>
                <a href="annuaire.html">Annuaire</a>
                <a href="calendrier.html">Calendrier</a>
                </div>
                <div class="theme-switch">
                <label class="switch">
                    <input type="checkbox" id="themeToggle">
                    <span></span>
                </label>
                </div>
            </nav>
        `;
  }
}

customElements.define('app-header', AppHeader); //méthode pour enregistrer un nouveau web component, le composant étant une instance de la classe

