// js/roster.js
// Base de datos oficial - Primera Generación (Ver. 1) - Código Limpio

const ROSTER = {
    huevo:        { nombre: "DigiEgg",      gif: "https://bogleech.com/halloween/digimon/egg.gif" },
    botamon:      { nombre: "Botamon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/d/d7/Botamon_vpet_ani.gif" },
    koromon:      { nombre: "Koromon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/1/18/Koromon_vpet_ani.gif" },
    agumon:       { nombre: "Agumon",       gif: "https://vignette.wikia.nocookie.net/digimon/images/4/4c/Agumon_dst_ani.gif" },
    betamon:      { nombre: "Betamon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/6/6c/Betamon_dst_ani.gif" },
    greymon:      { nombre: "Greymon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/a/a9/Greymon_dst_ani.gif" },
    tyranomon:    { nombre: "Tyranomon",    gif: "https://vignette.wikia.nocookie.net/digimon/images/1/15/Tyrannomon_dst_ani.gif" },
    devimon:      { nombre: "Devimon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/a/ac/Devimon_dst_ani.gif" },
    meramon:      { nombre: "Meramon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/e/ed/Meramon_dst_ani.gif" },
    seadramon:    { nombre: "Seadramon",    gif: "https://vignette.wikia.nocookie.net/digimon/images/4/41/Seadramon_dst_ani.gif" },
    numemon:      { nombre: "Numemon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/6/66/Numemon_dst_ani.gif" },
    metalgreymon: { nombre: "M-Greymon",    gif: "https://vignette.wikia.nocookie.net/digimon/images/4/42/MetalGreymon_Blue_dst_ani.gif" },
    mamemon:      { nombre: "Mamemon",      gif: "https://vignette.wikia.nocookie.net/digimon/images/4/43/Mamemon_dst_ani.gif" },
    monzaemon:    { nombre: "Monzaemon",    gif: "https://vignette.wikia.nocookie.net/digimon/images/2/22/Monzaemon_dst_ani.gif" },
    muerto:       { nombre: "Graveyard",    gif: "https://bogleech.com/halloween/digimon/obituary.gif" }
};

function getAnimatedSprite(id) {
    let url = ROSTER[id] ? ROSTER[id].gif : ROSTER['huevo'].gif;
    return `<img class="sprite-render" src="${url}">`;
}