# Slitherlink

Reliez les points en **une seule boucle fermée**. Un chiffre dans une case dit
combien de ses quatre côtés sont tracés. Les cases vides ne disent rien.

Chaque grille n'a qu'une solution, et c'est garanti par construction — pas par
espoir. HTML, CSS et JavaScript natifs, modules ES chargés directement par le
navigateur. Aucune dépendance, aucune compilation, aucun bundler.

## Version 1.1.3

Annuler et Refaire restent à l'écran sur un petit téléphone. Safari d'iOS 26 ne
laisse que 549 px de haut sur un iPhone SE : le plateau y prenait toute la
largeur et poussait la rangée Annuler / Refaire / lien sous la barre du
navigateur — il fallait défiler pour annuler un trait, au milieu d'une partie.
Sous 640 px de hauteur, en portrait, le plateau se plafonne à la hauteur qui
reste. Les réglages (taille, difficulté, nouvelle grille) demandent encore un
défilement, ce qui est leur place.

Trouvé dans le simulateur iOS de Xcode : les profils de Playwright annoncent
667 px pour ce téléphone, sans compter la barre de Safari.

## Version 1.1.2 — Passeport 1.6.0

Module commun du passeport 1.6.0 : Polyominos et Mosaïcomino rejoignent le thème
Logique. Rien ne change dans le jeu.

## Version 1.1.1 — Passeport 1.5.0

Module commun du passeport 1.5.0 : L’Architecte et Solitaire rejoignent le thème
Logique, et les jeux raccordés plus tard entrent d’office dans les profils. Rien
ne change dans le jeu.

## Version 1.1.0 — Le passeport commun

Ouvert depuis le hub avec un passeport, le jeu range la série et la partie en
cours dans l’espace du joueur ; en mode invité, rien ne change. Une boucle
fermée donne le tampon **Logique** tout de suite ; sinon, trente traits posés
dans la journée, sur une ou plusieurs grilles, le donnent aussi. Le lien copié
porte la grille, jamais le profil. Le zoom tactile est verrouillé comme le veut
la convention. Les fichiers `commun/` viennent du hub et sont précachés.

## Version 1.0.1

- les cibles tactiles de l'interface passent à 44 px (boutons d'en-tête,
  boutons texte, listes déroulantes), conformément à la convention.
- les arêtes du maillage déclarent leur exemption (`data-cible-libre`) : les
  élargir les ferait chevaucher ;
- les listes déroulantes reçoivent une hauteur ferme — WebKit ignore
  `min-height` sur un `select` natif et les rendait à 22 px sur iPhone.

## Jouer

```bash
npm run serve      # puis http://localhost:8765
```

Il faut passer par un serveur, même en local : les modules ES sont refusés
depuis `file://` pour cause d'origine opaque, et un double-clic sur `index.html`
ne donne qu'une page blanche. `serve.mjs` est un serveur statique de soixante
lignes, sans aucune dépendance.

- **Tap ou clic** sur une arête : trait, puis croix, puis rien.
- **Glisser** : trace toute une suite d'arêtes d'un coup. C'est le geste qui
  compte sur téléphone.
- **Flèches** pour se déplacer, **Espace** pour tracer, **X** pour barrer.
- **Ctrl+Z** annule, **Ctrl+Maj+Z** refait, sans limite. Un glissé compte pour
  un seul geste.

Le **défi du jour** s'ouvre au lancement : une grille dérivée de la date, la
même pour tout le monde, sans que rien ne soit hébergé — le générateur la
refabrique à l'identique chez chacun à partir de la seule graine du jour. La
difficulté monte au fil de la semaine, comme les mots croisés des journaux : on
commence tranquillement le lundi, on transpire le dimanche.

Le bouton 🔗 copie un lien vers la grille et la partie en cours. La barre
d'adresse est d'ailleurs toujours ce lien : elle suit chaque geste.

La victoire se détecte toute seule. Il n'y a pas de bouton « vérifier », et
c'est délibéré : la grille vous dit déjà tout ce qu'il faut savoir — un chiffre
satisfait s'estompe, un chiffre dépassé passe au rouge à l'instant même.

La croix ne sert à rien pour le jeu. Elle sert à vous : c'est le repère au
crayon qui dit « pas ici », pour ne pas y revenir.

## Les difficultés

Le nombre de chiffres ne dit rien de la difficulté d'une grille. Le solveur la
classe donc selon **la technique la plus avancée qu'il a fallu employer** pour
la résoudre.

| niveau | nom | ce qu'il faut savoir faire |
|---|---|---|
| 1 | Point simple | les chiffres et le degré des points, case par case |
| 2 | Fil tendu | en plus, la connexité : refuser une arête qui refermerait une boucle trop tôt |
| 3 | Essai court | supposer une arête, et constater qu'elle se contredit |
| 4 | Essai double | imbriquer deux hypothèses avant de trancher |
| 5 | Retour arrière | au-delà — le générateur n'en produit jamais |

Ce classement est aussi le **critère de fabrication**. On efface un chiffre, et
on le garde effacé tant que la grille reste résoluble *par déduction* à la force
visée. Demander le niveau 1 donne donc une grille réellement faisable de tête ;
demander le niveau 4 donne une grille où il faudra parier.

## Le dessin

Sashiko — la broderie japonaise au fil continu. Un fil écru qui court en points
de piqûre sur une toile teinte à l'indigo, entre des repères pointés à
intervalle régulier, et qui dessine des motifs fermés. C'est un Slitherlink en
textile : la grille de points, le segment entre deux points, la boucle qui se
referme.

| | | |
|---|---|---|
| `--indigo` | `#16233F` | la toile |
| `--indigo-clair` | `#22355C` | panneaux et boutons |
| `--ecru` | `#F0E7D8` | le fil |
| `--craie` | `#7E92B4` | les repères pointés, les croix |
| `--garance` | `#D8503F` | le chiffre dépassé |
| `--safran` | `#E8B54A` | la boucle achevée, le focus |

Un serif porte la voix, un monospace porte les nombres : un chiffre dans une
case est une donnée, il ne doit pas danser quand le chrono tourne. Les deux
familles sont des piles système, rien n'est téléchargé.

Une arête tracée n'est pas un trait plein mais un `stroke-dasharray` calé sur la
longueur de l'arête, bouts arrondis, débordant légèrement sur les nœuds : une
couture, pas un fil de fer. Le seul endroit où l'on dépense de l'animation est
la boucle achevée — l'aiguille en fait le tour, le fil passe à l'or, puis se
tend. `prefers-reduced-motion` remplace tout ça par un fondu.

## Comment c'est fait

```
index.html            appelle app.js, aucune logique
css/style.css         toutes les couleurs en variables CSS
js/
  hasard.js             le seul générateur pseudo-aléatoire du projet
  graphe.js             géométrie : points ↔ arêtes ↔ cases
  boucle.js             le moteur : propagation, connexité, comptage, difficulté
  region.js             tirage d'une boucle valide par construction
  difficulte.js         les paliers et leurs noms
  slitherlink.js        les règles des chiffres
  generateur.js         fabrication des grilles
  codage.js             grille et partie encodées pour un lien
  defi.js               le défi du jour, et le résumé partageable
  stockage.js           la série et la partie en cours
  vue.js                rendu SVG
  gestes.js             pointeur et clavier
  historique.js         annuler / refaire
  ui.js                 les poignées sur le document
  app.js                assemblage
tests/                exécutables en Node, sans navigateur
sw.js                 service worker, jouable hors ligne
serve.mjs             serveur statique sans dépendance
```

### Le moteur ignore les chiffres

`boucle.js` ne sait pas ce qu'est un chiffre. Il sait qu'une solution est un
ensemble d'arêtes formant une seule boucle simple fermée, et il reçoit le reste
de l'extérieur : une variante lui fournit un objet
`{ graphe, regleCase, estSatisfait, pretraitement }`.

C'est ce qui permettra d'ajouter **Masyu** dans un `js/masyu.js` — mêmes
boucles, mais des contraintes sur les points (les perles) au lieu des cases —
sans toucher au moteur. **Hashi** réutiliserait `graphe.js` et l'union-find de
`boucle.js`, mais en branchant un moteur de degrés multiples à la place de la
contrainte degré ∈ {0, 2}.

Rien de tout ça ne touche au DOM. Le noyau se teste entièrement en Node.

### Le solveur

Deux choix de mise en œuvre gouvernent tout le fichier. Une arête ne passe
jamais de « tracée » à « barrée » : elle quitte l'état inconnu une seule fois,
donc annuler une pose se résume à la remettre à inconnu, et la pile d'annulation
ne stocke qu'un entier par pose. Et rien n'est jamais recopié : la recherche
travaille sur un seul état — pose, propage, défait.

Les règles de case ne sont pas des motifs écrits à la main. Pour chaque case, on
énumère les seize façons de remplir ses quatre arêtes, on jette celles qui
contredisent le chiffre, l'état connu, ou le degré possible d'un des quatre
coins, et toute arête qui vaut pareil dans tout ce qui reste est forcée. C'est
mécanique, et ça se démontre.

L'unicité, elle, n'est jamais prouvée par énumération pendant la fabrication :
une déduction ne pose que des arêtes forcées, donc si la déduction aboutit,
c'est qu'il n'y avait pas d'autre solution. Prouver l'unicité par recherche
exhaustive à chaque effacement prenait 890 ms par grille en 10×10 ; la même
grille sort aujourd'hui en 10 ms.

### Ce qui protège le solveur

Une règle de propagation fausse ne se voit pas. Elle ne plante pas : elle
fabrique en silence des grilles insolubles. La suite de tests confronte donc le
solveur à une **énumération exhaustive** de toutes les boucles simples, écrite
séparément et sans une ligne commune (`tests/reference.mjs`). Elle compte 1, 13,
213 et 9349 boucles sur les grilles 1×1 à 4×4 — la suite OEIS A140517.

C'est ce croisement qui a réfuté un motif écrit à la main qui semblait évident :
*« l'arête partagée entre deux 3 est tracée »*. Elle ne l'est pas. Contre-exemple
minimal, une grille 2×2 de chiffres `3 3 / 1 ·` : la solution est le rectangle
qui englobe les deux 3, et leur arête commune n'y figure pas.

## Développement

```bash
npm test           # toute la suite, en Node, sans navigateur
npm run serve      # http://localhost:8765
PORT=8766 npm run serve
```

Dix fichiers de test, un par responsabilité. `test-palette.mjs` compare les
variables CSS à la palette de référence et refuse toute couleur écrite en dur
hors de `:root`, y compris dans le manifeste et la balise `theme-color`.
`test-page.mjs` vérifie que le service worker liste bien tous les modules — le
piège classique étant d'ajouter un fichier, de le voir marcher en ligne, et de
casser le hors-ligne sans que rien ne le signale.

## Ce qui n'est pas là

- **Pas de variantes.** Masyu et Hashi ont leur place dans l'architecture, pas
  une ligne de code.
- **Une seule partie sauvegardée à la fois.** Ouvrir une grille libre par-dessus
  un défi du jour entamé perd le défi. Le lien reste, lui, valable.
- **La série est locale.** Elle vit dans ce navigateur, sur cette machine. Vider
  les données du site la remet à zéro, et il n'y a pas de classement — rien ne
  quitte votre machine, aucun serveur n'est appelé.
- **Le lien peut être long.** Une partie de 12×12 bien avancée tient en environ
  330 caractères. Cela passe partout, mais ce n'est pas joli.
- **Pas d'indice, pas de bouton « vérifier ».** Assumé : la grille signale déjà
  les chiffres satisfaits et dépassés, et un solveur qui joue à votre place n'a
  pas d'intérêt.
- **Les croix ne se déduisent pas toutes seules.** Quand un chiffre est
  satisfait, ses arêtes restantes ne se barrent pas automatiquement. C'est le
  travail du joueur.
- **Le niveau « Essai double » est lent à fabriquer** : environ deux secondes en
  12×12, contre vingt-cinq millisecondes pour « Essai court ». Un voile prévient
  pendant la couture.
- **Au-delà du 7×7, un écran de 390 px descend sous les 44 px par case.** Le jeu
  ouvre donc sur du 7×7 sur écran étroit (45 px par case) et du 10×10 au-delà.
  Les grandes grilles restent jouables au doigt, mais moins confortablement.
- **Le défi du jour dépend de l'horloge de la machine.** Reculer la date de son
  téléphone rejoue un ancien défi. C'est un jeu solitaire sans classement : le
  vérifier coûterait un serveur pour empêcher quelqu'un de se tricher lui-même.
- **Un seul thème.** Pas de bascule clair/sombre : le parti pris est un objet
  textile, il n'a pas de version claire.
- **La difficulté est relative au solveur.** « Essai court » veut dire « il faut
  une hypothèse que *ce* solveur ne sait pas éviter ». Un joueur qui connaît un
  motif de plus la trouvera plus facile. C'est une mesure honnête, pas une
  vérité absolue.
