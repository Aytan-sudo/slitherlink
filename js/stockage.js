// Ce qui survit a la fermeture de l'onglet : la serie de jours reussis, et la
// partie en cours.
//
// Toutes les fonctions acceptent un coffre en parametre. C'est ce qui permet de
// les tester en Node, ou localStorage n'existe pas, et ce qui evite de planter
// en navigation privee, ou il existe mais refuse d'ecrire.

import { veilleDe } from './defi.js';

const CLE_SERIE = 'slitherlink.serie';
const CLE_PARTIE = 'slitherlink.partie';

// Un coffre en memoire : ni le navigateur prive ni Node ne nous laissent
// ecrire, et une partie qu'on ne peut pas sauvegarder vaut mieux qu'une page
// qui plante.
function coffreEnMemoire() {
    const contenu = new Map();
    return {
        getItem: (cle) => (contenu.has(cle) ? contenu.get(cle) : null),
        setItem: (cle, valeur) => { contenu.set(cle, String(valeur)); },
        removeItem: (cle) => { contenu.delete(cle); }
    };
}

function coffreParDefaut() {
    try {
        const stockage = globalThis.localStorage;
        if (!stockage) return coffreEnMemoire();
        // Le seul test qui vaille : ecrire pour de vrai. Safari en navigation
        // privee expose localStorage et jette a la premiere ecriture.
        const sonde = '__slitherlink__';
        stockage.setItem(sonde, '1');
        stockage.removeItem(sonde);
        return stockage;
    } catch {
        return coffreEnMemoire();
    }
}

function lireJSON(coffre, cle) {
    try {
        const brut = coffre.getItem(cle);
        return brut ? JSON.parse(brut) : null;
    } catch { return null; }
}

function ecrireJSON(coffre, cle, valeur) {
    try { coffre.setItem(cle, JSON.stringify(valeur)); return true; }
    catch { return false; }
}

const SERIE_VIDE = { serie: 0, record: 0, dernierJour: null, reussis: 0 };

function chargerSerie(coffre = coffreParDefaut()) {
    const enregistre = lireJSON(coffre, CLE_SERIE);
    if (!enregistre || typeof enregistre !== 'object') return { ...SERIE_VIDE };
    return {
        serie: Number(enregistre.serie) || 0,
        record: Number(enregistre.record) || 0,
        dernierJour: typeof enregistre.dernierJour === 'string' ? enregistre.dernierJour : null,
        reussis: Number(enregistre.reussis) || 0
    };
}

// La regle de la serie, isolee et sans effet de bord : c'est elle qu'on teste.
// Rejouer le meme jour ne compte pas deux fois ; sauter un jour repart a un.
function serieApres(etat, id) {
    if (etat.dernierJour === id) return { ...etat };
    const serie = etat.dernierJour === veilleDe(id) ? etat.serie + 1 : 1;
    return {
        serie,
        record: Math.max(serie, etat.record || 0),
        dernierJour: id,
        reussis: (etat.reussis || 0) + 1
    };
}

function enregistrerReussite(id, coffre = coffreParDefaut()) {
    const suivant = serieApres(chargerSerie(coffre), id);
    ecrireJSON(coffre, CLE_SERIE, suivant);
    return suivant;
}

// --- La partie en cours ----------------------------------------------------

// On garde la grille avec l'etat : sans elle, l'etat rechargé s'appliquerait a
// une autre grille et afficherait n'importe quoi.
function enregistrerPartie(partie, coffre = coffreParDefaut()) {
    return ecrireJSON(coffre, CLE_PARTIE, partie);
}

function chargerPartie(coffre = coffreParDefaut()) {
    const partie = lireJSON(coffre, CLE_PARTIE);
    if (!partie || typeof partie.grille !== 'string' || typeof partie.etat !== 'string') return null;
    return partie;
}

function oublierPartie(coffre = coffreParDefaut()) {
    try { coffre.removeItem(CLE_PARTIE); } catch { /* rien a oublier */ }
}

export {
    chargerSerie, serieApres, enregistrerReussite,
    enregistrerPartie, chargerPartie, oublierPartie,
    coffreEnMemoire, coffreParDefaut, SERIE_VIDE, CLE_SERIE, CLE_PARTIE
};
