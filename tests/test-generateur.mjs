import * as B from '../js/boucle.js';
import { creerContraintes } from '../js/slitherlink.js';
import { genererSur } from '../js/generateur.js';
import { creerHasard } from '../js/hasard.js';
import { compterReference } from './reference.mjs';
import { counter, memeEtat } from './harness.mjs';

const { check, report } = counter();
console.log('\nGenerateur\n');

// ------------------------------------------------- unicite, prouvee cette fois

// Le generateur se fie a la deduction pour garantir l'unicite sans la prouver :
// une deduction ne pose que des aretes forcees, donc s'il en existait une
// seconde solution, la deduction n'aurait pas abouti. C'est ce qui le rend
// rapide. Ici on paye le prix de la preuve, une bonne fois, sur des grilles
// assez petites pour que la recherche exhaustive termine.
{
    let produites = 0, nonUniques = 0, horsSolution = 0, horsNiveau = 0, detail = '';
    for (let i = 0; i < 40; i++) {
        const L = 4 + (i % 4), H = 4 + ((i + 2) % 4);
        const niveau = 1 + (i % 4);
        const grille = genererSur(L, H, creerHasard(52000 + i), { niveau });
        if (!grille) continue;
        produites++;

        const capture = {};
        const n = B.compterSolutions(creerContraintes(L, H, grille.chiffres), 2, capture);
        if (n !== 1) { nonUniques++; if (!detail) detail = `${L}x${H} : ${n} solutions`; }
        else if (!memeEtat(capture.etat, grille.solution)) horsSolution++;
        if (grille.niveau > niveau) { horsNiveau++; if (!detail) detail = `niveau ${grille.niveau} pour une demande de ${niveau}`; }
    }
    check(`${produites} grilles produites sans echec`, produites === 40);
    check('toutes a solution unique', nonUniques === 0, detail);
    check('la solution trouvee est bien la boucle de depart', horsSolution === 0);
    check('le niveau demande n est jamais depasse', horsNiveau === 0, detail);
}

// En 4x4 on peut confronter le generateur au juge de paix.
{
    let ecarts = 0, detail = '';
    for (let i = 0; i < 25; i++) {
        const grille = genererSur(4, 4, creerHasard(61000 + i), { niveau: 1 + (i % 3) });
        if (!grille) continue;
        const attendu = compterReference(4, 4, grille.chiffres, 5);
        if (attendu !== 1) { ecarts++; if (!detail) detail = `l enumeration compte ${attendu} solutions`; }
    }
    check('l enumeration confirme l unicite de chaque grille 4x4', ecarts === 0, detail);
}

// ------------------------------------------------------------- rejouabilite

// Sans ca, pas de defi du jour : deux joueurs n'auraient pas la meme grille, et
// un lien de partage ne voudrait rien dire.
{
    let differentes = 0;
    for (let i = 0; i < 12; i++) {
        const a = genererSur(7, 7, creerHasard(70000 + i), { niveau: 3 });
        const b = genererSur(7, 7, creerHasard(70000 + i), { niveau: 3 });
        if (!(a && b && memeEtat(a.chiffres, b.chiffres) && memeEtat(a.solution, b.solution))) differentes++;
    }
    check('12 graines rejouees donnent 12 fois la meme grille', differentes === 0, differentes);

    const g1 = genererSur(7, 7, creerHasard(70000), { niveau: 3 });
    const g2 = genererSur(7, 7, creerHasard(70001), { niveau: 3 });
    check('deux graines differentes donnent deux grilles differentes', !memeEtat(g1.chiffres, g2.chiffres));
}

// ---------------------------------------------------------- le niveau agit

// Un niveau qui ne changerait rien a la grille produite ne serait qu'une
// etiquette collee apres coup.
{
    const chiffresMoyens = {}, essaisMoyens = {};
    for (let niveau = 1; niveau <= 4; niveau++) {
        let total = 0, essais = 0, n = 0;
        for (let i = 0; i < 6; i++) {
            const grille = genererSur(8, 8, creerHasard(81000 + i), { niveau });
            if (grille) { total += grille.nbChiffres; essais += grille.essais; n++; }
        }
        chiffresMoyens[niveau] = n ? total / n : 0;
        essaisMoyens[niveau] = n ? essais / n : 0;
    }
    check('plus le niveau monte, moins il reste de chiffres',
        chiffresMoyens[1] >= chiffresMoyens[3], JSON.stringify(chiffresMoyens));
    check('un niveau 1 laisse nettement plus de chiffres qu un niveau 4',
        chiffresMoyens[1] - chiffresMoyens[4] >= 2, JSON.stringify(chiffresMoyens));

    // Le nombre de chiffres ne separe plus les niveaux 3 et 4 : le budget
    // arrete l'effacement des deux cotes, et c'est la technique demandee qui
    // les distingue. Ce qui doit tenir, c'est la frontiere des hypotheses.
    check('les deux premiers niveaux ne demandent aucune hypothese',
        essaisMoyens[1] === 0 && essaisMoyens[2] === 0, JSON.stringify(essaisMoyens));
    check('les deux suivants en demandent toujours au moins une',
        essaisMoyens[3] >= 1 && essaisMoyens[4] >= 1, JSON.stringify(essaisMoyens));
}

// --------------------------------------------------------- le budget tient

// La raison d'etre du budget : « Essai court » doit vouloir dire la meme
// chose en 5x5 et en 12x12. Sans lui, la meme etiquette demandait quatre
// hypotheses sur la petite grille et trente-sept sur la grande.
{
    let debordements = 0, sousNiveau = 0, detail = '';
    for (const taille of [5, 7, 10, 12]) {
        const budget = B.budgetEssais({ L: taille, H: taille });
        for (let i = 0; i < 3; i++) {
            const grille = genererSur(taille, taille, creerHasard(83000 + i * 7 + taille), { niveau: 3 });
            if (!grille) continue;
            if (grille.essais > budget) {
                debordements++;
                if (!detail) detail = `${taille}x${taille} : ${grille.essais} hypotheses pour un budget de ${budget}`;
            }
            if (grille.niveau !== 3) { sousNiveau++; if (!detail) detail = `${taille}x${taille} classee ${grille.niveau}`; }
        }
    }
    check('aucune grille ne depasse le budget d hypotheses de sa taille', debordements === 0, detail);
    check('et aucune ne retombe sous le niveau demande', sousNiveau === 0, detail);

    check('le budget suit la taille de la grille',
        B.budgetEssais({ L: 5, H: 5 }) === 5 && B.budgetEssais({ L: 12, H: 12 }) === 12);
}

report();
