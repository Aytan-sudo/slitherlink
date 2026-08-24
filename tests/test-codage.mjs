import * as G from '../js/graphe.js';
import * as C from '../js/codage.js';
import { genererSur } from '../js/generateur.js';
import { creerHasard } from '../js/hasard.js';
import { counter, memeEtat } from './harness.mjs';

const { check, report } = counter();
console.log('\nEncodage des liens\n');

const nbAretesPour = (L, H) => G.creerGraphe(L, H).nbAretes;

// ------------------------------------------------------------- aller-retour

// Le seul test qui compte vraiment : ce qui sort du lien doit etre exactement
// ce qui y est entre, sur de vraies grilles et de vraies parties.
{
    let ecarts = 0, detail = '', plusLong = 0;
    for (let i = 0; i < 30; i++) {
        const taille = 5 + (i % 8);
        const grille = genererSur(taille, taille, creerHasard(90000 + i), { niveau: 1 + (i % 3) });
        if (!grille) continue;

        // Une partie a moitie jouee : des traits, des croix, et des inconnues.
        const alea = creerHasard(1234 + i);
        const etat = new Int8Array(nbAretesPour(grille.L, grille.H));
        for (let e = 0; e < etat.length; e++) {
            const tirage = alea();
            etat[e] = tirage < 0.3 ? 1 : tirage < 0.55 ? 2 : 0;
        }

        const hash = C.encoderLien(grille, etat);
        plusLong = Math.max(plusLong, hash.length);
        const relu = C.lireLien(hash, nbAretesPour);

        const memeGrille = relu && relu.grille.L === grille.L && relu.grille.H === grille.H
            && memeEtat(relu.grille.chiffres, grille.chiffres);
        if (!memeGrille || !memeEtat(relu.etat, etat)) {
            ecarts++;
            if (!detail) detail = `${taille}x${taille} : ${!memeGrille ? 'grille' : 'etat'} abime`;
        }
    }
    check('30 grilles et parties font l aller-retour sans perte', ecarts === 0, detail);
    check('un lien de 12x12 reste envoyable', plusLong < 400, plusLong + ' caracteres');
}

// ------------------------------------------------------------- lisibilite

check('les chiffres restent lisibles dans le lien',
    C.encoderChiffres([2, -1, -1, 3, 0]) === '2b30', C.encoderChiffres([2, -1, -1, 3, 0]));
check('une grille sans aucun chiffre s ecrit en deux lettres',
    C.encoderChiffres(new Array(30).fill(-1)) === 'zd', C.encoderChiffres(new Array(30).fill(-1)));
check('les longues suites de vides se decoupent proprement',
    memeEtat(C.decoderChiffres('zd', 30), new Array(30).fill(-1)));

// --------------------------------------------------------- liens douteux

// Un lien vient de l'exterieur : il n'a aucune raison d'etre cru sur parole.
const douteux = [
    ['vide', ''],
    ['sans grille', '#s=AAAA'],
    ['dimensions absurdes', '#p=900.900.a'],
    ['dimensions negatives', '#p=-5.-5.a'],
    ['trop de chiffres', '#p=2.2.12345'],
    ['pas assez de chiffres', '#p=3.3.12'],
    ['caractere interdit', '#p=2.2.12X4'],
    ['chiffre hors bornes', '#p=2.2.1294'],
    ['texte au hasard', '#p=bonjour']
];
let refuses = 0;
for (const [nom, hash] of douteux) {
    const lu = C.lireLien(hash, nbAretesPour);
    if (lu === null) refuses++;
    else check(`lien refuse : ${nom}`, false, JSON.stringify(lu.grille));
}
check(`les ${douteux.length} liens malformes sont tous refuses`, refuses === douteux.length, refuses);

// Un etat tronque ne doit pas emporter la grille avec lui : on rend la grille
// et on oublie l'etat, plutot que de refuser le lien entier.
{
    const grille = { L: 3, H: 3, chiffres: new Array(9).fill(-1) };
    const lu = C.lireLien('#p=' + C.encoderGrille(grille) + '&s=AA', nbAretesPour);
    check('un etat tronque laisse la grille jouable', lu !== null && lu.etat === null);
}

// L'etat vide ne merite pas d'occuper le lien.
{
    const grille = { L: 3, H: 3, chiffres: new Array(9).fill(-1) };
    const hash = C.encoderLien(grille, new Int8Array(nbAretesPour(3, 3)));
    check('une partie non commencee n alourdit pas le lien', !hash.includes('&s='), hash);
}

report();
