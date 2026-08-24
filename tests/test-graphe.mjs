import * as G from '../js/graphe.js';
import { counter } from './harness.mjs';

const { check, report } = counter();
console.log('\nGeometrie de la grille\n');

const g = G.creerGraphe(4, 3);
check('nombre de points', g.nbPoints === 5 * 4, g.nbPoints);
check('nombre de cases', g.nbCases === 12, g.nbCases);
check('nombre d aretes', g.nbAretes === 4 * 4 + 3 * 5, g.nbAretes);

// ------------------------------------------------------------- coherence

let symetrique = true, coherent = true;
for (let e = 0; e < g.nbAretes; e++) {
    const p = g.aretePoints[e * 2], q = g.aretePoints[e * 2 + 1];
    if (g.autreBout(e, p) !== q || g.autreBout(e, q) !== p) symetrique = false;
    let vuP = false, vuQ = false;
    for (let d = 0; d < 4; d++) {
        if (g.pointAretes[p * 4 + d] === e) vuP = true;
        if (g.pointAretes[q * 4 + d] === e) vuQ = true;
    }
    if (!vuP || !vuQ) coherent = false;
}
check('aretes symetriques', symetrique);
check('tables point/arete coherentes', coherent);

let casesOk = true;
for (let f = 0; f < g.nbCases; f++) {
    const vues = new Set();
    for (let d = 0; d < 4; d++) {
        const e = g.caseAretes[f * 4 + d];
        vues.add(e);
        if (g.areteCases[e * 2] !== f && g.areteCases[e * 2 + 1] !== f) casesOk = false;
    }
    if (vues.size !== 4) casesOk = false;
}
check('chaque case a 4 aretes distinctes qui la reconnaissent', casesOk);

let bords = 0;
for (let e = 0; e < g.nbAretes; e++) {
    if (g.areteCases[e * 2] < 0 || g.areteCases[e * 2 + 1] < 0) bords++;
}
check('aretes de bord = perimetre', bords === 2 * (4 + 3), bords);

// ------------------------------------------------------------------ coins

let coinsOk = true;
for (let f = 0; f < g.nbCases; f++) {
    for (let k = 0; k < 4; k++) {
        const p = g.caseCoins[f * 4 + k];
        // Les deux aretes de la case qui se rejoignent en ce coin doivent bien
        // toutes deux toucher ce point.
        for (const d of G.COINS_ARETES[k]) {
            const e = g.caseAretes[f * 4 + d];
            if (g.aretePoints[e * 2] !== p && g.aretePoints[e * 2 + 1] !== p) coinsOk = false;
        }
    }
}
check('les quatre coins de chaque case touchent les bonnes aretes', coinsOk);

report();
