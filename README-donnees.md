# Données du site

Deux fichiers JSON alimentent le site. Après toute modification, lancer :

    node scripts/validate-data.mjs

Le script signale les erreurs (JSON invalide avec numéro de ligne, clé mal orthographiée, format incorrect, code en double) et les avertissements (catégorie ou bâtiment vide, code sans préfixe de site). Dans VS Code, les mêmes règles s'appliquent en direct grâce à `schemas/` et `.vscode/settings.json`.

## data.json — salles

Un objet par salle, avec **toutes** les clés ci-dessous (texte vide `""` si sans objet) :

| Clé | Contenu |
|---|---|
| `code` | Identifiant unique, commençant par `CITA` (Citadelle) ou `SC` (Saint-Leu) : le filtre de site s'appuie sur ce début |
| `nom` | Nom affiché |
| `capacite` | Entier, ou texte `"27 / 14"` (deux configurations, espaces autour du `/`), suivi de ` ?` si incertain, ou vide |
| `examen` | Texte : `"28"`, `"⚠ 34"` (à vérifier) ou vide |
| `categorie` | Type de salle (texte libre) |
| `reserve` | Composante ou formation à qui la salle est réservée |
| `observation` | Remarque libre |
| `accessibilite` | Remarque libre |
| `batiment` | Bâtiment (G, E, Minimes…) |

## annuaireData.json — annuaire

Un objet par contact. Pour ajouter quelqu'un, copier ce modèle (il n'est plus dans le fichier) :

    {
        "prenom": "Prénom ou nom du service",
        "nom": "Nom, ou vide pour un service",
        "tel": "0612345678",
        "mail": "prenom.nom@u-picardie.fr"
    }

- `tel` : sans espace. 10 chiffres (ligne directe, mise en forme `06 12 34 56 78` à l'affichage) ou 4 chiffres (poste interne). Plusieurs numéros : `"8280 / 8295 / 8294"`.
- `mail` : sans espace, ou `""` (aucun lien n'est alors affiché).
- Le tableau est trié par `prenom`.
