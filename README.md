# Entre nous

Jeu de couple en français, conçu pour deux adultes sur le même téléphone. L’application fonctionne entièrement dans le navigateur, en HTML, CSS et JavaScript, sans dépendance ni étape de compilation.

## Fonctionnalités

- 120 cartes Action ou Vérité, réparties sur quatre niveaux : Soft, Hot, Hard et Extrême.
- Roue de sélection du joueur, choix direct ou alternance des tours.
- Dés, quiz de couple et minuteur.
- Favoris et création de défis personnels.
- Réglage des prénoms, du mot de pause et du mode « vos défis uniquement ».
- Sauvegarde de la partie dans le navigateur.
- Interface adaptée au téléphone.

## Lancer le jeu

Depuis le dossier du projet, avec Python installé :

```sh
python -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Ouvrir ensuite <http://127.0.0.1:8080> dans le navigateur. Pour arrêter le serveur, appuyer sur `Ctrl+C` dans le terminal.

Le contenu de `dist/` peut aussi être servi par n’importe quel hébergeur de sites statiques. Ce dossier contient directement les sources du jeu ; aucun `npm install` ou build n’est nécessaire.

## Fichiers du projet

```text
.gitignore            Fichiers locaux à exclure de Git
.openai/hosting.json   Configuration du projet Sites existant
README.md             Présentation et instructions
dist/
  index.html          Structure de la page et illustrations SVG intégrées
  styles.css          Apparence et mise en page mobile
  app.js              Navigation, règles du jeu et sauvegarde
  cards.js            Cartes Action ou Vérité
  icon.svg            Icône du jeu
```

Pour modifier les questions et défis intégrés, éditer `dist/cards.js`. Pour changer le fonctionnement ou l’apparence, éditer respectivement `dist/app.js` et `dist/styles.css`.

## Données et sauvegarde

Les prénoms, favoris, défis personnels et la partie en cours sont conservés dans le `localStorage` du navigateur, sous la clé `entre-nous-v1`. La confirmation de majorité est conservée pour la session dans le `sessionStorage`.

Ces données restent propres au navigateur, à l’appareil et à l’adresse du site. Elles ne sont pas enregistrées dans ce dépôt et ne sont pas transférées automatiquement entre le site en ligne et une copie locale. Effacer les données du site dans le navigateur supprime la sauvegarde correspondante.

## Version hébergée

<https://entre-nous-jeu-20261101.kurt-roubain.chatgpt.site>

La version Sites a été publiée en accès privé. Son contrôle d’accès est fourni par l’hébergement ; une copie servie ailleurs utilise les règles d’accès de son propre hébergeur.

## Vérification rapide

Avec Node.js installé, vérifier la syntaxe JavaScript :

```sh
node --check dist/app.js
node --check dist/cards.js
```

Le jeu est réservé aux adultes consentants. Chaque carte peut être passée librement.
