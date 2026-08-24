// Harnais commun aux tests. Le noyau du jeu (graphe, solveur, generateur,
// regles) ne touche pas au DOM : il se teste en Node, sans navigateur.

import * as G from '../js/graphe.js';
import * as B from '../js/boucle.js';

export function counter() {
    const etat = { pass: 0, fail: 0 };
    const check = (libelle, condition, detail = '') => {
        if (condition) { etat.pass++; console.log(`  OK    ${libelle}`); }
        else { etat.fail++; console.log(`  ECHEC ${libelle} ${detail}`); }
    };
    const report = () => {
        console.log(`\n${etat.pass} reussis, ${etat.fail} echecs\n`);
        process.exit(etat.fail === 0 ? 0 : 1);
    };
    return { check, report };
}

// Une grille de chiffres ecrite en clair : '.' = case libre.
export function lireChiffres(lignes) {
    const out = [];
    for (const ligne of lignes) {
        for (const caractere of ligne) out.push(caractere === '.' ? -1 : caractere.charCodeAt(0) - 48);
    }
    return out;
}

export function memeEtat(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

// Un motif ASCII ou '#' marque une case a l'interieur de la boucle. Le contour
// d'une telle region est la boucle.
//
// La verification qui suit refait a la main ce que region.js sait deja faire :
// c'est voulu. Un controleur qui partagerait son code avec ce qu'il controle ne
// controle rien.
export function contourDeRegion(motif) {
    const H = motif.length, L = motif[0].length;
    const graphe = G.creerGraphe(L, H);
    const dedans = (r, c) => r >= 0 && c >= 0 && r < H && c < L && motif[r][c] === '#';
    const etat = new Int8Array(graphe.nbAretes).fill(B.CROIX);
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < L; c++) {
            if (!dedans(r, c)) continue;
            if (!dedans(r - 1, c)) etat[graphe.areteH(r, c)] = B.TRAIT;
            if (!dedans(r + 1, c)) etat[graphe.areteH(r + 1, c)] = B.TRAIT;
            if (!dedans(r, c - 1)) etat[graphe.areteV(r, c)] = B.TRAIT;
            if (!dedans(r, c + 1)) etat[graphe.areteV(r, c + 1)] = B.TRAIT;
        }
    }
    return { ...verifierCycle(graphe, etat), graphe, etat, L, H };
}

// Degre 0 ou 2 partout, et un seul cycle.
export function verifierCycle(graphe, etat) {
    let nbTraits = 0, depart = -1;
    const degre = new Int32Array(graphe.nbPoints);
    for (let e = 0; e < graphe.nbAretes; e++) {
        if (etat[e] !== B.TRAIT) continue;
        nbTraits++;
        degre[graphe.aretePoints[e * 2]]++;
        degre[graphe.aretePoints[e * 2 + 1]]++;
        if (depart < 0) depart = graphe.aretePoints[e * 2];
    }
    if (nbTraits < 4) return { valide: false, raison: 'pas assez d aretes' };
    for (let p = 0; p < graphe.nbPoints; p++) {
        if (degre[p] !== 0 && degre[p] !== 2) return { valide: false, raison: 'point de degre ' + degre[p] };
    }
    let vus = 0, courant = depart, arriveePar = -1;
    do {
        vus++;
        let suivant = -1, parArete = -1;
        for (let d = 0; d < 4; d++) {
            const e = graphe.pointAretes[courant * 4 + d];
            if (e >= 0 && etat[e] === B.TRAIT && e !== arriveePar) {
                suivant = graphe.autreBout(e, courant); parArete = e; break;
            }
        }
        if (suivant < 0) return { valide: false, raison: 'chemin interrompu' };
        arriveePar = parArete; courant = suivant;
    } while (courant !== depart && vus <= nbTraits);
    if (vus !== nbTraits) return { valide: false, raison: 'plusieurs boucles' };
    return { valide: true, longueur: nbTraits };
}
