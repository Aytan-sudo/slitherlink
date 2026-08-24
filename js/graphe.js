// Geometrie d'une grille rectangulaire : qui touche quoi.
// Ce fichier ne connait ni chiffre, ni regle, ni pixel : uniquement des
// indices. C'est le socle que Masyu et Hashi reutiliseront tel quel.

// Directions, dans le sens des aiguilles d'une montre. Le meme ordre sert
// aux aretes d'un point et aux aretes d'une case, ce qui evite d'avoir
// deux conventions a retenir.
const HAUT = 0, DROITE = 1, BAS = 2, GAUCHE = 3;

// L colonnes de cases, H lignes de cases.
function creerGraphe(L, H) {
    const nbPoints = (L + 1) * (H + 1);
    const nbCases = L * H;
    const nbHorizontales = (H + 1) * L;
    const nbVerticales = H * (L + 1);
    const nbAretes = nbHorizontales + nbVerticales;

    // Numerotation : les horizontales d'abord, ligne par ligne, puis les
    // verticales. Le decalage est fige une fois pour toutes ici.
    const point = (r, c) => r * (L + 1) + c;
    const areteH = (r, c) => r * L + c;
    const areteV = (r, c) => nbHorizontales + r * (L + 1) + c;
    const cellule = (r, c) => r * L + c;

    const aretePoints = new Int32Array(nbAretes * 2);
    const areteCases = new Int32Array(nbAretes * 2).fill(-1);
    const areteLigne = new Int32Array(nbAretes);
    const areteColonne = new Int32Array(nbAretes);
    const areteHorizontale = new Uint8Array(nbAretes);

    // Quatre emplacements par point, indexes par direction, -1 quand la
    // grille s'arrete la. La vue s'en sert pour la navigation au clavier,
    // le solveur pour parcourir le voisinage : une seule table pour les deux.
    const pointAretes = new Int32Array(nbPoints * 4).fill(-1);
    const pointNbAretes = new Int8Array(nbPoints);
    const caseAretes = new Int32Array(nbCases * 4);
    // Les quatre points d'angle de chaque case, dans l'ordre haut-gauche,
    // haut-droite, bas-droite, bas-gauche.
    const caseCoins = new Int32Array(nbCases * 4);

    for (let r = 0; r <= H; r++) {
        for (let c = 0; c < L; c++) {
            const e = areteH(r, c);
            aretePoints[e * 2] = point(r, c);
            aretePoints[e * 2 + 1] = point(r, c + 1);
            areteCases[e * 2] = r > 0 ? cellule(r - 1, c) : -1;      // au-dessus
            areteCases[e * 2 + 1] = r < H ? cellule(r, c) : -1;      // en dessous
            areteLigne[e] = r; areteColonne[e] = c; areteHorizontale[e] = 1;
        }
    }
    for (let r = 0; r < H; r++) {
        for (let c = 0; c <= L; c++) {
            const e = areteV(r, c);
            aretePoints[e * 2] = point(r, c);
            aretePoints[e * 2 + 1] = point(r + 1, c);
            areteCases[e * 2] = c > 0 ? cellule(r, c - 1) : -1;      // a gauche
            areteCases[e * 2 + 1] = c < L ? cellule(r, c) : -1;      // a droite
            areteLigne[e] = r; areteColonne[e] = c; areteHorizontale[e] = 0;
        }
    }
    for (let r = 0; r <= H; r++) {
        for (let c = 0; c <= L; c++) {
            const p = point(r, c);
            let n = 0;
            if (r > 0) { pointAretes[p * 4 + HAUT] = areteV(r - 1, c); n++; }
            if (c < L) { pointAretes[p * 4 + DROITE] = areteH(r, c); n++; }
            if (r < H) { pointAretes[p * 4 + BAS] = areteV(r, c); n++; }
            if (c > 0) { pointAretes[p * 4 + GAUCHE] = areteH(r, c - 1); n++; }
            pointNbAretes[p] = n;
        }
    }
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < L; c++) {
            const f = cellule(r, c);
            caseAretes[f * 4 + HAUT] = areteH(r, c);
            caseAretes[f * 4 + DROITE] = areteV(r, c + 1);
            caseAretes[f * 4 + BAS] = areteH(r + 1, c);
            caseAretes[f * 4 + GAUCHE] = areteV(r, c);
            caseCoins[f * 4 + 0] = point(r, c);
            caseCoins[f * 4 + 1] = point(r, c + 1);
            caseCoins[f * 4 + 2] = point(r + 1, c + 1);
            caseCoins[f * 4 + 3] = point(r + 1, c);
        }
    }

    return {
        L: L, H: H,
        nbPoints: nbPoints, nbCases: nbCases, nbAretes: nbAretes,
        nbHorizontales: nbHorizontales,
        aretePoints: aretePoints, areteCases: areteCases,
        areteLigne: areteLigne, areteColonne: areteColonne,
        areteHorizontale: areteHorizontale,
        pointAretes: pointAretes, pointNbAretes: pointNbAretes,
        caseAretes: caseAretes, caseCoins: caseCoins,
        point: point, areteH: areteH, areteV: areteV, cellule: cellule,
        pointLigne: (p) => Math.floor(p / (L + 1)),
        pointColonne: (p) => p % (L + 1),
        // L'autre bout d'une arete, vue depuis un de ses points.
        autreBout: function (e, p) {
            const a = aretePoints[e * 2];
            return a === p ? aretePoints[e * 2 + 1] : a;
        }
    };
}

// Pour chaque coin d'une case, les deux aretes de cette case qui s'y
// rejoignent, exprimees dans l'ordre HAUT/DROITE/BAS/GAUCHE.
const COINS_ARETES = [[HAUT, GAUCHE], [HAUT, DROITE], [BAS, DROITE], [BAS, GAUCHE]];

export { creerGraphe, HAUT, DROITE, BAS, GAUCHE, COINS_ARETES };
