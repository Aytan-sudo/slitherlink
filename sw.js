// Service worker : rend le jeu jouable hors ligne.
//
// Le jeu tient en quelques dizaines de kilo-octets et n'a aucune donnee a
// charger : tout est mis en cache a l'installation. On sert ensuite reseau
// d'abord, cache en secours. Le cache-first serait plus rapide et c'est un
// piege : un `git push` resterait invisible pour tous ceux qui ont deja ouvert
// le jeu, jusqu'a ce qu'on pense a changer VERSION a la main.

const VERSION = 'slitherlink-v6';
const COQUILLE = [
    './',
    'index.html',
    'commun/passeport.js',
    'commun/liaison.js',
    'commun/passeport.css',
    'manifest.webmanifest',
    'css/style.css',
    'js/app.js',
    'js/boucle.js',
    'js/codage.js',
    'js/defi.js',
    'js/difficulte.js',
    'js/generateur.js',
    'js/gestes.js',
    'js/graphe.js',
    'js/hasard.js',
    'js/historique.js',
    'js/region.js',
    'js/slitherlink.js',
    'js/stockage.js',
    'js/ui.js',
    'js/vue.js',
    'assets/icon.svg',
    'assets/icon-180.png',
    'assets/icon-192.png',
    'assets/icon-512.png'
];

self.addEventListener('install', (evenement) => {
    evenement.waitUntil(
        caches.open(VERSION).then((cache) => cache.addAll(COQUILLE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (evenement) => {
    evenement.waitUntil(
        caches.keys()
            .then((cles) => Promise.all(cles.filter((cle) => cle.startsWith('slitherlink-v') && cle !== VERSION).map((cle) => caches.delete(cle))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (evenement) => {
    const requete = evenement.request;
    if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;
    evenement.respondWith(
        fetch(requete)
            .then((reponse) => {
                const copie = reponse.clone();
                caches.open(VERSION).then((cache) => cache.put(requete, copie));
                return reponse;
            })
            .catch(() => caches.match(requete).then((cache) => cache || caches.match('index.html')))
    );
});
