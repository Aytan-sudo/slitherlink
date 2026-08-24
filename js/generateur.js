// Fabrication des grilles. On ne tire pas une grille au hasard en esperant
// qu'elle soit bonne : on part d'une boucle valide par construction, on en
// deduit tous les chiffres, puis on efface.

import * as G from './graphe.js';
import * as B from './boucle.js';
import * as Region from './region.js';
import { creerContraintes, chiffresDepuisEtat } from './slitherlink.js';
import { decrireNiveau } from './difficulte.js';

const TRAIT = B.TRAIT;

// On ne tire pas une grille au hasard en esperant qu'elle soit bonne : on
// part d'une boucle valide par construction, on en deduit tous les
// chiffres, puis on efface.
//
// Le critere d'effacement est la cle. Compter les solutions pour verifier
// l'unicite oblige a explorer tout l'arbre de recherche a chaque retrait,
// et c'est ce qui rendait la generation interminable en 10x10. On demande
// plutot que la grille reste resoluble PAR DEDUCTION a la force visee :
// c'est plus rapide, ca garantit l'unicite sans avoir a la prouver
// (une deduction ne pose que des aretes forcees), et ca garantit en prime
// que la grille est faisable par un joueur a ce niveau-la - ce qu'un
// simple test d'unicite ne dit pas du tout.
function generer(L, H, alea, options) {
    options = options || {};
    const niveau = Math.max(1, Math.min(4, options.niveau || 3));
    const graphe = G.creerGraphe(L, H);
    const longueurMini = options.longueurMini || Math.max(8, L + H);

    let etatSolution = null, verif = null;
    for (let essai = 0; essai < 60; essai++) {
        const region = Region.tirerRegion(L, H, alea, options);
        const candidat = Region.contour(graphe, region.dedans);
        const controle = Region.verifierBoucle(graphe, candidat);
        // Une boucle trop courte fait une grille sans interet.
        if (controle.valide && (controle.longueur >= longueurMini || essai > 40)) {
            etatSolution = candidat; verif = controle; break;
        }
    }
    if (!etatSolution) return null;

    const chiffres = Array.from(chiffresDepuisEtat(graphe, etatSolution));
    const contraintesAvec = (c) => creerContraintes(L, H, c, { graphe: graphe });

    // La grille complete doit deja etre resoluble a la force visee. Si le
    // niveau demande est trop faible pour cette boucle, autant le savoir
    // tout de suite plutot qu'apres cent effacements.
    if (!B.resoudreParDeduction(contraintesAvec(chiffres), niveau)) return null;

    const ordre = alea.melanger(chiffres.map(function (_, i) { return i; }));
    for (let i = 0; i < ordre.length; i++) {
        const f = ordre[i], garde = chiffres[f];
        chiffres[f] = -1;
        if (!B.resoudreParDeduction(contraintesAvec(chiffres), niveau)) chiffres[f] = garde;
    }

    // Controle de sortie. La deduction n'ayant pose que des aretes forcees,
    // l'unicite est acquise ; ce qui reste a verifier, c'est que la
    // solution deduite est bien la boucle dont on est parti. Si une regle
    // de propagation etait fausse, c'est ici que ca se verrait.
    const contraintes = contraintesAvec(chiffres);
    const deduite = B.resoudreParDeduction(contraintes, niveau);
    if (!deduite) return null;
    for (let e = 0; e < graphe.nbAretes; e++) {
        if ((deduite[e] === TRAIT) !== (etatSolution[e] === TRAIT)) return null;
    }

    const bilan = B.analyser(contraintes, { solutions: 1, plafond: niveau });
    return {
        L: L, H: H,
        chiffres: chiffres,
        solution: etatSolution,
        longueurBoucle: verif.longueur,
        nbChiffres: chiffres.filter(function (n) { return n >= 0; }).length,
        niveau: bilan.niveau,
        difficulte: decrireNiveau(bilan.niveau)
    };
}

// Un tirage peut echouer (boucle trop courte, region trop simple pour le
// niveau demande) : ce n'est pas une raison pour rendre la main.
function genererSur(L, H, alea, options) {
    for (let essai = 0; essai < 40; essai++) {
        const grille = generer(L, H, alea, options);
        if (grille) return grille;
    }
    return null;
}

export { generer, genererSur };
