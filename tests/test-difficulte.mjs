import * as B from '../js/boucle.js';
import { creerContraintes, chiffresDepuisEtat } from '../js/slitherlink.js';
import { decrireNiveau, NIVEAUX } from '../js/difficulte.js';
import { counter, contourDeRegion } from './harness.mjs';

const { check, report } = counter();
console.log('\nMesure de la difficulte\n');

const contour = contourDeRegion(['###', '###', '###']);
const chiffres = Array.from(chiffresDepuisEtat(contour.graphe, contour.etat));
const bilan = B.analyser(creerContraintes(3, 3, chiffres));

check('une grille unique recoit un niveau nomme',
    bilan.solutions === 1 && bilan.niveau >= 1 && bilan.niveau <= 5, JSON.stringify(bilan));

// Propriete qui doit tenir quoi qu'il arrive : effacer un chiffre ne peut
// qu'enlever des deductions, donc jamais rendre une grille plus facile. Si le
// classement violait ca, il ne mesurerait rien.
let regressions = 0, ou = '';
for (let f = 0; f < 9; f++) {
    const ampute = chiffres.slice();
    ampute[f] = -1;
    const apres = B.analyser(creerContraintes(3, 3, ampute));
    if (apres.solutions === 1 && apres.niveau < bilan.niveau) {
        regressions++;
        if (!ou) ou = `chiffre ${f} : ${bilan.niveau} -> ${apres.niveau}`;
    }
}
check('effacer un chiffre ne rend jamais la grille plus facile', regressions === 0, ou);

const ambigue = B.analyser(creerContraintes(2, 2, new Array(4).fill(-1)));
check('une grille ambigue est signalee comme telle',
    ambigue.solutions === 2 && ambigue.niveau === 0, JSON.stringify(ambigue));

// Le plafond evite de payer les strates profondes quand on sait deja qu'on n'en
// veut pas : il doit rendre le meme verdict tant qu'on reste sous le plafond.
const plafonne = B.analyser(creerContraintes(3, 3, chiffres), { solutions: 1, plafond: 4 });
check('le plafond ne change pas le verdict sous son niveau',
    plafonne.niveau === bilan.niveau, `${plafonne.niveau} vs ${bilan.niveau}`);

check('chaque niveau a un nom, une classe et une explication',
    [0, 1, 2, 3, 4, 5].every((n) => {
        const d = decrireNiveau(n);
        return d && d.nom && d.detail && d.classe;
    }));
check('aucun palier orphelin', Object.keys(NIVEAUX).length === 6, Object.keys(NIVEAUX).length);

report();
