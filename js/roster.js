// Web de los sprites ( https://www.spriters-resource.com/lcd_handhelds/digimonpendulumcolor/ )
// Configuración global de la cuadrícula
const SHEET_CONFIG = {
    // Reemplaza esto con tu URL de GitHub cuando la subas
    url: "https://raw.githubusercontent.com/core-zer0/DigipetR1/refs/heads/main/sprites/Spritesheet1.png",
    startX: 96, // Píxeles de margen izquierdo (donde acaban los nombres y empiezan los sprites) - A AJUSTAR
    startY: 44,  // Píxeles de margen superior (donde acaban los textos de cabecera) - A AJUSTAR
    w: 16,       // Ancho estándar de un frame de Pendulum Color - A AJUSTAR
    h: 16,        // Alto estándar de un frame - A AJUSTAR
    sheetW: 300, // <--- AÑADE ESTO (ancho total de tu archivo png)
    sheetH: 605  // <--- AÑADE ESTO (alto total de tu archivo png)

};

// Diccionario de columnas según el estado (Animation Mapper)
const ANIMATIONS = {
    idle:   { col: 0,  frames: 2 },
    eat:    { col: 2,  frames: 2 },
    sleep:  { col: 4,  frames: 2 },
    refuse: { col: 6,  frames: 1 },
    happy:  { col: 7,  frames: 1 },
    angry:  { col: 8,  frames: 1 },
    hurt:   { col: 9,  frames: 1 },
    sad:    { col: 10, frames: 1 },
    attack: { col: 11, frames: 1 }
};

// Base de datos (ordenada por filas del 0 al 32)
const ROSTER = {
    yukimibotamon: { nombre: "Y-Botamon", row: 0 },
    nyaromon:      { nombre: "Nyaromon",  row: 1 },
    agumon:        { nombre: "Agumon",    row: 2 },
    gabumon:       { nombre: "Gabumon",   row: 3 },
    plotmon:       { nombre: "Plotmon",   row: 4 },
    gammamon:      { nombre: "Gammamon",  row: 5 },
    greymon:       { nombre: "Greymon",   row: 6 },
    leomon:        { nombre: "Leomon",    row: 7 },
    garurumon:     { nombre: "Garurumon", row: 8 },
    igamon:        { nombre: "Igamon",    row: 9 },
    angemon:       { nombre: "Angemon",   row: 10 },
    tailmon:       { nombre: "Tailmon",   row: 11 },
    // ... Añade el resto siguiendo el orden de las filas
    omegamon:      { nombre: "Omegamon",  row: 30 },
    mastemon:      { nombre: "Mastemon",  row: 31 },
    proximamon:    { nombre: "Proximamon",row: 32 }
};