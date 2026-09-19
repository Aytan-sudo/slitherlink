// Les paliers de difficulte, et leurs noms. C'est le solveur qui mesure le
// niveau (voir analyser dans boucle.js) ; ici on ne fait que le nommer et
// l'expliquer, pour que l'interface n'ait pas a connaitre les chiffres.

// Les cinq paliers de difficulte. Le nom decrit la technique, pas le
// nombre de chiffres : c'est la seule mesure qui veut dire quelque chose.
// La technique ne dit pas tout : une grille qui demande trente hypotheses
// simples n'est pas le meme jeu qu'une grille qui en demande trois. Le
// budget d'hypotheses (boucle.js) borne ce nombre a la taille de la grille,
// et decrireNiveau rend de quoi l'afficher.
// Les commentaires de ce projet s'ecrivent sans accents ; ces chaines-ci
// s'affichent au joueur, et prennent donc les leurs.
const NIVEAUX = {
    0: { nom: 'Indéterminée', classe: 'inconnu', detail: 'Cette grille n\'a pas exactement une solution.' },
    1: { nom: 'Point simple', classe: 'facile', detail: 'Les chiffres et le degré des points suffisent, case par case.' },
    2: { nom: 'Fil tendu', classe: 'moyen', detail: 'Il faut suivre les fils : refuser une arête qui refermerait une boucle trop tôt.' },
    3: { nom: 'Essai court', classe: 'difficile', detail: 'Il faut poser une hypothèse : supposer une arête, et constater qu\'elle se contredit.' },
    4: { nom: 'Essai double', classe: 'expert', detail: 'Il faut imbriquer deux hypothèses avant de trancher.' },
    5: { nom: 'Retour arrière', classe: 'expert', detail: 'Au-delà de deux hypothèses imbriquées : à résoudre au flair.' }
};

function decrireNiveau(niveau) {
    return NIVEAUX[niveau] || NIVEAUX[0];
}

// La phrase du bandeau. Le nombre d'hypotheses est ce que le joueur ressent
// vraiment : deux grilles « Essai court » de tailles differentes ne lui
// demandent pas le meme travail, autant le lui dire.
function detailDeGrille(grille) {
    const detail = decrireNiveau(grille.niveau).detail;
    if (!grille.essais) return detail;
    return detail + (grille.essais === 1
        ? ' Cette grille en demande une.'
        : ' Cette grille en demande ' + grille.essais + '.');
}

export { NIVEAUX, decrireNiveau, detailDeGrille };
