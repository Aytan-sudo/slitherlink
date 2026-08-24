// Rendu SVG. Les elements sont crees une fois pour toutes a l'ouverture d'une
// grille ; jouer ne fait que changer des classes. Le SVG plutot que le canvas
// parce qu'une arete y est un vrai element : le focus clavier et les lecteurs
// d'ecran viennent avec, sans rien reimplementer.

import * as B from './boucle.js';

const NS = 'http://www.w3.org/2000/svg';

const U = 100;      // cote d'une case, en unites du viewBox
const MARGE = 46;   // de quoi loger le debord du fil et l'anneau de focus

function elem(nom, attributs) {
    const n = document.createElementNS(NS, nom);
    for (const cle in attributs) n.setAttribute(cle, attributs[cle]);
    return n;
}

function coordArete(graphe, e) {
    const r = graphe.areteLigne[e], c = graphe.areteColonne[e];
    if (graphe.areteHorizontale[e]) return { x1: c * U, y1: r * U, x2: (c + 1) * U, y2: r * U };
    return { x1: c * U, y1: r * U, x2: c * U, y2: (r + 1) * U };
}

function distanceAuSegment(x, y, s) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const longueur2 = dx * dx + dy * dy;
    let t = longueur2 ? ((x - s.x1) * dx + (y - s.y1) * dy) / longueur2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = s.x1 + t * dx - x, py = s.y1 + t * dy - y;
    return Math.sqrt(px * px + py * py);
}

function creerVue(svg, graphe, chiffres) {
    const L = graphe.L, H = graphe.H;
    const vbX = -MARGE, vbY = -MARGE;
    const vbL = L * U + 2 * MARGE, vbH = H * U + 2 * MARGE;
    svg.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbL + ' ' + vbH);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const coords = new Array(graphe.nbAretes);
    for (let e = 0; e < graphe.nbAretes; e++) coords[e] = coordArete(graphe, e);

    const gCroix = elem('g', { 'class': 'croix-groupe' });
    const gChiffres = elem('g', { 'class': 'chiffres-groupe' });
    const gFils = elem('g', { 'class': 'fils-groupe' });
    const gPoints = elem('g', { 'class': 'points-groupe' });
    const gBoucle = elem('g', { 'class': 'boucle-groupe' });
    const gCibles = elem('g', { 'class': 'cibles-groupe' });
    svg.append(gChiffres, gCroix, gFils, gPoints, gBoucle, gCibles);

    // Les chiffres.
    const textes = new Array(graphe.nbCases).fill(null);
    for (let f = 0; f < graphe.nbCases; f++) {
        if (chiffres[f] < 0) continue;
        const r = Math.floor(f / L), c = f % L;
        const t = elem('text', { 'class': 'chiffre', x: c * U + U / 2, y: r * U + U / 2 });
        t.textContent = String(chiffres[f]);
        gChiffres.appendChild(t);
        textes[f] = t;
    }

    // Les aretes : le fil, la croix, et la zone de focus.
    const fils = new Array(graphe.nbAretes);
    const croix = new Array(graphe.nbAretes);
    const cibles = new Array(graphe.nbAretes);
    for (let e = 0; e < graphe.nbAretes; e++) {
        const s = coords[e];
        fils[e] = elem('line', { 'class': 'fil', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
        gFils.appendChild(fils[e]);

        const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2, b = 9;
        croix[e] = elem('path', { 'class': 'croix',
            d: 'M' + (mx - b) + ' ' + (my - b) + 'L' + (mx + b) + ' ' + (my + b) +
               'M' + (mx - b) + ' ' + (my + b) + 'L' + (mx + b) + ' ' + (my - b) });
        gCroix.appendChild(croix[e]);

        const horizontale = graphe.areteHorizontale[e];
        const cible = elem('rect', { 'class': 'cible', rx: 3,
            x: horizontale ? s.x1 + 4 : s.x1 - 16,
            y: horizontale ? s.y1 - 16 : s.y1 + 4,
            width: horizontale ? U - 8 : 32,
            height: horizontale ? 32 : U - 8 });
        cible.setAttribute('tabindex', '-1');
        cible.setAttribute('role', 'button');
        gCibles.appendChild(cible);
        cibles[e] = cible;
    }

    // Les reperes pointes de la toile.
    const points = new Array(graphe.nbPoints);
    for (let p = 0; p < graphe.nbPoints; p++) {
        points[p] = elem('circle', { 'class': 'point',
            cx: graphe.pointColonne(p) * U, cy: graphe.pointLigne(p) * U, r: 5.5 });
        gPoints.appendChild(points[p]);
    }

    // Une arete doit etre atteignable des la premiere tabulation : sans
    // ca, le plateau est un trou noir pour qui navigue au clavier.
    let areteFocus = 0;
    if (cibles.length) cibles[0].setAttribute('tabindex', '0');

    function decrire(e, valeur) {
        const r = graphe.areteLigne[e], c = graphe.areteColonne[e];
        const sens = graphe.areteHorizontale[e] ? 'horizontale' : 'verticale';
        const etats = ['libre', 'tracée', 'barrée'];
        return 'Arête ' + sens + ', ligne ' + (r + 1) + ', colonne ' + (c + 1) + ' : ' + etats[valeur];
    }

    function majArete(e, etat) {
        const valeur = etat[e];
        fils[e].classList.toggle('trace', valeur === B.TRAIT);
        croix[e].classList.toggle('posee', valeur === B.CROIX);
        cibles[e].setAttribute('aria-label', decrire(e, valeur));
    }

    function majPoint(p, etat) {
        let noue = false;
        for (let d = 0; d < 4 && !noue; d++) {
            const e = graphe.pointAretes[p * 4 + d];
            if (e >= 0 && etat[e] === B.TRAIT) noue = true;
        }
        points[p].classList.toggle('noeud', noue);
        // Le rayon se regle en dur : la propriete CSS r n'est pas partout,
        // et un noeud qui ne se voit pas ne sert a rien.
        points[p].setAttribute('r', noue ? 8.5 : 5.5);
    }

    function majCase(f, etat) {
        const t = textes[f];
        if (!t) return;
        let traces = 0;
        for (let d = 0; d < 4; d++) if (etat[graphe.caseAretes[f * 4 + d]] === B.TRAIT) traces++;
        t.classList.toggle('satisfait', traces === chiffres[f]);
        t.classList.toggle('depasse', traces > chiffres[f]);
    }

    // Apres un changement d'arete, seuls ses deux points et ses deux cases
    // peuvent avoir change d'apparence. Inutile de repeindre la grille.
    function majAutour(e, etat) {
        majArete(e, etat);
        majPoint(graphe.aretePoints[e * 2], etat);
        majPoint(graphe.aretePoints[e * 2 + 1], etat);
        const f1 = graphe.areteCases[e * 2], f2 = graphe.areteCases[e * 2 + 1];
        if (f1 >= 0) majCase(f1, etat);
        if (f2 >= 0) majCase(f2, etat);
    }

    function rendre(etat) {
        for (let e = 0; e < graphe.nbAretes; e++) majArete(e, etat);
        for (let p = 0; p < graphe.nbPoints; p++) majPoint(p, etat);
        for (let f = 0; f < graphe.nbCases; f++) majCase(f, etat);
    }

    // Coordonnees du pointeur dans le repere du viewBox. Le SVG garde son
    // rapport de forme (largeur 100 %, hauteur auto), donc une regle de
    // trois suffit et evite les surprises de getScreenCTM.
    function versGrille(clientX, clientY) {
        const cadre = svg.getBoundingClientRect();
        return {
            x: (clientX - cadre.left) / cadre.width * vbL + vbX,
            y: (clientY - cadre.top) / cadre.height * vbH + vbY
        };
    }

    // Toute la surface du plateau appartient a une arete : c'est ce
    // decoupage geometrique, et non des rectangles invisibles qui se
    // chevaucheraient, qui donne au doigt la plus grande cible possible.
    function areteLaPlusProche(x, y) {
        const c = Math.max(0, Math.min(L - 1, Math.floor(x / U)));
        const r = Math.max(0, Math.min(H - 1, Math.floor(y / U)));
        const f = graphe.cellule(r, c);
        let meilleure = -1, meilleureDistance = Infinity;
        for (let d = 0; d < 4; d++) {
            const e = graphe.caseAretes[f * 4 + d];
            const distance = distanceAuSegment(x, y, coords[e]);
            if (distance < meilleureDistance) { meilleureDistance = distance; meilleure = e; }
        }
        return meilleureDistance <= U * 0.85 ? meilleure : -1;
    }

    function poserFocus(e) {
        if (e < 0) return;
        if (areteFocus >= 0) cibles[areteFocus].setAttribute('tabindex', '-1');
        areteFocus = e;
        cibles[e].setAttribute('tabindex', '0');
        cibles[e].focus();
    }

    // Deplacement au clavier : l'arete la plus proche dans la direction
    // demandee, en penalisant l'ecart lateral pour que les fleches suivent
    // les lignes de la grille plutot que de partir en biais.
    function areteVoisine(e, dx, dy) {
        const s = coords[e];
        const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
        let meilleure = -1, meilleurCout = Infinity;
        for (let autre = 0; autre < graphe.nbAretes; autre++) {
            if (autre === e) continue;
            const t = coords[autre];
            const ax = (t.x1 + t.x2) / 2 - mx, ay = (t.y1 + t.y2) / 2 - my;
            const avance = ax * dx + ay * dy;
            if (avance <= 1) continue;
            const ecart = Math.abs(ax * dy - ay * dx);
            const cout = avance + ecart * 3;
            if (cout < meilleurCout) { meilleurCout = cout; meilleure = autre; }
        }
        return meilleure;
    }

    // La boucle achevee, reconstruite en un seul trace pour que l'aiguille
    // puisse en faire le tour d'une traite.
    function cheminDeLaBoucle(etat) {
        let depart = -1;
        for (let e = 0; e < graphe.nbAretes && depart < 0; e++) {
            if (etat[e] === B.TRAIT) depart = graphe.aretePoints[e * 2];
        }
        if (depart < 0) return null;
        const morceaux = ['M' + graphe.pointColonne(depart) * U + ' ' + graphe.pointLigne(depart) * U];
        let courant = depart, parArete = -1, tours = 0;
        do {
            let suivant = -1, arete = -1;
            for (let d = 0; d < 4; d++) {
                const e = graphe.pointAretes[courant * 4 + d];
                if (e >= 0 && etat[e] === B.TRAIT && e !== parArete) {
                    suivant = graphe.autreBout(e, courant); arete = e; break;
                }
            }
            if (suivant < 0) return null;
            morceaux.push('L' + graphe.pointColonne(suivant) * U + ' ' + graphe.pointLigne(suivant) * U);
            parArete = arete; courant = suivant;
        } while (courant !== depart && ++tours < graphe.nbAretes + 2);
        return morceaux.join('') + 'Z';
    }

    function celebrer(etat, plateau) {
        plateau.classList.add('gagne');
        const d = cheminDeLaBoucle(etat);
        if (!d) return;
        const chemin = elem('path', { 'class': 'boucle-finie', d: d });
        gBoucle.appendChild(chemin);
        const longueur = chemin.getTotalLength();
        chemin.style.strokeDasharray = longueur;
        chemin.style.strokeDashoffset = longueur;
        // Forcer le calcul avant d'armer l'animation, sinon le navigateur
        // fusionne les deux etats et le fil apparait d'un coup.
        void chemin.getBoundingClientRect();
        chemin.classList.add('court');
    }

    function reinitialiserCelebration(plateau) {
        plateau.classList.remove('gagne');
        while (gBoucle.firstChild) gBoucle.removeChild(gBoucle.firstChild);
    }

    return {
        rendre: rendre,
        majAutour: majAutour,
        versGrille: versGrille,
        areteLaPlusProche: areteLaPlusProche,
        areteVoisine: areteVoisine,
        poserFocus: poserFocus,
        areteFocus: function () { return areteFocus; },
        premiereArete: function () { return 0; },
        decrire: decrire,
        celebrer: celebrer,
        reinitialiserCelebration: reinitialiserCelebration
    };
}

export { creerVue, U, MARGE };
