// Les poignees sur le document, et rien d'autre. Isoler les getElementById ici
// evite que chaque module aille pecher dans le DOM de son cote, et donne un
// seul endroit a corriger quand une balise change de nom.

const attraper = (id) => document.getElementById(id);

const elements = {
    svg: attraper('grille'),
    plateau: attraper('plateau'),
    voile: attraper('voile'),
    niveau: attraper('etiquette-niveau'),
    niveauDetail: attraper('niveau-detail'),
    taille: attraper('etiquette-taille'),
    chiffres: attraper('etiquette-chiffres'),
    chrono: attraper('chrono'),
    annuler: attraper('bouton-annuler'),
    refaire: attraper('bouton-refaire'),
    reglages: attraper('reglages'),
    choixTaille: attraper('choix-taille'),
    choixNiveau: attraper('choix-niveau'),
    fanfare: attraper('fanfare'),
    fanfareDetail: attraper('fanfare-detail'),
    encore: attraper('bouton-encore'),
    aide: attraper('aide'),
    ouvrirAide: attraper('bouton-aide'),
    fermerAide: attraper('bouton-fermer-aide'),
    annonce: attraper('annonce'),
    defi: attraper('bouton-defi'),
    serie: attraper('serie'),
    lien: attraper('bouton-lien'),
    copier: attraper('bouton-copier')
};

function formaterDuree(ms) {
    const total = Math.floor(ms / 1000);
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

// Le bandeau au-dessus de la grille : ce qu'on joue, et depuis combien de temps.
function afficherGrille(grille) {
    elements.niveau.textContent = grille.difficulte.nom;
    elements.niveauDetail.textContent = grille.difficulte.detail;
    elements.taille.textContent = grille.L + '×' + grille.H;
    elements.chiffres.textContent = grille.nbChiffres + ' chiffres';
}

function afficherChrono(ms) { elements.chrono.textContent = formaterDuree(ms); }

function afficherBoutons(peutAnnuler, peutRefaire) {
    elements.annuler.disabled = !peutAnnuler;
    elements.refaire.disabled = !peutRefaire;
}

function annoncer(texte) { elements.annonce.textContent = texte; }

function afficherVoile(visible) { elements.voile.hidden = !visible; }

function afficherFanfare(grille, ms, gestes) {
    elements.fanfareDetail.textContent =
        grille.L + ' × ' + grille.H + ' · ' + grille.difficulte.nom + '\n' +
        'bouclé en ' + formaterDuree(ms) + ' · ' + gestes + ' gestes';
    elements.fanfare.hidden = false;
    elements.encore.focus();
}

function cacherFanfare() { elements.fanfare.hidden = true; }

// La serie ne s'affiche que si elle existe : « série de 0 jours » serait un
// reproche, pas une information.
function afficherSerie(stats) {
    if (!stats || !stats.serie) { elements.serie.hidden = true; return; }
    const jours = stats.serie > 1 ? stats.serie + ' jours' : '1 jour';
    let texte = 'série de ' + jours;
    if (stats.record > stats.serie) texte += ' · record ' + stats.record;
    elements.serie.textContent = texte;
    elements.serie.hidden = false;
}

// Le bouton du jour porte la couleur de la boucle achevee quand le defi est
// deja boucle : on voit d'un coup d'oeil s'il reste quelque chose a faire.
function marquerDefiFait(fait) {
    elements.defi.classList.toggle('fait', fait);
    elements.defi.setAttribute('aria-label', fait ? 'Grille du jour (déjà bouclée)' : 'Grille du jour');
}

// Le presse-papier n'est pas disponible partout, et il exige parfois un geste
// de l'utilisateur : on rend un booleen plutot que de laisser une promesse
// rejetee filer dans la console.
async function copier(texte) {
    try {
        if (navigator.clipboard && isSecureContext) {
            await navigator.clipboard.writeText(texte);
            return true;
        }
    } catch { /* on tente l'autre voie */ }
    try {
        const zone = document.createElement('textarea');
        zone.value = texte;
        zone.setAttribute('readonly', '');
        zone.style.position = 'fixed';
        zone.style.opacity = '0';
        document.body.appendChild(zone);
        zone.select();
        const reussi = document.execCommand('copy');
        document.body.removeChild(zone);
        return reussi;
    } catch { return false; }
}

// Un bouton qui dit ce qu'il vient de faire, puis reprend son nom.
function confirmerBouton(bouton, message) {
    if (bouton.dataset.repos === undefined) bouton.dataset.repos = bouton.textContent;
    bouton.textContent = message;
    clearTimeout(Number(bouton.dataset.minuterie));
    bouton.dataset.minuterie = String(setTimeout(() => {
        bouton.textContent = bouton.dataset.repos;
    }, 1800));
}

export {
    elements, formaterDuree, afficherGrille, afficherChrono, afficherBoutons,
    annoncer, afficherVoile, afficherFanfare, cacherFanfare,
    afficherSerie, marquerDefiFait, copier, confirmerBouton
};
