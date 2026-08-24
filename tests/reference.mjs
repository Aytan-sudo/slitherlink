// Implementation de reference : lente, betement exhaustive, mais dont on peut
// verifier la justesse a l'oeil nu. Elle enumere toutes les boucles simples
// d'une grille en explorant le graphe, sans rien savoir des chiffres ni des
// regles de propagation. C'est elle qui arbitre quand le solveur rapide et
// l'intuition se contredisent.

import * as G from '../js/graphe.js';

const cache = new Map();

// Toutes les boucles simples fermees, chacune une seule fois. Une boucle est
// reperee par son plus petit point : on ne part que de lui, on ne visite que
// des points plus grands, et on fige le sens de parcours en exigeant que le
// deuxieme point soit plus petit que le dernier.
export function enumererBoucles(L, H) {
    const cle = L + 'x' + H;
    if (cache.has(cle)) return cache.get(cle);

    const graphe = G.creerGraphe(L, H);
    const boucles = [];
    const visite = new Uint8Array(graphe.nbPoints);
    const chemin = [];
    const aretes = [];

    function explorer(v, depart) {
        for (let d = 0; d < 4; d++) {
            const e = graphe.pointAretes[v * 4 + d];
            if (e < 0) continue;
            const w = graphe.autreBout(e, v);
            if (w === depart) {
                if (aretes.length >= 3 && chemin[1] < chemin[chemin.length - 1]) {
                    boucles.push(Int32Array.from([...aretes, e]));
                }
                continue;
            }
            if (w < depart || visite[w]) continue;
            visite[w] = 1; chemin.push(w); aretes.push(e);
            explorer(w, depart);
            aretes.pop(); chemin.pop(); visite[w] = 0;
        }
    }

    for (let depart = 0; depart < graphe.nbPoints; depart++) {
        visite.fill(0);
        chemin.length = 0; aretes.length = 0;
        visite[depart] = 1; chemin.push(depart);
        explorer(depart, depart);
    }

    // Pour chaque boucle, le nombre d'aretes bordant chaque case : la grille de
    // chiffres complete que cette boucle produirait.
    const profils = boucles.map((boucle) => {
        const dansLaBoucle = new Uint8Array(graphe.nbAretes);
        for (const e of boucle) dansLaBoucle[e] = 1;
        const profil = new Int8Array(graphe.nbCases);
        for (let f = 0; f < graphe.nbCases; f++) {
            let t = 0;
            for (let d = 0; d < 4; d++) if (dansLaBoucle[graphe.caseAretes[f * 4 + d]]) t++;
            profil[f] = t;
        }
        return { boucle, profil };
    });

    const resultat = { graphe, boucles: profils };
    cache.set(cle, resultat);
    return resultat;
}

// Nombre de boucles compatibles avec une grille de chiffres (-1 = case libre).
export function compterReference(L, H, chiffres, limite) {
    const table = enumererBoucles(L, H);
    let n = 0;
    for (const { profil } of table.boucles) {
        let ok = true;
        for (let f = 0; f < chiffres.length; f++) {
            if (chiffres[f] >= 0 && chiffres[f] !== profil[f]) { ok = false; break; }
        }
        if (ok) { n++; if (limite && n >= limite) return n; }
    }
    return n;
}
