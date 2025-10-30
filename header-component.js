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
    
    
    // Récupère le body du document
    const body = document.body;
    // Récupère le bouton de toggle dans le shadow DOM ou directement dans this
    const themeToggle = this.querySelector('#themeToggle');

    // Charge le thème sauvegardé
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      body.classList.remove('light-theme', 'dark-theme');
      body.classList.add(savedTheme);
      themeToggle.checked = savedTheme === 'dark-theme';
    } else {
      body.classList.add('light-theme');
      themeToggle.checked = false;
    }

    // Ajoute l'écouteur d'événement
    themeToggle.addEventListener('change', function() {
      if (this.checked) {
        body.classList.replace('light-theme', 'dark-theme');
        localStorage.setItem('theme', 'dark-theme');
      } else {
        body.classList.replace('dark-theme', 'light-theme');
        localStorage.setItem('theme', 'light-theme');
      }
    });
  }
}

customElements.define('app-header', AppHeader); //méthode pour enregistrer un nouveau web component, le composant étant une instance de la classe

