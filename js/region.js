// Fabrique une boucle valide sans jamais avoir a la valider apres coup : on
// tire une region de cases, et son contour EST une boucle simple fermee, par
// construction. Encore faut-il refuser les deux facons de casser cette
// propriete - le trou et le pincement en diagonale - a chaque ajout.
//
// Rien ici ne parle de chiffres : Masyu tirera ses boucles avec le meme code.

import * as B from './boucle.js';

function tirerRegion(L, H, alea, options) {
    options = options || {};
    const C = L * H;
    const dedans = new Uint8Array(C);
    const idx = (r, c) => r * L + c;

    // Une region trop petite donne une boucle riquiqui, une region qui
    // remplit tout donne le simple perimetre : on vise le milieu.
    const part = options.part || (0.30 + alea() * 0.30);
    const cible = Math.max(2, Math.min(C - 1, Math.round(C * part)));

    const depart = idx(alea.entier(H), alea.entier(L));
    dedans[depart] = 1;
    let taille = 1;

    const frontiere = [];
    const dansFrontiere = new Uint8Array(C);
    function offrir(r, c) {
        if (r < 0 || c < 0 || r >= H || c >= L) return;
        const f = idx(r, c);
        if (dedans[f] || dansFrontiere[f]) return;
        dansFrontiere[f] = 1; frontiere.push(f);
    }
    function offrirVoisins(f) {
        const r = Math.floor(f / L), c = f % L;
        offrir(r - 1, c); offrir(r + 1, c); offrir(r, c - 1); offrir(r, c + 1);
    }
    offrirVoisins(depart);

    // Un point ou deux cases de la region ne se touchent que par le coin
    // donnerait un point de degre 4 : la boucle s'y croiserait.
    function pincement(f) {
        const rf = Math.floor(f / L), cf = f % L;
        const est = (r, c) => (r >= 0 && c >= 0 && r < H && c < L) ? (f === idx(r, c) ? 1 : dedans[idx(r, c)]) : 0;
        for (let dr = 0; dr <= 1; dr++) {
            for (let dc = 0; dc <= 1; dc++) {
                const r = rf + dr, c = cf + dc;   // un des quatre coins de la case
                const a = est(r - 1, c - 1), b = est(r - 1, c);
                const d = est(r, c - 1), e = est(r, c);
                if ((a && e && !b && !d) || (b && d && !a && !e)) return true;
            }
        }
        return false;
    }

    // Le complement doit rester d'un seul tenant, exterieur compris :
    // sinon la region enferme un trou, et le contour fait deux boucles.
    const vus = new Uint8Array(C);
    const pile = new Int32Array(C);
    function complementConnexe(ajout) {
        let dehors = 0;
        for (let f = 0; f < C; f++) if (!dedans[f] && f !== ajout) dehors++;
        if (dehors === 0) return true;
        vus.fill(0);
        let sommet = 0, atteints = 0;
        for (let r = 0; r < H; r++) {
            for (let c = 0; c < L; c++) {
                if (r !== 0 && r !== H - 1 && c !== 0 && c !== L - 1) continue;
                const f = idx(r, c);
                if (dedans[f] || f === ajout || vus[f]) continue;
                vus[f] = 1; pile[sommet++] = f; atteints++;
            }
        }
        while (sommet) {
            const f = pile[--sommet];
            const r = Math.floor(f / L), c = f % L;
            const voisins = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            for (let i = 0; i < 4; i++) {
                const vr = voisins[i][0], vc = voisins[i][1];
                if (vr < 0 || vc < 0 || vr >= H || vc >= L) continue;
                const g = idx(vr, vc);
                if (dedans[g] || g === ajout || vus[g]) continue;
                vus[g] = 1; pile[sommet++] = g; atteints++;
            }
        }
        return atteints === dehors;
    }

    // On privilegie les cases qui ont peu de voisins deja dans la region :
    // la region pousse en tentacules plutot qu'en pate, et le contour
    // obtenu serpente au lieu de faire un rond.
    function choisir() {
        let total = 0;
        const poids = new Array(frontiere.length);
        for (let i = 0; i < frontiere.length; i++) {
            const f = frontiere[i], r = Math.floor(f / L), c = f % L;
            let n = 0;
            if (r > 0 && dedans[idx(r - 1, c)]) n++;
            if (r + 1 < H && dedans[idx(r + 1, c)]) n++;
            if (c > 0 && dedans[idx(r, c - 1)]) n++;
            if (c + 1 < L && dedans[idx(r, c + 1)]) n++;
            poids[i] = (n <= 1) ? 6 : (n === 2 ? 2 : 1);
            total += poids[i];
        }
        let tirage = alea() * total;
        for (let i = 0; i < poids.length; i++) {
            tirage -= poids[i];
            if (tirage <= 0) return i;
        }
        return frontiere.length - 1;
    }

    let echecs = 0;
    const plafond = C * 6;
    while (taille < cible && frontiere.length > 0 && echecs < plafond) {
        const i = choisir();
        const f = frontiere[i];
        if (!pincement(f) && complementConnexe(f)) {
            dedans[f] = 1; taille++;
            dansFrontiere[f] = 0;
            frontiere.splice(i, 1);
            offrirVoisins(f);
            echecs = 0;
        } else {
            echecs++;
        }
    }
    return { dedans: dedans, taille: taille, L: L, H: H };
}

// Le contour d'une region : toute arete qui separe une case du dedans
// d'une case du dehors (le hors-grille comptant comme dehors).
function contour(graphe, dedans) {
    const L = graphe.L, H = graphe.H;
    const etat = new Int8Array(graphe.nbAretes).fill(B.CROIX);
    const dans = (r, c) => (r >= 0 && c >= 0 && r < H && c < L) ? dedans[r * L + c] : 0;
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < L; c++) {
            if (!dans(r, c)) continue;
            if (!dans(r - 1, c)) etat[graphe.areteH(r, c)] = B.TRAIT;
            if (!dans(r + 1, c)) etat[graphe.areteH(r + 1, c)] = B.TRAIT;
            if (!dans(r, c - 1)) etat[graphe.areteV(r, c)] = B.TRAIT;
            if (!dans(r, c + 1)) etat[graphe.areteV(r, c + 1)] = B.TRAIT;
        }
    }
    return etat;
}

// Verification de sortie : degre 0 ou 2 partout, et un seul cycle. Le
// generateur s'en sert comme garde-fou avant meme d'appeler le solveur.
function verifierBoucle(graphe, etat) {
    let nbTraits = 0, depart = -1;
    const degre = new Int32Array(graphe.nbPoints);
    for (let e = 0; e < graphe.nbAretes; e++) {
        if (etat[e] !== B.TRAIT) continue;
        nbTraits++;
        degre[graphe.aretePoints[e * 2]]++;
        degre[graphe.aretePoints[e * 2 + 1]]++;
        if (depart < 0) depart = graphe.aretePoints[e * 2];
    }
    if (nbTraits < 4) return { valide: false, raison: 'pas assez d aretes' };
    for (let p = 0; p < graphe.nbPoints; p++) {
        if (degre[p] !== 0 && degre[p] !== 2) return { valide: false, raison: 'point de degre ' + degre[p] };
    }
    let vus = 0, courant = depart, arriveePar = -1;
    do {
        vus++;
        let suivant = -1, parArete = -1;
        for (let d = 0; d < 4; d++) {
            const e = graphe.pointAretes[courant * 4 + d];
            if (e >= 0 && etat[e] === B.TRAIT && e !== arriveePar) {
                suivant = graphe.autreBout(e, courant); parArete = e; break;
            }
        }
        if (suivant < 0) return { valide: false, raison: 'chemin interrompu' };
        arriveePar = parArete; courant = suivant;
    } while (courant !== depart && vus <= nbTraits);
    if (vus !== nbTraits) return { valide: false, raison: 'plusieurs boucles' };
    return { valide: true, longueur: nbTraits };
}

export { tirerRegion, contour, verifierBoucle };
