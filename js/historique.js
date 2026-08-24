// Annuler / refaire, sans limite. Un glisse compte pour un seul geste : le
// joueur qui trace huit aretes d'un trait s'attend a les voir disparaitre
// d'un seul Ctrl+Z, pas a appuyer huit fois.

function creerHistorique(appliquer) {
    const passe = [];
    const futur = [];
    let lot = null;

    return {
        // Ouvre un geste. Tout ce qui est note avant `fermer` n'en fera qu'un.
        ouvrir: function () { lot = []; },
        noter: function (arete, avant, apres) {
            if (avant === apres) return;
            if (lot) lot.push({ arete: arete, avant: avant, apres: apres });
        },
        fermer: function () {
            if (lot && lot.length) { passe.push(lot); futur.length = 0; }
            lot = null;
        },
        annuler: function () {
            const geste = passe.pop();
            if (!geste) return false;
            for (let i = geste.length - 1; i >= 0; i--) appliquer(geste[i].arete, geste[i].avant);
            futur.push(geste);
            return true;
        },
        refaire: function () {
            const geste = futur.pop();
            if (!geste) return false;
            for (let i = 0; i < geste.length; i++) appliquer(geste[i].arete, geste[i].apres);
            passe.push(geste);
            return true;
        },
        peutAnnuler: function () { return passe.length > 0; },
        peutRefaire: function () { return futur.length > 0; },
        nbGestes: function () { return passe.length; },
        vider: function () { passe.length = 0; futur.length = 0; lot = null; }
    };
}

export { creerHistorique };
