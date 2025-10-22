class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
        <div class="progress"></div>
        <nav>
            <label class="switch">
                <input type="checkbox" id="themeToggle">
                <span></span>
            </label>
            <a href="index.html">Liste des salles</a>
            <a href="annuaire.html">Annuaire</a>
            <a href="calendrier.html">Calendrier</a>
        </nav>
    `;
  }
}

customElements.define('app-header', AppHeader);
