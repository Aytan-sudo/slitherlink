import { readFileSync } from 'node:fs';
import { counter } from './harness.mjs';

const { check, report } = counter();
console.log('\nPalette\n');

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

// La palette de reference. Elle est ecrite ici en toutes lettres pour qu'une
// couleur modifiee dans le CSS sans intention se signale d'elle-meme.
const PALETTE = {
    '--indigo': '#16233F',
    '--indigo-clair': '#22355C',
    '--ecru': '#F0E7D8',
    '--craie': '#7E92B4',
    '--garance': '#D8503F',
    '--safran': '#E8B54A'
};

const debutRacine = css.indexOf(':root {');
const finRacine = css.indexOf('}', debutRacine);
const racine = css.slice(debutRacine, finRacine);
const declarees = {};
for (const [, nom, valeur] of racine.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declarees[nom] = valeur.trim();
}

for (const [nom, attendu] of Object.entries(PALETTE)) {
    check(`${nom} vaut ${attendu}`, declarees[nom] === attendu, declarees[nom] ?? 'absente');
}

const couleursDeclarees = Object.keys(declarees).filter((nom) => /^#|^rgb/.test(declarees[nom]));
check('aucune couleur declaree hors de la palette de reference',
    couleursDeclarees.every((nom) => nom in PALETTE),
    couleursDeclarees.filter((nom) => !(nom in PALETTE)).join(', '));

// Une variable declaree que personne n'utilise est une variable oubliee.
const inutilisees = Object.keys(declarees).filter((nom) => !css.includes(`var(${nom})`));
check('aucune variable declaree puis oubliee', inutilisees.length === 0, inutilisees.join(', '));

// Et l'inverse : une couleur ecrite en dur ailleurs que dans :root echappe au
// theme. Les rgba() derives de la palette sont tolerees, pas les hex.
const horsRacine = css.slice(0, debutRacine) + css.slice(finRacine);
const hexEnDur = [...horsRacine.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
check('aucune couleur hexadecimale en dur hors de :root', hexEnDur.length === 0, hexEnDur.join(', '));

// Les deux endroits ou la couleur de fond est fatalement recopiee hors du CSS.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifeste = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
check('la meta theme-color suit la palette',
    html.includes(`content="${PALETTE['--indigo']}"`), 'meta theme-color');
check('le manifeste suit la palette',
    manifeste.theme_color === PALETTE['--indigo'] && manifeste.background_color === PALETTE['--indigo'],
    `${manifeste.theme_color} / ${manifeste.background_color}`);

report();
