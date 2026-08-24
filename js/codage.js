// Encodage d'une grille et d'une partie, pour tenir dans un lien.
//
// Deux exigences se contredisent : un hash d'URL doit rester court, et il doit
// rester debogable a l'oeil. Les chiffres sont donc ecrits en clair - un
// caractere par case, une lettre pour dire « n cases vides » - tandis que
// l'etat des aretes, illisible de toute facon, part en base64url a deux bits
// par arete.
//
// Aucun appel a btoa ni a Buffer : le premier n'existe pas partout en Node, le
// second pas du tout dans un navigateur. Une table de 64 caracteres suffit.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const INVERSE = (() => {
    const table = new Int8Array(128).fill(-1);
    for (let i = 0; i < ALPHABET.length; i++) table[ALPHABET.charCodeAt(i)] = i;
    return table;
})();

function octetsVersBase64(octets) {
    let sortie = '';
    for (let i = 0; i < octets.length; i += 3) {
        const a = octets[i], b = octets[i + 1], c = octets[i + 2];
        const reste = octets.length - i;
        sortie += ALPHABET[a >> 2];
        sortie += ALPHABET[((a & 3) << 4) | (reste > 1 ? b >> 4 : 0)];
        if (reste > 1) sortie += ALPHABET[((b & 15) << 2) | (reste > 2 ? c >> 6 : 0)];
        if (reste > 2) sortie += ALPHABET[c & 63];
    }
    return sortie;
}

function base64VersOctets(texte) {
    const octets = [];
    let accumulateur = 0, bits = 0;
    for (let i = 0; i < texte.length; i++) {
        const valeur = texte.charCodeAt(i) < 128 ? INVERSE[texte.charCodeAt(i)] : -1;
        if (valeur < 0) return null;
        accumulateur = (accumulateur << 6) | valeur;
        bits += 6;
        if (bits >= 8) { bits -= 8; octets.push((accumulateur >> bits) & 255); }
    }
    return Uint8Array.from(octets);
}

// --- Les chiffres ----------------------------------------------------------

// « 2.1a3 » : un 2, un 1, une case vide, un 3. Les suites de cases vides
// s'ecrivent 'a' pour une, 'b' pour deux, jusqu'a 'z' pour vingt-six.
function encoderChiffres(chiffres) {
    let sortie = '', vides = 0;
    const purger = () => {
        while (vides > 0) {
            const paquet = Math.min(26, vides);
            sortie += String.fromCharCode(96 + paquet);
            vides -= paquet;
        }
    };
    for (const valeur of chiffres) {
        if (valeur < 0) { vides++; continue; }
        purger();
        sortie += String(valeur);
    }
    purger();
    return sortie;
}

function decoderChiffres(texte, attendus) {
    const chiffres = [];
    for (const caractere of texte) {
        if (caractere >= '0' && caractere <= '3') chiffres.push(caractere.charCodeAt(0) - 48);
        else if (caractere >= 'a' && caractere <= 'z') {
            const vides = caractere.charCodeAt(0) - 96;
            for (let i = 0; i < vides; i++) chiffres.push(-1);
        } else return null;
        if (chiffres.length > attendus) return null;
    }
    return chiffres.length === attendus ? chiffres : null;
}

function encoderGrille(grille) {
    return grille.L + '.' + grille.H + '.' + encoderChiffres(grille.chiffres);
}

function decoderGrille(texte) {
    const morceaux = String(texte).split('.');
    if (morceaux.length !== 3) return null;
    const L = Number(morceaux[0]), H = Number(morceaux[1]);
    // Les bornes ne sont pas de la coquetterie : un lien bricole annoncant du
    // 900x900 lancerait une generation de plusieurs minutes.
    if (!Number.isInteger(L) || !Number.isInteger(H) || L < 2 || H < 2 || L > 30 || H > 30) return null;
    const chiffres = decoderChiffres(morceaux[2], L * H);
    return chiffres ? { L, H, chiffres } : null;
}

// --- L'etat des aretes -----------------------------------------------------

function encoderEtat(etat) {
    const octets = new Uint8Array(Math.ceil(etat.length / 4));
    for (let i = 0; i < etat.length; i++) {
        octets[i >> 2] |= (etat[i] & 3) << ((i & 3) * 2);
    }
    return octetsVersBase64(octets);
}

function decoderEtat(texte, nbAretes) {
    const octets = base64VersOctets(texte);
    if (!octets || octets.length < Math.ceil(nbAretes / 4)) return null;
    const etat = new Int8Array(nbAretes);
    for (let i = 0; i < nbAretes; i++) {
        const valeur = (octets[i >> 2] >> ((i & 3) * 2)) & 3;
        // 3 ne veut rien dire : le lien a ete tronque ou bricole.
        if (valeur === 3) return null;
        etat[i] = valeur;
    }
    return etat;
}

// --- Le lien entier --------------------------------------------------------

function encoderLien(grille, etat) {
    let hash = '#p=' + encoderGrille(grille);
    if (etat && etat.some((valeur) => valeur !== 0)) hash += '&s=' + encoderEtat(etat);
    return hash;
}

// Rend { grille, etat } ; etat vaut null si le lien n'en portait pas, et la
// fonction entiere rend null des que quoi que ce soit ne colle pas. Un lien
// venu de l'exterieur n'a aucune raison d'etre cru sur parole.
function lireLien(hash, nbAretesPour) {
    if (!hash) return null;
    const parametres = new URLSearchParams(hash.replace(/^#/, ''));
    const grille = decoderGrille(parametres.get('p') || '');
    if (!grille) return null;
    const brut = parametres.get('s');
    if (!brut) return { grille, etat: null };
    const etat = decoderEtat(brut, nbAretesPour(grille.L, grille.H));
    return etat ? { grille, etat } : { grille, etat: null };
}

export {
    encoderGrille, decoderGrille, encoderChiffres, decoderChiffres,
    encoderEtat, decoderEtat, encoderLien, lireLien
};
