import { defiDuJour, jourDe, veilleDe, texteDePartage, SEMAINE } from '../js/defi.js';
import { genererSur } from '../js/generateur.js';
import { creerHasard } from '../js/hasard.js';
import { counter, memeEtat } from './harness.mjs';

const { check, report } = counter();
console.log('\nDefi du jour\n');

// ---------------------------------------------------------------- la date

check('la date s ecrit en AAAA-MM-JJ', jourDe(new Date(2026, 7, 24)) === '2026-08-24', jourDe(new Date(2026, 7, 24)));
check('les mois et les jours sont sur deux chiffres', jourDe(new Date(2026, 0, 5)) === '2026-01-05');

// Le piege de toISOString : a Paris, une minute apres minuit, UTC est encore
// la veille. Le defi changerait de grille en cours de soiree.
check('minuit et une passe bien au jour d apres',
    jourDe(new Date(2026, 7, 24, 0, 1)) === '2026-08-24');
check('vingt-trois heures cinquante-neuf reste le meme jour',
    jourDe(new Date(2026, 7, 24, 23, 59)) === '2026-08-24');

check('la veille du premier janvier est le trente-et-un decembre',
    veilleDe('2026-01-01') === '2025-12-31', veilleDe('2026-01-01'));
check('la veille du premier mars 2028 est le vingt-neuf fevrier',
    veilleDe('2028-03-01') === '2028-02-29', veilleDe('2028-03-01'));
check('la veille du premier avril est le trente-et-un mars',
    veilleDe('2026-04-01') === '2026-03-31', veilleDe('2026-04-01'));

// ------------------------------------------------------------ la meme grille

// Sans ca, le defi ne veut rien dire : deux joueurs compareraient des resultats
// obtenus sur des grilles differentes.
{
    const date = new Date(2026, 7, 24, 9, 30);
    const memeJourPlusTard = new Date(2026, 7, 24, 22, 15);
    const a = defiDuJour(date), b = defiDuJour(memeJourPlusTard);
    check('le defi ne change pas au fil de la journee',
        a.graine === b.graine && a.taille === b.taille && a.niveau === b.niveau);

    const grilleA = genererSur(a.taille, a.taille, creerHasard(a.graine), { niveau: a.niveau });
    const grilleB = genererSur(b.taille, b.taille, creerHasard(b.graine), { niveau: b.niveau });
    check('et il produit bien la grille identique',
        memeEtat(grilleA.chiffres, grilleB.chiffres) && memeEtat(grilleA.solution, grilleB.solution));
}

{
    const veille = defiDuJour(new Date(2026, 7, 23));
    const jour = defiDuJour(new Date(2026, 7, 24));
    check('deux jours differents donnent deux graines differentes', veille.graine !== jour.graine);
}

// ------------------------------------------------------------- la semaine

check('les sept jours de la semaine sont prevus', SEMAINE.length === 7);
check('chaque jour a une taille et un niveau jouables',
    SEMAINE.every((forme) => forme.taille >= 5 && forme.taille <= 12 && forme.niveau >= 1 && forme.niveau <= 4));

// La difficulte monte du lundi au samedi : c'est la promesse faite au joueur.
{
    const lundiAuSamedi = SEMAINE.slice(1);
    let monte = true;
    for (let i = 1; i < lundiAuSamedi.length; i++) {
        if (lundiAuSamedi[i].niveau < lundiAuSamedi[i - 1].niveau) monte = false;
    }
    check('la difficulte ne redescend jamais du lundi au samedi', monte,
        lundiAuSamedi.map((f) => f.niveau).join(''));
    check('le lundi est le jour le plus doux',
        SEMAINE[1].niveau === Math.min(...SEMAINE.map((f) => f.niveau)));
}

// Une semaine entiere doit se fabriquer sans echec ni lenteur excessive.
{
    let echecs = 0, plusLent = 0;
    for (let jour = 0; jour < 7; jour++) {
        const defi = defiDuJour(new Date(2026, 7, 23 + jour));
        const debut = Date.now();
        const grille = genererSur(defi.taille, defi.taille, creerHasard(defi.graine), { niveau: defi.niveau });
        plusLent = Math.max(plusLent, Date.now() - debut);
        if (!grille || grille.niveau > defi.niveau) echecs++;
    }
    check('les sept defis de la semaine se fabriquent tous', echecs === 0, echecs);
    check('le plus lent reste supportable', plusLent < 8000, plusLent + ' ms');
}

// ------------------------------------------------------------- le partage

{
    const grille = { L: 8, H: 8, difficulte: { nom: 'Essai court' } };
    const texte = texteDePartage({ defi: { id: '2026-08-24' }, grille, duree: 252000, gestes: 47, serie: 7 });
    check('le resume porte la date', texte.includes('2026-08-24'), texte);
    check('le resume porte la taille et la difficulte', texte.includes('8×8') && texte.includes('Essai court'));
    check('le resume porte le temps en minutes et secondes', texte.includes('4:12'), texte);
    check('le resume porte la serie', texte.includes('7'), texte);

    // Il doit pouvoir etre colle dans une conversation sans rien devoiler.
    check('le resume ne devoile aucun chiffre de la grille', !/[0-3]{4,}/.test(texte), texte);
    check('le resume tient en quatre lignes', texte.split('\n').length <= 4, texte);

    const libre = texteDePartage({ defi: null, grille, duree: 60000, gestes: 12, serie: 0 });
    check('une grille libre se partage aussi', libre.includes('grille libre'), libre);
    check('sans serie, rien ne s affiche a son sujet', !libre.includes('série'), libre);
}

report();
