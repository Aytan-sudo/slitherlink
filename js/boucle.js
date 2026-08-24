// Moteur de boucle. Il sait qu'une solution est un ensemble d'aretes formant
// UNE boucle simple fermee, et rien de plus : les chiffres du Slitherlink lui
// sont fournis de l'exterieur, par un objet de contraintes.
//
// Deux principes de mise en oeuvre gouvernent tout le fichier :
//   - une arete ne passe jamais de "tracee" a "barree" : elle quitte l'etat
//     inconnu une seule fois. Annuler une pose se resume donc a la remettre a
//     inconnu, et la pile d'annulation ne stocke qu'un entier par pose.
//   - rien n'est jamais recopie. La recherche travaille sur un seul etat, pose,
//     propage, puis defait. C'est ce qui rend le comptage de solutions tenable.

const INCONNU = 0, TRAIT = 1, CROIX = 2;

function creerRecherche(contraintes, options) {
    const g = contraintes.graphe;
    const A = g.nbAretes, P = g.nbPoints, C = g.nbCases;

    const r = {
        contraintes: contraintes,
        graphe: g,
        etat: new Int8Array(A),

        // Compteurs tenus a jour a chaque pose, pour ne jamais avoir a
        // reparcourir le voisinage d'un point ou d'une case.
        degTrait: new Int8Array(P),
        degInconnu: new Int8Array(P),
        caseTrait: new Int8Array(C),
        caseInconnu: new Int8Array(C),
        nbTraits: 0,
        nbInconnues: A,
        boucleFermee: false,

        pile: new Int32Array(A),
        pileLong: 0,

        // Union-find sans compression de chemin : la compression rendrait
        // l'annulation impossible. Sur des grilles de cette taille, un
        // find en O(log n) ne se voit pas.
        parent: new Int32Array(P),
        taille: new Int32Array(P).fill(1),
        compAretes: new Int32Array(P),
        pileUF: new Int32Array(A * 4),
        pileUFLong: 0,

        // Les bouts de fil (points a exactement un trait). La regle de
        // connexite ne s'interesse qu'a eux : les tenir a jour au fil des
        // poses evite de rebalayer la grille entiere a chaque tour.
        bouts: new Int32Array(P), nbBouts: 0, rangBout: new Int32Array(P).fill(-1),

        filePoints: new Int32Array(P), fpLong: 0, fpDedans: new Uint8Array(P),
        fileCases: new Int32Array(C), fcLong: 0, fcDedans: new Uint8Array(C),

        options: { connexite: options && options.connexite === false ? false : true },
        noeuds: 0,
        profondeurMax: 0
    };
    for (let p = 0; p < P; p++) {
        r.parent[p] = p;
        r.degInconnu[p] = g.pointNbAretes[p];
        r.filePoints[p] = p; r.fpDedans[p] = 1;
    }
    r.fpLong = P;
    for (let f = 0; f < C; f++) {
        r.caseInconnu[f] = 4;
        r.fileCases[f] = f; r.fcDedans[f] = 1;
    }
    r.fcLong = C;
    return r;
}

function noterBout(r, p) {
    if (r.degTrait[p] === 1) {
        if (r.rangBout[p] < 0) { r.rangBout[p] = r.nbBouts; r.bouts[r.nbBouts++] = p; }
    } else if (r.rangBout[p] >= 0) {
        const rang = r.rangBout[p], dernier = r.bouts[--r.nbBouts];
        r.bouts[rang] = dernier; r.rangBout[dernier] = rang; r.rangBout[p] = -1;
    }
}

function trouver(r, p) {
    while (r.parent[p] !== p) p = r.parent[p];
    return p;
}

function journaliserUF(r, enfant, racine) {
    const i = r.pileUFLong;
    r.pileUF[i] = enfant;
    r.pileUF[i + 1] = racine;
    r.pileUF[i + 2] = r.taille[racine];
    r.pileUF[i + 3] = r.compAretes[racine];
    r.pileUFLong = i + 4;
}

function enfilerPoint(r, p) {
    if (!r.fpDedans[p]) { r.fpDedans[p] = 1; r.filePoints[r.fpLong++] = p; }
}
function enfilerCase(r, f) {
    if (!r.fcDedans[f]) { r.fcDedans[f] = 1; r.fileCases[r.fcLong++] = f; }
}
function viderFiles(r) {
    while (r.fpLong) r.fpDedans[r.filePoints[--r.fpLong]] = 0;
    while (r.fcLong) r.fcDedans[r.fileCases[--r.fcLong]] = 0;
}

// Pose une valeur sur une arete. Renvoie false si c'est impossible ; dans
// ce cas rien n'a ete modifie.
function poser(r, e, valeur) {
    const courant = r.etat[e];
    if (courant === valeur) return true;
    if (courant !== INCONNU) return false;

    const g = r.graphe;
    const p = g.aretePoints[e * 2], q = g.aretePoints[e * 2 + 1];

    if (valeur === TRAIT) {
        // Une fois la boucle refermee, plus rien ne peut s'y rattacher.
        if (r.boucleFermee) return false;
        const rp = trouver(r, p), rq = trouver(r, q);
        if (rp === rq) {
            // Cette arete refermerait la composante sur elle-meme. Ce n'est
            // legitime que si la composante contient deja TOUS les traits
            // poses : sinon on fabrique une deuxieme boucle, et une solution
            // a deux boucles n'est pas une solution.
            if (r.compAretes[rp] !== r.nbTraits) return false;
            journaliserUF(r, -1, rp);
            r.compAretes[rp]++;
            r.boucleFermee = true;
        } else {
            let a = rp, b = rq;
            if (r.taille[a] < r.taille[b]) { const t = a; a = b; b = t; }
            journaliserUF(r, b, a);
            r.parent[b] = a;
            r.taille[a] += r.taille[b];
            r.compAretes[a] += r.compAretes[b] + 1;
        }
        r.nbTraits++;
        r.degTrait[p]++; r.degTrait[q]++;
        noterBout(r, p); noterBout(r, q);
    }

    r.etat[e] = valeur;
    r.pile[r.pileLong++] = e;
    r.nbInconnues--;
    r.degInconnu[p]--; r.degInconnu[q]--;
    enfilerPoint(r, p); enfilerPoint(r, q);

    const f1 = g.areteCases[e * 2], f2 = g.areteCases[e * 2 + 1];
    if (f1 >= 0) {
        r.caseInconnu[f1]--;
        if (valeur === TRAIT) r.caseTrait[f1]++;
        enfilerCase(r, f1);
    }
    if (f2 >= 0) {
        r.caseInconnu[f2]--;
        if (valeur === TRAIT) r.caseTrait[f2]++;
        enfilerCase(r, f2);
    }
    return true;
}

function marquer(r) {
    return { pile: r.pileLong, uf: r.pileUFLong, boucle: r.boucleFermee };
}

function defaire(r, marque) {
    const g = r.graphe;
    while (r.pileLong > marque.pile) {
        const e = r.pile[--r.pileLong];
        const valeur = r.etat[e];
        const p = g.aretePoints[e * 2], q = g.aretePoints[e * 2 + 1];
        r.etat[e] = INCONNU;
        r.nbInconnues++;
        r.degInconnu[p]++; r.degInconnu[q]++;
        if (valeur === TRAIT) {
            r.nbTraits--; r.degTrait[p]--; r.degTrait[q]--;
            noterBout(r, p); noterBout(r, q);
        }
        const f1 = g.areteCases[e * 2], f2 = g.areteCases[e * 2 + 1];
        if (f1 >= 0) { r.caseInconnu[f1]++; if (valeur === TRAIT) r.caseTrait[f1]--; }
        if (f2 >= 0) { r.caseInconnu[f2]++; if (valeur === TRAIT) r.caseTrait[f2]--; }
    }
    while (r.pileUFLong > marque.uf) {
        r.pileUFLong -= 4;
        const enfant = r.pileUF[r.pileUFLong];
        const racine = r.pileUF[r.pileUFLong + 1];
        r.taille[racine] = r.pileUF[r.pileUFLong + 2];
        r.compAretes[racine] = r.pileUF[r.pileUFLong + 3];
        if (enfant >= 0) r.parent[enfant] = enfant;
    }
    r.boucleFermee = marque.boucle;
    viderFiles(r);
}

// --- Regles ------------------------------------------------------------

// Degre d'un point : 0 ou 2 traits, jamais 1, jamais 3.
function reglePoint(r, p) {
    const g = r.graphe;
    const t = r.degTrait[p], u = r.degInconnu[p];
    if (t > 2) return false;
    if (t === 2) {
        if (u === 0) return true;
        for (let d = 0; d < 4; d++) {
            const e = g.pointAretes[p * 4 + d];
            if (e >= 0 && r.etat[e] === INCONNU && !poser(r, e, CROIX)) return false;
        }
        return true;
    }
    if (t === 1) {
        if (u === 0) return false;              // un fil qui s'arrete en l'air
        if (u === 1) {
            for (let d = 0; d < 4; d++) {
                const e = g.pointAretes[p * 4 + d];
                if (e >= 0 && r.etat[e] === INCONNU) return poser(r, e, TRAIT);
            }
        }
        return true;
    }
    if (u === 1) {                              // 0 trait et une seule issue
        for (let d = 0; d < 4; d++) {
            const e = g.pointAretes[p * 4 + d];
            if (e >= 0 && r.etat[e] === INCONNU) return poser(r, e, CROIX);
        }
    }
    return true;
}

// Connexite : une arete inconnue qui relierait les deux bouts d'un meme
// chemin est barree, sauf si ce chemin porte deja tous les traits de la
// grille (auquel cas elle refermerait la boucle finale, ce qui est le but).
function regleConnexite(r) {
    const g = r.graphe;
    for (let i = r.nbBouts - 1; i >= 0; i--) {
        const p = r.bouts[i];
        if (r.degInconnu[p] === 0) continue;
        const racine = trouver(r, p);
        if (r.compAretes[racine] === r.nbTraits) continue;
        for (let d = 0; d < 4; d++) {
            const e = g.pointAretes[p * 4 + d];
            if (e < 0 || r.etat[e] !== INCONNU) continue;
            if (trouver(r, g.autreBout(e, p)) === racine) {
                if (!poser(r, e, CROIX)) return false;
            }
        }
    }
    return true;
}

function barrerReste(r) {
    for (let e = 0; e < r.graphe.nbAretes; e++) {
        if (r.etat[e] === INCONNU && !poser(r, e, CROIX)) return false;
    }
    return true;
}

// Point fixe : on epuise les regles locales, puis seulement quand plus rien
// ne bouge on paie le cout de la regle de connexite, qui balaie la grille.
function propager(r) {
    for (;;) {
        while (r.fpLong) {
            const p = r.filePoints[--r.fpLong]; r.fpDedans[p] = 0;
            if (!reglePoint(r, p)) return false;
        }
        if (r.fcLong) {
            const f = r.fileCases[--r.fcLong]; r.fcDedans[f] = 0;
            if (!r.contraintes.regleCase(r, f)) return false;
            continue;
        }
        if (r.boucleFermee && r.nbInconnues > 0) {
            if (!barrerReste(r)) return false;
            continue;
        }
        if (r.options.connexite) {
            const avant = r.pileLong;
            if (!regleConnexite(r)) return false;
            if (r.pileLong !== avant) continue;
        }
        return true;
    }
}

// --- Etat terminal -----------------------------------------------------

function estResolu(r) {
    return r.nbInconnues === 0 && r.boucleFermee && r.nbTraits > 0
        && r.contraintes.estSatisfait(r.etat);
}

// --- Choix de l'arete de branchement -----------------------------------

// Prolonger un fil deja commence fait tomber les deductions en cascade ;
// partir d'une arete isolee ne deduit rien. On branche donc en priorite au
// bout d'un chemin, et a defaut sur la case la plus proche de sa saturation.
function choisirArete(r) {
    const g = r.graphe;
    // Parmi les bouts de fil, celui qui a le moins d'issues : c'est la ou
    // se tromper coute le moins cher, et ou la deduction repart le plus vite.
    let bout = -1, moinsDIssues = 5;
    for (let i = 0; i < r.nbBouts; i++) {
        const p = r.bouts[i];
        const issues = r.degInconnu[p];
        if (issues > 0 && issues < moinsDIssues) { moinsDIssues = issues; bout = p; }
    }
    if (bout >= 0) {
        for (let d = 0; d < 4; d++) {
            const e = g.pointAretes[bout * 4 + d];
            if (e >= 0 && r.etat[e] === INCONNU) return e;
        }
    }
    let meilleure = -1, meilleurScore = -1;
    for (let f = 0; f < g.nbCases; f++) {
        if (r.contraintes.indices[f] < 0 || r.caseInconnu[f] === 0) continue;
        const score = 4 - r.caseInconnu[f];
        if (score > meilleurScore) {
            for (let d = 0; d < 4; d++) {
                const e = g.caseAretes[f * 4 + d];
                if (r.etat[e] === INCONNU) { meilleure = e; meilleurScore = score; break; }
            }
        }
    }
    if (meilleure >= 0) return meilleure;
    for (let e = 0; e < g.nbAretes; e++) if (r.etat[e] === INCONNU) return e;
    return -1;
}

// --- Recherche ---------------------------------------------------------

function explorer(r, limite, profondeur, capture) {
    r.noeuds++;
    if (profondeur > r.profondeurMax) r.profondeurMax = profondeur;
    if (r.nbInconnues === 0) {
        if (!estResolu(r)) return 0;
        if (capture && !capture.etat) capture.etat = r.etat.slice();
        return 1;
    }
    const e = choisirArete(r);
    if (e < 0) return 0;
    let total = 0;
    const essais = [TRAIT, CROIX];
    for (let i = 0; i < 2; i++) {
        const marque = marquer(r);
        if (poser(r, e, essais[i]) && propager(r)) {
            total += explorer(r, limite - total, profondeur + 1, capture);
        }
        defaire(r, marque);
        if (total >= limite) break;
    }
    return total;
}

// Compte les solutions, en s'arretant des que `limite` est atteinte. C'est
// avec limite = 2 que le generateur garantira l'unicite.
function compterSolutions(contraintes, limite, capture) {
    limite = limite || 2;
    const r = creerRecherche(contraintes);
    if (contraintes.pretraitement && !contraintes.pretraitement(r)) return 0;
    if (!propager(r)) return 0;
    const n = explorer(r, limite, 0, capture);
    if (capture) { capture.noeuds = r.noeuds; capture.profondeur = r.profondeurMax; }
    return n;
}

// Renvoie la solution si elle est unique, sinon null.
function resoudre(contraintes) {
    const capture = {};
    return compterSolutions(contraintes, 2, capture) === 1 ? capture.etat : null;
}

// Essais et erreurs : on suppose une arete, on propage, et si l'hypothese
// se contredit, l'etat oppose est certain. A profondeur > 1, l'hypothese a
// elle-meme le droit de faire des essais moins profonds.
// Ou tenter une hypothese ? Poser une arete au milieu d'une zone encore
// vierge ne deduit a peu pres rien et coute le meme prix qu'ailleurs. On ne
// tente donc que les aretes qui touchent quelque chose de deja decide - un
// bout de fil, ou une case dont on sait deja quelque chose. Restreindre les
// candidates ne peut qu'affaiblir la deduction, jamais la rendre fausse.
function meriteUnEssai(r, e) {
    const g = r.graphe;
    const p = g.aretePoints[e * 2], q = g.aretePoints[e * 2 + 1];
    if (r.degTrait[p] > 0 || r.degTrait[q] > 0) return true;
    if (r.degInconnu[p] < g.pointNbAretes[p] || r.degInconnu[q] < g.pointNbAretes[q]) return true;
    const f1 = g.areteCases[e * 2], f2 = g.areteCases[e * 2 + 1];
    if (f1 >= 0 && r.contraintes.indices[f1] >= 0 && r.caseInconnu[f1] < 4) return true;
    if (f2 >= 0 && r.contraintes.indices[f2] >= 0 && r.caseInconnu[f2] < 4) return true;
    return false;
}

function resoudreParEssais(r, profondeur) {
    let progres = true;
    while (progres) {
        progres = false;
        for (let e = 0; e < r.graphe.nbAretes; e++) {
            if (r.etat[e] !== INCONNU) continue;
            if (!meriteUnEssai(r, e)) continue;
            const valeurs = [TRAIT, CROIX];
            for (let i = 0; i < 2; i++) {
                const marque = marquer(r);
                let tenable = poser(r, e, valeurs[i]) && propager(r);
                if (tenable && profondeur > 1) tenable = resoudreParEssais(r, profondeur - 1);
                defaire(r, marque);
                if (!tenable) {
                    const oppose = valeurs[i] === TRAIT ? CROIX : TRAIT;
                    if (!poser(r, e, oppose) || !propager(r)) return false;
                    progres = true;
                    break;
                }
            }
        }
    }
    return true;
}

// Resolution par deduction pure, a une force donnee. Aucune enumeration :
// chaque arete posee l'a ete parce qu'elle etait forcee. D'ou la propriete
// qui fait tout l'interet de cette fonction pour le generateur : si elle
// resout la grille, la solution est unique, et il n'y a rien a prouver.
//   niveau 1 : chiffres et degres      niveau 3 : + hypotheses simples
//   niveau 2 : + connexite             niveau 4 : + hypotheses imbriquees
function resoudreParDeduction(contraintes, niveau) {
    const r = creerRecherche(contraintes, { connexite: niveau >= 2 });
    let ok = !contraintes.pretraitement || contraintes.pretraitement(r);
    if (ok) ok = propager(r);
    if (ok && niveau >= 3) ok = resoudreParEssais(r, niveau - 2);
    return (ok && estResolu(r)) ? r.etat : null;
}

// Difficulte reelle : la technique la plus avancee qu'il a fallu employer.
// On rejoue la resolution en n'autorisant qu'une strate a la fois, et on
// s'arrete a la premiere qui suffit.
// options.solutions : nombre de solutions deja connu, pour ne pas le
// recompter. options.plafond : au-dela de ce niveau, inutile de chercher
// plus fin - on rend plafond + 1 et on s'arrete. Les strates profondes
// coutent cher, et l'appelant sait souvent qu'il n'en a pas besoin.
function analyser(contraintes, options) {
    options = options || {};
    const solutions = options.solutions !== undefined
        ? options.solutions : compterSolutions(contraintes, 2);
    if (solutions !== 1) {
        return { solutions: solutions, niveau: 0, profondeur: 0, noeuds: 0 };
    }
    const plafond = options.plafond || 4;
    const strates = [
        { niveau: 1, connexite: false, essais: 0 },
        { niveau: 2, connexite: true, essais: 0 },
        { niveau: 3, connexite: true, essais: 1 },
        { niveau: 4, connexite: true, essais: 2 }
    ];
    for (let i = 0; i < strates.length; i++) {
        const s = strates[i];
        if (s.niveau > plafond) return { solutions: 1, niveau: plafond + 1, profondeur: 0, noeuds: 0 };
        if (resoudreParDeduction(contraintes, s.niveau)) {
            return { solutions: 1, niveau: s.niveau, profondeur: s.essais, noeuds: 0 };
        }
    }
    if (plafond < 5) return { solutions: 1, niveau: 5, profondeur: 0, noeuds: 0 };
    const capture = {};
    compterSolutions(contraintes, 2, capture);
    return { solutions: 1, niveau: 5, profondeur: capture.profondeur, noeuds: capture.noeuds };
}

export { INCONNU, TRAIT, CROIX, creerRecherche, poser, propager, marquer, defaire, trouver, estResolu, compterSolutions, resoudre, resoudreParEssais, resoudreParDeduction, analyser };
