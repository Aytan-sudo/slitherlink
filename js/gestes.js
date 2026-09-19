// Les gestes. Le glisse est le plus important des trois : sur un telephone,
// tracer huit aretes en un mouvement est la difference entre un jeu qu'on
// pose et un jeu qu'on garde.

import * as B from './boucle.js';

// Le tap fait l'aller-retour entre le fil et le vide, et rien d'autre. La
// croix y a longtemps tenu la troisieme place ; elle n'a pas survecu a
// l'usage. On tape pour effacer un trait et on herite d'une croix, puis il
// faut un tap de plus pour revenir au vide - et le glisse qui efface une
// suite d'aretes la semait derriere lui. Elle reste au clavier, ou la poser
// est un choix (touche X) et non le milieu du chemin.
const SUIVANT = {};
SUIVANT[B.INCONNU] = B.TRAIT;
SUIVANT[B.TRAIT] = B.INCONNU;
SUIVANT[B.CROIX] = B.INCONNU;

function brancher(svg, vue, jeu) {
    let actif = false;
    let modeGlisse = B.INCONNU;
    let derniereArete = -1;
    let dernierX = 0, dernierY = 0;

    function appliquer(e, valeur) {
        if (e < 0 || jeu.valeurDe(e) === valeur) return;
        jeu.poser(e, valeur);
    }

    svg.addEventListener('pointerdown', function (evt) {
        if (jeu.gele()) return;
        const p = vue.versGrille(evt.clientX, evt.clientY);
        const e = vue.areteLaPlusProche(p.x, p.y);
        if (e < 0) return;
        evt.preventDefault();

        actif = true;
        modeGlisse = SUIVANT[jeu.valeurDe(e)];
        derniereArete = e;
        dernierX = p.x; dernierY = p.y;

        jeu.ouvrirGeste();
        appliquer(e, modeGlisse);
        vue.poserFocus(e);
        if (svg.setPointerCapture) svg.setPointerCapture(evt.pointerId);
    });

    svg.addEventListener('pointermove', function (evt) {
        if (!actif) return;
        evt.preventDefault();
        const p = vue.versGrille(evt.clientX, evt.clientY);

        // Un doigt rapide saute par-dessus des aretes entieres entre deux
        // evenements. On repasse donc sur le chemin parcouru plutot que sur
        // le seul point d'arrivee.
        const dx = p.x - dernierX, dy = p.y - dernierY;
        const distance = Math.hypot(dx, dy);
        const pas = Math.max(1, Math.ceil(distance / 24));
        for (let i = 1; i <= pas; i++) {
            const e = vue.areteLaPlusProche(dernierX + dx * i / pas, dernierY + dy * i / pas);
            if (e >= 0 && e !== derniereArete) {
                appliquer(e, modeGlisse);
                derniereArete = e;
            }
        }
        dernierX = p.x; dernierY = p.y;
    });

    function terminer(evt) {
        if (!actif) return;
        actif = false;
        derniereArete = -1;
        jeu.fermerGeste();
        if (evt && svg.releasePointerCapture && svg.hasPointerCapture && svg.hasPointerCapture(evt.pointerId)) {
            svg.releasePointerCapture(evt.pointerId);
        }
    }
    svg.addEventListener('pointerup', terminer);
    svg.addEventListener('pointercancel', terminer);
    svg.addEventListener('lostpointercapture', function () { if (actif) terminer(null); });

    const FLECHES = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0]
    };

    svg.addEventListener('keydown', function (evt) {
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
        const e = vue.areteFocus();
        if (e < 0) return;

        const direction = FLECHES[evt.key];
        if (direction) {
            const voisine = vue.areteVoisine(e, direction[0], direction[1]);
            if (voisine >= 0) { vue.poserFocus(voisine); jeu.annoncer(vue.decrire(voisine, jeu.valeurDe(voisine))); }
            evt.preventDefault();
            return;
        }
        if (jeu.gele()) return;

        let valeur = null;
        if (evt.key === ' ' || evt.key === 'Enter') valeur = SUIVANT[jeu.valeurDe(e)];
        else if (evt.key === 'x' || evt.key === 'X') {
            valeur = jeu.valeurDe(e) === B.CROIX ? B.INCONNU : B.CROIX;
        }
        if (valeur === null) return;

        evt.preventDefault();
        jeu.ouvrirGeste();
        appliquer(e, valeur);
        jeu.fermerGeste();
        jeu.annoncer(vue.decrire(e, jeu.valeurDe(e)));
    });
}

export { brancher, SUIVANT };
