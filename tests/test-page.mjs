import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { counter } from './harness.mjs';

const { check, report } = counter();
console.log('\nCoquille de la page\n');

const lire = (nom) => readFileSync(new URL('../' + nom, import.meta.url), 'utf8');
const existe = (nom) => existsSync(new URL('../' + nom, import.meta.url));

const html = lire('index.html');
const sw = lire('sw.js');
const modules = readdirSync(new URL('../js', import.meta.url)).filter((f) => f.endsWith('.js')).sort();

// index.html n'appelle qu'un module et ne contient aucune logique. Seuls s'y
// ajoutent les scripts communs du passeport, fournis tels quels par le hub.
const communs = [...html.matchAll(/<script([^>]*)>/g)].map((m) => m[1]).filter((a) => /src="commun\//.test(a));
check('les scripts communs du passeport sont charges', communs.length === 2, communs.length);
const scripts = [...html.matchAll(/<script([^>]*)>/g)].map((m) => m[1]).filter((a) => !/src="commun\//.test(a));
check('index.html ne charge qu un seul script', scripts.length === 1, scripts.length);
check('et c est un module', scripts[0] && scripts[0].includes('type="module"'), scripts[0]);
const enLigne = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].filter((m) => m[1].trim());
check('index.html ne contient aucun script en ligne', enLigne.length === 0, enLigne.length);

// Le piege classique : ajouter un module et oublier le service worker. Le jeu
// marche en ligne, et se casse hors ligne, sans que rien ne le signale.
const manquants = modules.filter((f) => !sw.includes(`js/${f}`));
check('le service worker liste tous les modules', manquants.length === 0, manquants.join(', '));

const enTrop = [...sw.matchAll(/'js\/([\w.-]+)'/g)].map((m) => m[1]).filter((f) => !modules.includes(f));
check('et aucun module fantome', enTrop.length === 0, enTrop.join(', '));

// Tout ce que la coquille promet doit exister sur le disque.
const coquille = [...sw.matchAll(/^\s+'([^']+)',?$/gm)].map((m) => m[1]).filter((f) => f !== './');
const absents = coquille.filter((f) => !existe(f));
check('tous les fichiers de la coquille existent', absents.length === 0, absents.join(', '));

const manifeste = JSON.parse(lire('manifest.webmanifest'));
const iconesAbsentes = manifeste.icons.map((i) => i.src).filter((f) => !existe(f));
check('toutes les icones du manifeste existent', iconesAbsentes.length === 0, iconesAbsentes.join(', '));
check('le manifeste est du francais', manifeste.lang === 'fr');
check('le manifeste demarre en relatif', manifeste.start_url === './' && manifeste.scope === './');

report();
