// Assemblage : fabrique la grille, branche les gestes, tient les compteurs, et
// decide quand la boucle est fermee. Le seul module qui connaisse a la fois le
// noyau et l'ecran ; tous les autres ignorent l'un ou l'autre.

import * as G from './graphe.js';
import * as B from './boucle.js';
import * as Region from './region.js';
import * as ui from './ui.js';
import { creerContraintes } from './slitherlink.js';
import { decrireNiveau } from './difficulte.js';
import { genererSur } from './generateur.js';
import { creerHasard, graineAleatoire } from './hasard.js';
import { encoderLien, encoderGrille, encoderEtat, decoderEtat, decoderGrille, lireLien } from './codage.js';
import { defiDuJour, texteDePartage } from './defi.js';
import * as stockage from './stockage.js';
import { creerVue } from './vue.js';
import { creerHistorique } from './historique.js';
import { brancher } from './gestes.js';

const elements = ui.elements;

let grille = null, graphe = null, contraintes = null, vue = null, histoire = null;
let etat = null;
let gagne = false, occupe = false;
let debut = 0, ecoule = 0, minuterie = null;

// Le defi auquel appartient la partie en cours, ou null pour une grille libre.
// C'est lui qui decide si une victoire compte pour la serie.
let defiEnCours = null;
let stats = stockage.chargerSerie();

// --- Chrono ----------------------------------------------------------------

function demarrerChrono() {
    if (minuterie || gagne) return;
    debut = Date.now();
    minuterie = setInterval(function () {
        ui.afficherChrono(ecoule + Date.now() - debut);
    }, 500);
}

function arreterChrono() {
    if (!minuterie) return;
    ecoule += Date.now() - debut;
    clearInterval(minuterie); minuterie = null;
    ui.afficherChrono(ecoule);
}

// --- Etat de la grille -----------------------------------------------------

function poser(e, valeur) {
    const avant = etat[e];
    if (avant === valeur) return;
    etat[e] = valeur;
    histoire.noter(e, avant, valeur);
    vue.majAutour(e, etat);
    demarrerChrono();
    sauvegardeDifferee();
}

// Ecrire a chaque arete posee serait absurde pendant un glisse : on attend que
// la main s'arrete. Une seconde de retard ne perd rien qu'un joueur regrette.
let attenteSauvegarde = null;
function sauvegardeDifferee() {
    clearTimeout(attenteSauvegarde);
    attenteSauvegarde = setTimeout(sauvegarder, 700);
}

function sauvegarder() {
    if (!grille || gagne) return;
    stockage.enregistrerPartie({
        grille: encoderGrille(grille),
        etat: encoderEtat(etat),
        defi: defiEnCours ? defiEnCours.id : null,
        ecoule: ecoule + (minuterie ? Date.now() - debut : 0)
    });
}

// Applique sans passer par l'historique : c'est lui qui appelle.
function appliquer(e, valeur) {
    etat[e] = valeur;
    vue.majAutour(e, etat);
}

function majBoutons() {
    ui.afficherBoutons(histoire.peutAnnuler(), histoire.peutRefaire());
}

// Aucun bouton « verifier » : on regarde apres chaque geste si les chiffres
// sont tous satisfaits et si les traits forment une seule boucle fermee. Le
// controleur de boucle est celui du generateur, pas une deuxieme version.
function verifierVictoire() {
    if (gagne) return;
    if (!contraintes.estSatisfait(etat)) return;
    if (!Region.verifierBoucle(graphe, etat).valide) return;

    gagne = true;
    arreterChrono();
    clearTimeout(attenteSauvegarde);
    stockage.oublierPartie();
    vue.celebrer(etat, elements.plateau);

    // Seul le defi du jour nourrit la serie. Une grille libre bouclee vingt
    // fois de suite ne prouve rien sur l'assiduite.
    if (defiEnCours) {
        stats = stockage.enregistrerReussite(defiEnCours.id);
        ui.afficherSerie(stats);
        ui.marquerDefiFait(true);
    }

    ui.annoncer('La boucle est fermée. Grille résolue en ' + ui.formaterDuree(ecoule) + '.');
    const attente = matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1400;
    setTimeout(function () { ui.afficherFanfare(grille, ecoule, histoire.nbGestes()); }, attente);
}

// --- Le jeu vu par les gestes ----------------------------------------------

const jeu = {
    valeurDe: (e) => etat[e],
    poser: poser,
    ouvrirGeste: function () { if (!gagne) histoire.ouvrir(); },
    fermerGeste: function () {
        histoire.fermer();
        majBoutons();
        majLien();
        verifierVictoire();
    },
    gele: () => gagne || occupe,
    annoncer: ui.annoncer
};

// --- Mise en place d'une grille --------------------------------------------

function installer(nouvelle, options = {}) {
    grille = nouvelle;
    defiEnCours = options.defi || null;
    graphe = G.creerGraphe(grille.L, grille.H);
    contraintes = creerContraintes(grille.L, grille.H, grille.chiffres, { graphe: graphe });
    etat = options.etat && options.etat.length === graphe.nbAretes
        ? Int8Array.from(options.etat) : new Int8Array(graphe.nbAretes);
    gagne = false;
    ecoule = options.ecoule || 0; debut = 0;
    arreterChrono();
    ui.afficherChrono(ecoule);

    vue = creerVue(elements.svg, graphe, grille.chiffres);
    vue.reinitialiserCelebration(elements.plateau);
    vue.rendre(etat);

    histoire = creerHistorique(appliquer);
    majBoutons();

    ui.afficherGrille(grille);
    ui.cacherFanfare();
    ui.afficherSerie(stats);
    ui.marquerDefiFait(stats.dernierJour === defiDuJour().id);
    // Le hash suit la partie : la barre d'adresse est toujours un lien valide
    // vers ce qu'on a sous les yeux, sans qu'on ait rien a copier.
    majLien();
    ui.annoncer((defiEnCours ? 'Défi du ' + defiEnCours.id + ', ' : 'Nouvelle grille ') +
                grille.L + ' sur ' + grille.H + ', difficulté ' + grille.difficulte.nom + '.');

    // Une partie reprise en cours de route peut deja etre gagnee - un lien
    // envoye par quelqu'un qui avait fini, par exemple.
    verifierVictoire();
}

// Le dernier hash que nous avons ecrit nous-memes. Sans cette memoire, chaque
// arete posee ferait croire a un lien recu de l'exterieur, et la grille se
// rechargerait sous les doigts du joueur.
let hashEcrit = '';

function majLien() {
    if (!grille) return;
    hashEcrit = encoderLien(grille, etat);
    history.replaceState(null, '', location.pathname + location.search + hashEcrit);
}

// La generation d'une grille experte peut demander une seconde ou deux. On
// affiche le voile et on rend la main au navigateur avant de s'y mettre, sinon
// l'ecran reste fige sans rien dire.
function fabriquer(taille, niveau, graine, options = {}) {
    if (occupe) return;
    occupe = true;
    ui.afficherVoile(true);
    // Un simple setTimeout, et surtout pas requestAnimationFrame : dans un
    // onglet en arriere-plan, rAF ne se declenche pas du tout, et la partie ne
    // demarrerait jamais.
    setTimeout(function () {
        try {
            const produite = genererSur(taille, taille, creerHasard(graine), { niveau: niveau });
            if (produite) installer(produite, options);
            else ui.annoncer('La couture a échoué, réessayez.');
        } finally {
            occupe = false;
            ui.afficherVoile(false);
        }
    }, 30);
}

function nouvelleGrille(taille, niveau) {
    stockage.oublierPartie();
    fabriquer(taille, niveau, graineAleatoire());
}

// Le defi du jour se refabrique chez chacun a partir de la seule date : rien
// n'est heberge, et deux joueurs obtiennent la meme grille.
function ouvrirDefi() {
    const defi = defiDuJour();
    const reprise = stockage.chargerPartie();
    const etatRepris = reprise && reprise.defi === defi.id ? reprise : null;
    fabriquer(defi.taille, defi.niveau, defi.graine, {
        defi,
        etat: etatRepris ? decoderEtat(etatRepris.etat, nbAretesDe(defi.taille, defi.taille)) : null,
        ecoule: etatRepris ? etatRepris.ecoule || 0 : 0
    });
}

const nbAretesDe = (L, H) => G.creerGraphe(L, H).nbAretes;

// --- Branchements ----------------------------------------------------------

brancher(elements.svg, {
    versGrille: (x, y) => vue.versGrille(x, y),
    areteLaPlusProche: (x, y) => vue.areteLaPlusProche(x, y),
    areteVoisine: (e, dx, dy) => vue.areteVoisine(e, dx, dy),
    poserFocus: (e) => vue.poserFocus(e),
    areteFocus: () => vue.areteFocus(),
    decrire: (e, v) => vue.decrire(e, v)
}, jeu);

function annuler() {
    if (gagne || !histoire.annuler()) return;
    majBoutons(); majLien(); sauvegardeDifferee();
}
function refaire() {
    if (gagne || !histoire.refaire()) return;
    majBoutons(); majLien(); sauvegardeDifferee(); verifierVictoire();
}

elements.annuler.addEventListener('click', annuler);
elements.refaire.addEventListener('click', refaire);

document.addEventListener('keydown', function (evt) {
    if (!(evt.ctrlKey || evt.metaKey) || gagne) return;
    const touche = evt.key.toLowerCase();
    if (touche === 'z' && !evt.shiftKey) { evt.preventDefault(); annuler(); }
    else if ((touche === 'z' && evt.shiftKey) || touche === 'y') { evt.preventDefault(); refaire(); }
});

elements.reglages.addEventListener('submit', function (evt) {
    evt.preventDefault();
    nouvelleGrille(Number(elements.choixTaille.value), Number(elements.choixNiveau.value));
});
elements.encore.addEventListener('click', function () {
    ui.cacherFanfare();
    nouvelleGrille(Number(elements.choixTaille.value), Number(elements.choixNiveau.value));
});

elements.niveau.addEventListener('click', function () {
    elements.niveauDetail.hidden = !elements.niveauDetail.hidden;
});

elements.defi.addEventListener('click', ouvrirDefi);

elements.lien.addEventListener('click', async function () {
    majLien();
    const copie = await ui.copier(location.href);
    ui.annoncer(copie ? 'Lien de la grille copié.' : 'Le lien est dans la barre d\'adresse.');
    ui.confirmerBouton(elements.lien, copie ? '✓' : '⌫');
});

elements.copier.addEventListener('click', async function () {
    const texte = texteDePartage({
        defi: defiEnCours, grille, duree: ecoule,
        gestes: histoire.nbGestes(), serie: defiEnCours ? stats.serie : 0
    });
    const copie = await ui.copier(texte);
    ui.confirmerBouton(elements.copier, copie ? 'Copié' : 'Impossible');
    ui.annoncer(copie ? 'Résumé copié.' : 'La copie a échoué.');
});

// Fermer l'onglet en pleine partie ne doit pas la perdre.
addEventListener('pagehide', sauvegarder);
addEventListener('visibilitychange', function () { if (document.hidden) sauvegarder(); });

elements.ouvrirAide.addEventListener('click', function () { elements.aide.showModal(); });
elements.fermerAide.addEventListener('click', function () { elements.aide.close(); });

if ('serviceWorker' in navigator) {
    addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne indisponible */ });
    });
}

// --- Depart ----------------------------------------------------------------

// Sur un ecran etroit, une case de 10x10 tombe sous les 40 px : on ouvre donc
// sur du 7x7, ou le doigt a de la place. L'ecran large part sur 10x10.
const etroit = matchMedia('(max-width: 560px)').matches;
elements.choixTaille.value = etroit ? '7' : '10';

// Une grille recue par lien est deja decrite en entier : on la joue telle
// quelle, sans rien fabriquer. C'est le seul chemin qui n'appelle pas le
// generateur - et donc le seul ou la difficulte doit etre mesuree ici.
function ouvrirDepuisLien(lu) {
    const graphe = G.creerGraphe(lu.grille.L, lu.grille.H);
    const contraintes = creerContraintes(lu.grille.L, lu.grille.H, lu.grille.chiffres, { graphe });
    const bilan = B.analyser(contraintes);
    if (bilan.solutions !== 1) {
        // Une grille sans solution unique n'est pas jouable : mieux vaut le
        // dire et repartir sur autre chose que d'afficher une enigme insoluble.
        ui.annoncer('Ce lien ne mène pas à une grille valable.');
        return false;
    }
    installer({
        L: lu.grille.L, H: lu.grille.H,
        chiffres: lu.grille.chiffres,
        nbChiffres: lu.grille.chiffres.filter((n) => n >= 0).length,
        niveau: bilan.niveau,
        difficulte: decrireNiveau(bilan.niveau)
    }, { etat: lu.etat });
    return true;
}

function demarrer() {
    const lu = lireLien(location.hash, nbAretesDe);
    if (lu && ouvrirDepuisLien(lu)) return;

    // Une partie interrompue reprend ou elle en etait, defi ou pas.
    const reprise = stockage.chargerPartie();
    if (reprise) {
        const grilleReprise = decoderGrille(reprise.grille);
        if (grilleReprise) {
            const lue = { grille: grilleReprise, etat: decoderEtat(reprise.etat, nbAretesDe(grilleReprise.L, grilleReprise.H)) };
            if (ouvrirDepuisLien(lue)) {
                if (reprise.defi === defiDuJour().id) defiEnCours = defiDuJour();
                ecoule = reprise.ecoule || 0;
                ui.afficherChrono(ecoule);
                return;
            }
        }
    }

    // Sinon : le defi du jour s'il n'est pas deja boucle, une grille libre sinon.
    if (stats.dernierJour === defiDuJour().id) {
        nouvelleGrille(Number(elements.choixTaille.value), Number(elements.choixNiveau.value));
    } else {
        ouvrirDefi();
    }
}

// Coller un lien dans la barre d'adresse d'un onglet deja ouvert ne recharge
// pas la page : seul le hash change. Sans cet ecouteur, le lien recu ne ferait
// rien du tout, ce qui est la seule facon de le recevoir a laquelle on pense.
addEventListener('hashchange', function () {
    if (location.hash === hashEcrit || occupe) return;
    const lu = lireLien(location.hash, nbAretesDe);
    if (lu && ouvrirDepuisLien(lu)) {
        stockage.oublierPartie();
        return;
    }
    ui.annoncer('Ce lien ne mène pas à une grille valable.');
    majLien();
});

demarrer();
