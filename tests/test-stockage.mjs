import {
    chargerSerie, serieApres, enregistrerReussite,
    enregistrerPartie, chargerPartie, oublierPartie, ajouterTraitsPasseport,
    coffreEnMemoire, SERIE_VIDE, CLE_SERIE
} from '../js/stockage.js';
import { counter } from './harness.mjs';

const { check, report } = counter();
console.log('\nSerie et sauvegarde\n');

// ------------------------------------------------------------- la serie

check('sans rien d enregistre, la serie est vide',
    chargerSerie(coffreEnMemoire()).serie === 0);

// La regle est isolee et pure : c'est elle qu'on eprouve, pas le stockage.
{
    const depart = { ...SERIE_VIDE };
    const premier = serieApres(depart, '2026-08-24');
    check('la premiere reussite ouvre la serie a un', premier.serie === 1, premier.serie);
    check('et le jour est retenu', premier.dernierJour === '2026-08-24');

    const lendemain = serieApres(premier, '2026-08-25');
    check('un jour consecutif fait monter la serie', lendemain.serie === 2, lendemain.serie);

    const rejoue = serieApres(lendemain, '2026-08-25');
    check('rejouer le meme jour ne compte pas deux fois', rejoue.serie === 2, rejoue.serie);
    check('et ne gonfle pas le total de grilles reussies', rejoue.reussis === lendemain.reussis);

    const apresUnTrou = serieApres(lendemain, '2026-08-27');
    check('sauter un jour casse la serie', apresUnTrou.serie === 1, apresUnTrou.serie);
    check('mais le record est conserve', apresUnTrou.record === 2, apresUnTrou.record);
    check('et le total de grilles reussies continue de monter', apresUnTrou.reussis === 3, apresUnTrou.reussis);
}

// Le changement de mois est le moment ou une comparaison de chaines echouerait.
{
    let etat = { ...SERIE_VIDE };
    for (const jour of ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']) etat = serieApres(etat, jour);
    check('la serie traverse un changement de mois', etat.serie === 4, etat.serie);

    let annee = { ...SERIE_VIDE };
    for (const jour of ['2026-12-31', '2027-01-01']) annee = serieApres(annee, jour);
    check('la serie traverse un changement d annee', annee.serie === 2, annee.serie);
}

// ------------------------------------------------------- ce qui est ecrit

{
    const coffre = coffreEnMemoire();
    enregistrerReussite('2026-08-24', coffre);
    const relu = enregistrerReussite('2026-08-25', coffre);
    check('la serie survit a un rechargement', relu.serie === 2 && chargerSerie(coffre).serie === 2);
    check('et le record aussi', chargerSerie(coffre).record === 2);
}

// Un stockage abime ne doit pas empecher de jouer.
{
    const coffre = coffreEnMemoire();
    coffre.setItem(CLE_SERIE, 'ceci n est pas du JSON');
    check('un stockage illisible retombe sur une serie vide', chargerSerie(coffre).serie === 0);

    coffre.setItem(CLE_SERIE, '{"serie":"beaucoup","dernierJour":42}');
    const abime = chargerSerie(coffre);
    check('des valeurs aberrantes sont ramenees a quelque chose de sain',
        abime.serie === 0 && abime.dernierJour === null, JSON.stringify(abime));
}

// Un coffre qui refuse d ecrire - navigation privee - ne doit rien casser.
{
    const coffreHostile = {
        getItem: () => null,
        setItem: () => { throw new Error('quota depasse'); },
        removeItem: () => { throw new Error('non'); }
    };
    let planté = false;
    try {
        enregistrerReussite('2026-08-24', coffreHostile);
        enregistrerPartie({ grille: 'x', etat: 'y' }, coffreHostile);
        oublierPartie(coffreHostile);
    } catch { planté = true; }
    check('un stockage qui refuse d ecrire ne fait pas planter le jeu', !planté);
}

// -------------------------------------------------------- la partie en cours

{
    const coffre = coffreEnMemoire();
    check('sans partie enregistree, on ne restaure rien', chargerPartie(coffre) === null);

    enregistrerPartie({ grille: '7.7.a1b2', etat: 'AAAA', defi: '2026-08-24' }, coffre);
    const relue = chargerPartie(coffre);
    check('la partie en cours se recharge', relue !== null && relue.grille === '7.7.a1b2');
    check('et se souvient du defi auquel elle appartient', relue.defi === '2026-08-24');

    oublierPartie(coffre);
    check('une partie finie est oubliee', chargerPartie(coffre) === null);

    // L'etat sans la grille s'appliquerait a n'importe quoi : on refuse.
    enregistrerPartie({ etat: 'AAAA' }, coffre);
    check('un etat sans sa grille est rejete', chargerPartie(coffre) === null);
}

// Le compteur de traits du tampon Logique : cumule sur la journee, remis a zero
// le lendemain, et muet en mode invite, ou il n'y a pas de passeport.
{
    const coffre = coffreEnMemoire();
    check('en mode invite, rien n est compte', ajouterTraitsPasseport(5, '2026-09-15') === null);
    ajouterTraitsPasseport(12, '2026-09-15', coffre);
    check('les traits de plusieurs grilles s additionnent', ajouterTraitsPasseport(18, '2026-09-15', coffre) === 30);
    check('confier zero trait ne change rien', ajouterTraitsPasseport(0, '2026-09-15', coffre) === 30);
    check('le lendemain, le compte repart', ajouterTraitsPasseport(4, '2026-09-16', coffre) === 4);
    coffre.setItem('slitherlink.passeport', '{casse');
    check('un compteur illisible repart proprement', ajouterTraitsPasseport(2, '2026-09-16', coffre) === 2);
}

report();
