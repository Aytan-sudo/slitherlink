// Les paliers de difficulte, et leurs noms. C'est le solveur qui mesure le
// niveau (voir analyser dans boucle.js) ; ici on ne fait que le nommer et
// l'expliquer, pour que l'interface n'ait pas a connaitre les chiffres.

// Les cinq paliers de difficulte. Le nom decrit la technique, pas le
// nombre de chiffres : c'est la seule mesure qui veut dire quelque chose.
const NIVEAUX = {
    0: { nom: 'Indeterminee', classe: 'inconnu', detail: 'Cette grille n\'a pas exactement une solution.' },
    1: { nom: 'Point simple', classe: 'facile', detail: 'Les chiffres et le degre des points suffisent, case par case.' },
    2: { nom: 'Fil tendu', classe: 'moyen', detail: 'Il faut suivre les fils : refuser une arete qui refermerait une boucle trop tot.' },
    3: { nom: 'Essai court', classe: 'difficile', detail: 'Il faut supposer une arete et constater qu\'elle se contredit.' },
    4: { nom: 'Essai double', classe: 'expert', detail: 'Il faut imbriquer deux hypotheses avant de trancher.' },
    5: { nom: 'Retour arriere', classe: 'expert', detail: 'Au-dela de deux hypotheses imbriquees : a resoudre au flair.' }
};

// indices : tableau de L*H valeurs, -1 pour une case libre, 0 a 3 sinon.
// Les motifs retenus par defaut sont ceux qui ont survecu au croisement
// avec l'enumeration exhaustive (voir tests/cas.js).

function decrireNiveau(niveau) {
    return NIVEAUX[niveau] || NIVEAUX[0];
}

export { NIVEAUX, decrireNiveau };
