// Le seul endroit du projet qui produit de l'aleatoire. Tout le reste recoit un
// tirage en parametre : c'est ce qui rend une partie rejouable a l'identique,
// et c'est ce qui permet au defi du jour d'etre le meme pour tout le monde.

// mulberry32 : periode largement suffisante ici, une seule variable d'etat, et
// une distribution honnete sur [0, 1[.
function creerHasard(graine) {
    let etat = graine >>> 0;
    const suivant = function () {
        etat = (etat + 0x6D2B79F5) >>> 0;
        let t = etat;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Entier dans [0, n[.
    suivant.entier = function (n) { return Math.floor(suivant() * n); };
    // Melange de Fisher-Yates, en place.
    suivant.melanger = function (tableau) {
        for (let i = tableau.length - 1; i > 0; i--) {
            const j = suivant.entier(i + 1);
            const t = tableau[i]; tableau[i] = tableau[j]; tableau[j] = t;
        }
        return tableau;
    };
    return suivant;
}

// Graine derivee d'une chaine - une date, un identifiant de partage.
// FNV-1a : court, et stable d'un navigateur a l'autre.
function graineDepuisTexte(texte) {
    let h = 0x811C9DC5;
    for (let i = 0; i < texte.length; i++) {
        h ^= texte.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

// Une graine neuve, pour une grille libre. Passe par crypto plutot que par
// Math.random : ainsi aucun autre fichier du projet n'a de raison d'appeler
// une source d'aleatoire, et la regle « tout est rejouable » se verifie d'un
// simple grep.
function graineAleatoire() {
    const source = globalThis.crypto;
    if (source && source.getRandomValues) {
        return source.getRandomValues(new Uint32Array(1))[0] >>> 0;
    }
    return (Date.now() ^ (Date.now() << 13)) >>> 0;
}

export { creerHasard, graineDepuisTexte, graineAleatoire };
