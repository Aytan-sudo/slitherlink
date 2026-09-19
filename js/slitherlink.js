// Les regles propres au Slitherlink : les chiffres, et ce qu'on peut en
// deduire. Tout ce qui concerne la boucle elle-meme vit dans boucle.js et
// ignore ce fichier - c'est ce qui permettra d'y brancher Masyu.

import * as G from './graphe.js';
import * as B from './boucle.js';

const HAUT = G.HAUT, DROITE = G.DROITE, BAS = G.BAS, GAUCHE = G.GAUCHE;
const TRAIT = B.TRAIT, CROIX = B.CROIX, INCONNU = B.INCONNU;

// Un motif faux ne se voit pas a l'oeil nu : il fabrique en silence des
// grilles insolubles. Chacun de ceux-ci a ete confronte seul a
// l'enumeration exhaustive (tests/reference.mjs).
//
// Motif ecarte : "l'arete partagee entre deux 3 est tracee". Elle a l'air
// evidente et elle est fausse. Contre-exemple minimal, une grille 2x2 de
// chiffres 3 3 / 1 . : la solution est le rectangle qui englobe les deux 3,
// et leur arete commune n'y est pas.
const MOTIFS_PAR_DEFAUT = ['coin3', 'coin1', 'troisAdjacents', 'troisDiagonaux'];

function creerContraintes(L, H, indices, options) {
    const graphe = (options && options.graphe) || G.creerGraphe(L, H);
    const chiffres = Int8Array.from(indices);

    // Coherence locale d'une case. Le comptage brut (autant de tracees que
    // le chiffre) ne voit qu'une partie de ce qu'un joueur lit d'un coup
    // d'oeil : il regarde aussi les quatre coins de la case, ou le fil doit
    // pouvoir passer ou ne pas passer.
    //
    // Plutot que d'ecrire ces cas a la main - on a vu ce que ca donne - on
    // enumere les 16 facons de remplir les 4 aretes, on jette celles qui
    // contredisent le chiffre, l'etat connu, ou le degre possible d'un coin,
    // et toute arete qui vaut pareil dans tout ce qui reste est forcee.
    const COINS = G.COINS_ARETES;

    function regleCase(r, f) {
        const n = chiffres[f];
        if (n < 0) return true;
        const t = r.caseTrait[f], u = r.caseInconnu[f];
        if (t > n) return false;
        if (t + u < n) return false;
        if (u === 0) return true;

        // Chemin rapide : le comptage seul tranche dans la grande majorite
        // des cas, et il ne coute rien.
        if (t === n || t + u === n) {
            const valeur = (t === n) ? CROIX : TRAIT;
            for (let d = 0; d < 4; d++) {
                const e = graphe.caseAretes[f * 4 + d];
                if (r.etat[e] === INCONNU && !B.poser(r, e, valeur)) return false;
            }
            return true;
        }

        const aretes = [
            graphe.caseAretes[f * 4], graphe.caseAretes[f * 4 + 1],
            graphe.caseAretes[f * 4 + 2], graphe.caseAretes[f * 4 + 3]
        ];
        // Ce que les coins voient en dehors de cette case : les fils deja
        // poses et les aretes encore libres qui n'appartiennent pas a la case.
        const extTrait = [0, 0, 0, 0], extInconnu = [0, 0, 0, 0];
        for (let k = 0; k < 4; k++) {
            const p = graphe.caseCoins[f * 4 + k];
            let dedansTrait = 0, dedansInconnu = 0;
            for (let j = 0; j < 2; j++) {
                const etatArete = r.etat[aretes[COINS[k][j]]];
                if (etatArete === TRAIT) dedansTrait++;
                else if (etatArete === INCONNU) dedansInconnu++;
            }
            extTrait[k] = r.degTrait[p] - dedansTrait;
            extInconnu[k] = r.degInconnu[p] - dedansInconnu;
        }

        let peutTrait = 0, peutCroix = 0, combinaisons = 0;
        for (let masque = 0; masque < 16; masque++) {
            let compte = 0, possible = true;
            for (let d = 0; d < 4 && possible; d++) {
                const pris = (masque >> d) & 1;
                if (pris) compte++;
                const etatArete = r.etat[aretes[d]];
                if (etatArete === TRAIT && !pris) possible = false;
                else if (etatArete === CROIX && pris) possible = false;
            }
            if (!possible || compte !== n) continue;
            for (let k = 0; k < 4 && possible; k++) {
                // Combien de fils cette case amene-t-elle dans ce coin,
                // et le degre du point peut-il encore valoir 0 ou 2 ?
                const apport = ((masque >> COINS[k][0]) & 1) + ((masque >> COINS[k][1]) & 1);
                const total = apport + extTrait[k];
                const versDeux = 2 - total;
                if (!(total === 0 || (versDeux >= 0 && versDeux <= extInconnu[k]))) possible = false;
            }
            if (!possible) continue;
            combinaisons++;
            for (let d = 0; d < 4; d++) {
                if ((masque >> d) & 1) peutTrait |= (1 << d); else peutCroix |= (1 << d);
            }
        }
        if (combinaisons === 0) return false;
        for (let d = 0; d < 4; d++) {
            if (r.etat[aretes[d]] !== INCONNU) continue;
            const bit = 1 << d;
            if ((peutTrait & bit) && !(peutCroix & bit)) { if (!B.poser(r, aretes[d], TRAIT)) return false; }
            else if (!(peutTrait & bit) && (peutCroix & bit)) { if (!B.poser(r, aretes[d], CROIX)) return false; }
        }
        return true;
    }

    function estSatisfait(etat) {
        for (let f = 0; f < chiffres.length; f++) {
            const n = chiffres[f];
            if (n < 0) continue;
            let t = 0;
            for (let d = 0; d < 4; d++) if (etat[graphe.caseAretes[f * 4 + d]] === TRAIT) t++;
            if (t !== n) return false;
        }
        return true;
    }

    const poserD = (r, f, d, v) => B.poser(r, graphe.caseAretes[f * 4 + d], v);
    const coins = [
        [graphe.cellule(0, 0), HAUT, GAUCHE],
        [graphe.cellule(0, L - 1), HAUT, DROITE],
        [graphe.cellule(H - 1, 0), BAS, GAUCHE],
        [graphe.cellule(H - 1, L - 1), BAS, DROITE]
    ];

    // Motifs : deductions qui ne dependent que des chiffres, jamais de
    // l'etat. On les pose une fois au demarrage. Chacun est nomme et
    // activable separement, parce qu'un motif faux ne se voit pas a l'oeil
    // nu : il faut pouvoir le mettre en accusation seul face a
    // l'enumeration exhaustive.
    const MOTIFS = {
        // Un 3 dans un coin de grille : les deux aretes du bord sont
        // tracees. Si l'une manquait, le 3 forcerait les trois autres, et
        // le point du coin - qui n'a que deux aretes - resterait a un seul
        // fil, ce qui est interdit.
        coin3: function (r) {
            for (let i = 0; i < coins.length; i++) {
                const f = coins[i][0];
                if (chiffres[f] !== 3) continue;
                if (!poserD(r, f, coins[i][1], TRAIT)) return false;
                if (!poserD(r, f, coins[i][2], TRAIT)) return false;
            }
            return true;
        },
        // Un 1 dans un coin : les deux memes aretes sont barrees. Si l'une
        // etait tracee, elle serait l'unique arete du 1, et le point du
        // coin se retrouverait a un fil.
        coin1: function (r) {
            for (let i = 0; i < coins.length; i++) {
                const f = coins[i][0];
                if (chiffres[f] !== 1) continue;
                if (!poserD(r, f, coins[i][1], CROIX)) return false;
                if (!poserD(r, f, coins[i][2], CROIX)) return false;
            }
            return true;
        },
        // Deux 3 cote a cote : les deux aretes exterieures paralleles a
        // l'arete partagee sont tracees.
        troisAdjacents: function (r) {
            for (let ligne = 0; ligne < H; ligne++) {
                for (let col = 0; col < L; col++) {
                    if (chiffres[graphe.cellule(ligne, col)] !== 3) continue;
                    if (col + 1 < L && chiffres[graphe.cellule(ligne, col + 1)] === 3) {
                        if (!B.poser(r, graphe.areteV(ligne, col), TRAIT)) return false;
                        if (!B.poser(r, graphe.areteV(ligne, col + 2), TRAIT)) return false;
                    }
                    if (ligne + 1 < H && chiffres[graphe.cellule(ligne + 1, col)] === 3) {
                        if (!B.poser(r, graphe.areteH(ligne, col), TRAIT)) return false;
                        if (!B.poser(r, graphe.areteH(ligne + 2, col), TRAIT)) return false;
                    }
                }
            }
            return true;
        },
        // Deux 3 en diagonale : chacun garde ses deux aretes opposees au
        // coin partage.
        troisDiagonaux: function (r) {
            for (let ligne = 0; ligne < H; ligne++) {
                for (let col = 0; col < L; col++) {
                    const f = graphe.cellule(ligne, col);
                    if (chiffres[f] !== 3) continue;
                    if (ligne + 1 < H && col + 1 < L && chiffres[graphe.cellule(ligne + 1, col + 1)] === 3) {
                        const g2 = graphe.cellule(ligne + 1, col + 1);
                        if (!poserD(r, f, HAUT, TRAIT) || !poserD(r, f, GAUCHE, TRAIT)) return false;
                        if (!poserD(r, g2, BAS, TRAIT) || !poserD(r, g2, DROITE, TRAIT)) return false;
                    }
                    if (ligne + 1 < H && col > 0 && chiffres[graphe.cellule(ligne + 1, col - 1)] === 3) {
                        const g2 = graphe.cellule(ligne + 1, col - 1);
                        if (!poserD(r, f, HAUT, TRAIT) || !poserD(r, f, DROITE, TRAIT)) return false;
                        if (!poserD(r, g2, BAS, TRAIT) || !poserD(r, g2, GAUCHE, TRAIT)) return false;
                    }
                }
            }
            return true;
        }
    };

    const actifs = (options && options.motifs) || MOTIFS_PAR_DEFAUT;

    function pretraitement(r) {
        for (let i = 0; i < actifs.length; i++) {
            const motif = MOTIFS[actifs[i]];
            if (motif && !motif(r)) return false;
        }
        return true;
    }

    return {
        graphe: graphe,
        indices: chiffres,
        L: L, H: H,
        regleCase: regleCase,
        estSatisfait: estSatisfait,
        pretraitement: pretraitement
    };
}

// Chiffres complets d'une boucle donnee : pour chaque case, le nombre de
// ses aretes qui appartiennent a la boucle.

function chiffresDepuisEtat(graphe, etat) {
    const chiffres = new Int8Array(graphe.nbCases);
    for (let f = 0; f < graphe.nbCases; f++) {
        let t = 0;
        for (let d = 0; d < 4; d++) if (etat[graphe.caseAretes[f * 4 + d]] === TRAIT) t++;
        chiffres[f] = t;
    }
    return chiffres;
}

export { creerContraintes, chiffresDepuisEtat, MOTIFS_PAR_DEFAUT };
