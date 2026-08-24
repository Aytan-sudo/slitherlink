// Le defi du jour. La grille est derivee de la date, donc tout le monde joue
// la meme sans que rien ne soit heberge : le generateur la refabrique a
// l'identique chez chacun, a partir de la seule graine du jour.

import { graineDepuisTexte } from './hasard.js';
import { decrireNiveau } from './difficulte.js';

// La date locale en AAAA-MM-JJ. Surtout pas toISOString, qui passe par UTC :
// a Paris, avant deux heures du matin, il rendrait la veille.
function jourDe(date) {
    const deuxChiffres = (n) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + deuxChiffres(date.getMonth() + 1) + '-' + deuxChiffres(date.getDate());
}

// La difficulte monte au fil de la semaine, comme les mots croises des
// journaux : on commence tranquillement le lundi, on finit par transpirer le
// dimanche. Ainsi le rendez-vous quotidien a un rythme, au lieu d'etre une
// suite de grilles interchangeables.
const SEMAINE = [
    { taille: 10, niveau: 4 },  // dimanche
    { taille: 7, niveau: 1 },   // lundi
    { taille: 7, niveau: 2 },   // mardi
    { taille: 8, niveau: 2 },   // mercredi
    { taille: 8, niveau: 3 },   // jeudi
    { taille: 10, niveau: 3 },  // vendredi
    { taille: 10, niveau: 4 }   // samedi
];

const NOMS_DE_JOUR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function defiDuJour(date = new Date()) {
    const id = jourDe(date);
    const forme = SEMAINE[date.getDay()];
    return {
        id,
        jour: NOMS_DE_JOUR[date.getDay()],
        // Le sel evite que la grille du jour soit exactement celle qu'obtient
        // « nouvelle grille » chez quelqu'un qui tomberait sur la meme graine.
        graine: graineDepuisTexte('slitherlink/' + id),
        taille: forme.taille,
        niveau: forme.niveau,
        difficulte: decrireNiveau(forme.niveau)
    };
}

// La veille, en AAAA-MM-JJ. Passe par un vrai objet Date pour ne pas avoir a
// se souvenir des mois de trente jours ni des annees bissextiles.
function veilleDe(id) {
    const [annee, mois, jour] = id.split('-').map(Number);
    const date = new Date(annee, mois - 1, jour - 1);
    return jourDe(date);
}

function formaterDuree(ms) {
    const total = Math.floor(ms / 1000);
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

// Le resume qu'on colle dans une conversation. Il dit le resultat sans rien
// devoiler de la grille : pas de chiffres, pas de forme, rien qui gache la
// partie de celui qui le lit.
function texteDePartage({ defi, grille, duree, gestes, serie }) {
    const lignes = [
        'Slitherlink — ' + (defi ? defi.id : 'grille libre'),
        grille.L + '×' + grille.H + ' · ' + grille.difficulte.nom,
        'bouclé en ' + formaterDuree(duree) + ' · ' + gestes + ' gestes'
    ];
    if (serie > 1) lignes.push('série de ' + serie + ' jours 🧵');
    else if (serie === 1) lignes.push('série entamée 🧵');
    return lignes.join('\n');
}

export { defiDuJour, jourDe, veilleDe, texteDePartage, SEMAINE };
