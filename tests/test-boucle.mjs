import * as B from '../js/boucle.js';
import { creerContraintes, chiffresDepuisEtat } from '../js/slitherlink.js';
import { creerHasard } from '../js/hasard.js';
import { compterReference, enumererBoucles } from './reference.mjs';
import { counter, lireChiffres, memeEtat, contourDeRegion } from './harness.mjs';

const { check, report } = counter();
console.log('\nSolveur\n');

// ------------------------------------------- croisement avec l enumeration

// Une regle de propagation fausse ne se voit pas : elle fabrique en silence des
// grilles insolubles. On confronte donc le solveur a une enumeration exhaustive
// qui ne partage pas une ligne de code avec lui.
{
    const alea = creerHasard(20260820);
    let cas = 0, divergences = 0, premiere = '';
    for (const [L, H, tirages] of [[2, 2, 120], [3, 3, 400], [4, 4, 300]]) {
        const table = enumererBoucles(L, H);
        for (let i = 0; i < tirages; i++) {
            // On part d'une vraie boucle, on en deduit tous les chiffres, puis
            // on en efface au hasard : ce sont exactement les grilles que le
            // generateur produira, y compris les ambigues.
            const modele = table.boucles[alea.entier(table.boucles.length)];
            const chiffres = Array.from(modele.profil);
            const proportion = alea();
            for (let f = 0; f < chiffres.length; f++) if (alea() < proportion) chiffres[f] = -1;

            const attendu = compterReference(L, H, chiffres, 50);
            const obtenu = B.compterSolutions(creerContraintes(L, H, chiffres), 50);
            cas++;
            if (attendu !== obtenu) {
                divergences++;
                if (!premiere) premiere = `${L}x${H} [${chiffres.join(',')}] reference=${attendu} solveur=${obtenu}`;
            }
        }
    }
    check(`${cas} grilles croisees avec l enumeration exhaustive`, divergences === 0, premiere);
}

// ------------------------------------------------------- grilles connues

const CONNUES = [
    { nom: '3x3, la boucle fait tout le tour', motif: ['###', '###', '###'], chiffres: ['212', '101', '212'] },
    { nom: '5x5, un losange', motif: ['..#..', '.###.', '#####', '.###.', '..#..'] },
    { nom: '7x7, une forme quelconque',
      motif: ['..##...', '.####..', '######.', '.#####.', '..####.', '..###..', '...#...'] }
];

for (const cas of CONNUES) {
    const contour = contourDeRegion(cas.motif);
    check(`${cas.nom} : le motif decrit une seule boucle simple`, contour.valide, contour.raison);
    if (!contour.valide) continue;

    const deduits = Array.from(chiffresDepuisEtat(contour.graphe, contour.etat));
    const chiffres = cas.chiffres ? lireChiffres(cas.chiffres) : deduits;
    if (cas.chiffres) {
        check(`${cas.nom} : les chiffres annonces sont ceux de la boucle`, memeEtat(chiffres, deduits), deduits.join(''));
    }

    const capture = {};
    const n = B.compterSolutions(creerContraintes(contour.L, contour.H, chiffres), 2, capture);
    check(`${cas.nom} : solution unique`, n === 1, `trouve ${n}`);
    check(`${cas.nom} : la solution est bien la boucle attendue`, memeEtat(capture.etat, contour.etat));
}

// ---------------------------------------------------- solutions multiples

{
    const vide = new Array(4).fill(-1);
    check('2x2 sans aucun chiffre : le comptage s arrete a 2',
        B.compterSolutions(creerContraintes(2, 2, vide), 2) === 2);
    check('2x2 sans aucun chiffre : 13 boucles au total',
        B.compterSolutions(creerContraintes(2, 2, vide), 99) === 13,
        B.compterSolutions(creerContraintes(2, 2, vide), 99));
    check('la limite est respectee a la lettre',
        B.compterSolutions(creerContraintes(2, 2, vide), 5) === 5);

    // Retirer un seul chiffre de cette grille-la ne suffit jamais a la rendre
    // ambigue : le genre de detail qu'on ne devine pas, et qui justifie de
    // comparer chaque retrait a l'enumeration plutot que de supposer.
    const chiffres = lireChiffres(['212', '101', '212']);
    check('3x3 complete : unique', B.compterSolutions(creerContraintes(3, 3, chiffres), 2) === 1);
    let ambigues = 0, ecarts = 0, exemple = '';
    for (let a = 0; a < 9; a++) {
        for (let b = a + 1; b < 9; b++) {
            const ampute = chiffres.slice();
            ampute[a] = -1; ampute[b] = -1;
            const n = B.compterSolutions(creerContraintes(3, 3, ampute), 20);
            const attendu = compterReference(3, 3, ampute, 20);
            if (n !== attendu) { ecarts++; if (!exemple) exemple = `retraits ${a}+${b} : solveur ${n}, reference ${attendu}`; }
            if (n > 1) ambigues++;
        }
    }
    check('les 36 retraits de paires collent tous a l enumeration', ecarts === 0, exemple);
    check('certaines paires rendent bien la grille ambigue', ambigues > 0, ambigues);
}

// ------------------------------------------------------ deux boucles = zero

{
    // Ces chiffres sont exactement ceux de « deux carres unite opposes ». Tous
    // les chiffres seraient satisfaits, mais il y aurait deux boucles : il ne
    // doit donc y avoir aucune solution.
    const chiffres = lireChiffres(['410', '101', '014']);
    check('le solveur rejette la double boucle',
        B.compterSolutions(creerContraintes(3, 3, chiffres), 5) === 0);
    check('l enumeration exhaustive dit la meme chose',
        compterReference(3, 3, chiffres, 5) === 0);

    // Et au niveau du moteur, deux situations distinctes doivent etre refusees.
    const contraintes = creerContraintes(3, 3, new Array(9).fill(-1));
    const g = contraintes.graphe;
    const carre = (lg, cl) => [g.areteH(lg, cl), g.areteV(lg, cl), g.areteV(lg, cl + 1), g.areteH(lg + 1, cl)];
    const premier = carre(0, 0), second = carre(2, 2);

    // 1. Une boucle qui se referme alors qu'elle porte tous les traits poses
    //    est legitime - c'est la solution. Mais plus rien ne peut s'y ajouter.
    {
        const r = B.creerRecherche(contraintes);
        let toutesPosees = true;
        for (const e of premier) toutesPosees = B.poser(r, e, B.TRAIT) && toutesPosees;
        check('une boucle seule se ferme sans probleme', toutesPosees && r.boucleFermee === true);
        check('plus rien ne peut s ajouter apres la fermeture',
            B.poser(r, second[0], B.TRAIT) === false);
    }

    // 2. Refermer une boucle alors que des traits trainent ailleurs
    //    fabriquerait une deuxieme boucle : c'est refuse a la pose.
    {
        const r = B.creerRecherche(contraintes);
        for (let i = 0; i < 3; i++) B.poser(r, second[i], B.TRAIT);
        for (let i = 0; i < 3; i++) B.poser(r, premier[i], B.TRAIT);
        check('refermer une boucle en laissant des traits ailleurs est refuse',
            B.poser(r, premier[3], B.TRAIT) === false && r.boucleFermee === false);
    }
}

// ------------------------------------------------- le budget d hypotheses

// Un budget epuise est la situation dangereuse du solveur : il arrive en
// plein milieu d'une refutation, la ou un `false` rendu au mauvais endroit
// ferait conclure a une contradiction et poser l'arete opposee. Ce qu'on
// exige ici : quand la deduction s'arrete faute de budget, elle ne rend
// rien ; et quand elle aboutit, quel que soit le budget, c'est sur la vraie
// solution et sur elle seule.
{
    const contour = contourDeRegion([
        '.###.', '##.##', '.###.', '##.##', '.###.'
    ]);
    const complets = Array.from(chiffresDepuisEtat(contour.graphe, contour.etat));

    // Une grille assez creusee pour qu'il faille des hypotheses.
    const alea = creerHasard(4242);
    let chiffres = null, sansBudget = null;
    for (let essai = 0; essai < 200 && !chiffres; essai++) {
        const candidat = complets.slice();
        for (let f = 0; f < candidat.length; f++) if (alea() < 0.55) candidat[f] = -1;
        const c = creerContraintes(5, 5, candidat);
        const libre = B.deduire(c, 3, -1);
        if (libre.etat && libre.essais >= 2 && !B.resoudreParDeduction(c, 2)) {
            chiffres = candidat; sansBudget = libre;
        }
    }
    check('une grille a hypotheses a bien ete trouvee pour l essai', chiffres !== null);

    if (chiffres) {
        // Effacer des chiffres au hasard peut rendre unique une AUTRE boucle
        // que celle de depart : la reference est donc la solution de cette
        // grille-ci, confirmee par l'enumeration.
        const contraintes = creerContraintes(5, 5, chiffres);
        const capture = {};
        const solutions = B.compterSolutions(contraintes, 2, capture);
        const vraie = capture.etat;
        check('sans budget, la deduction aboutit sur la seule solution',
            solutions === 1 && memeEtat(sansBudget.etat, vraie), sansBudget.essais + ' hypotheses');

        const court = B.deduire(contraintes, 3, sansBudget.essais - 1);
        check('un budget trop court ne rend aucun etat', court.etat === null);
        check('et il le dit', court.budgetDepasse === true);

        // Le point qui compte : aucun budget intermediaire ne doit faire
        // sortir une solution differente de la vraie.
        let fausses = 0;
        for (let budget = 0; budget <= sansBudget.essais + 2; budget++) {
            const bilan = B.deduire(contraintes, 3, budget);
            if (bilan.etat && !memeEtat(bilan.etat, vraie)) fausses++;
        }
        check('aucun budget ne fabrique une autre solution', fausses === 0, fausses);

        // Et la mesure suit : sous budget, la grille monte d'un cran.
        const large = B.analyser(contraintes, { solutions: 1, essaisMax: 99 });
        const serre = B.analyser(contraintes, { solutions: 1, essaisMax: sansBudget.essais - 1 });
        check('une grille trop couteuse pour son budget est classee plus haut',
            large.niveau === 3 && serre.niveau > 3, `${large.niveau} puis ${serre.niveau}`);
        check('et le bilan dit combien d hypotheses il a fallu',
            large.essais === sansBudget.essais, `${large.essais} vs ${sansBudget.essais}`);
    }
}

report();
