import * as G from '../js/graphe.js';
import * as Region from '../js/region.js';
import { creerHasard } from '../js/hasard.js';
import { counter, contourDeRegion } from './harness.mjs';

const { check, report } = counter();
console.log('\nTirage des boucles\n');

// Le generateur ne verifie pas apres coup que le contour d'une region est une
// boucle : il refuse a l'ajout tout ce qui pourrait le casser - le trou, et le
// pincement en diagonale. Reste a prouver que ce refus suffit.
let mauvaises = 0, raison = '', courtes = 0, longueurs = [];
const TOTAL = 800;
for (let i = 0; i < TOTAL; i++) {
    const alea = creerHasard(31000 + i);
    const L = 3 + alea.entier(8), H = 3 + alea.entier(8);
    const graphe = G.creerGraphe(L, H);
    const region = Region.tirerRegion(L, H, alea);
    const etat = Region.contour(graphe, region.dedans);

    // Verifie par le controleur du moteur...
    const controle = Region.verifierBoucle(graphe, etat);
    // ... et par celui des tests, qui ne partage pas une ligne avec lui.
    const motif = [];
    for (let r = 0; r < H; r++) {
        let ligne = '';
        for (let c = 0; c < L; c++) ligne += region.dedans[r * L + c] ? '#' : '.';
        motif.push(ligne);
    }
    const independant = contourDeRegion(motif);

    if (!controle.valide || !independant.valide) {
        mauvaises++;
        if (!raison) raison = `${L}x${H} : ${controle.raison || independant.raison}`;
    } else {
        longueurs.push(controle.longueur);
        if (controle.longueur < 8) courtes++;
    }
}
longueurs.sort((a, b) => a - b);

check(`${TOTAL} regions tirees, autant de boucles simples`, mauvaises === 0, raison);
check('aucune boucle degeneree', courtes === 0, courtes);
check('les boucles sont de taille variee',
    longueurs[0] < longueurs[longueurs.length - 1] / 3,
    `min ${longueurs[0]}, mediane ${longueurs[longueurs.length >> 1]}, max ${longueurs[longueurs.length - 1]}`);

report();
