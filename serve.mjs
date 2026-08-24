// Petit serveur statique, sans aucune dependance. Il existe pour une seule
// raison : les modules ES ne se chargent pas depuis file://, le navigateur les
// refuse pour cause d'origine opaque. Ouvrir index.html au double-clic donne
// donc une page blanche - il faut passer par http, meme en local.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RACINE = new URL('.', import.meta.url).pathname;
const PORT = Number(process.env.PORT) || 8765;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
};

const serveur = createServer(async (requete, reponse) => {
    const chemin = decodeURIComponent(new URL(requete.url, 'http://localhost').pathname);
    // normalize ecrase les ../ : sans ca, une requete bien tournee lirait
    // n'importe quel fichier de la machine.
    const relatif = normalize(chemin === '/' ? 'index.html' : chemin.slice(1));
    if (relatif.startsWith('..')) { reponse.writeHead(403).end('interdit'); return; }
    try {
        const contenu = await readFile(join(RACINE, relatif));
        reponse.writeHead(200, {
            'Content-Type': TYPES[extname(relatif)] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        reponse.end(contenu);
    } catch {
        reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('introuvable');
    }
});

serveur.on('error', (erreur) => {
    if (erreur.code === 'EADDRINUSE') {
        console.error(`Le port ${PORT} est deja pris. Essayez : PORT=8766 npm run serve`);
        process.exit(1);
    }
    throw erreur;
});

serveur.listen(PORT, () => {
    console.log(`Slitherlink sur http://localhost:${PORT}/`);
});
