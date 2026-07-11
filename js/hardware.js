// js/hardware.js

/**
 * R1 Creations - Hardware Controller para Digivice
 * Conecta los eventos físicos del Rabbit R1 (y emuladores de PC/ratón)
 * con las funciones de navegación globales del juego.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando puente de hardware para Digivice...");

    // 1. Escuchadores Nativos del Rabbit R1 (Rueda de Scroll y PTT)
    window.addEventListener('scrollUp', () => {
        if (typeof window.movePrev === 'function') window.movePrev();
    });

    window.addEventListener('scrollDown', () => {
        if (typeof window.moveNext === 'function') window.moveNext();
    });

    window.addEventListener('sideClick', () => {
        if (typeof window.ejecutarAccionFisica === 'function') window.ejecutarAccionFisica();
    });

    // 2. Teclado ampliado para PC (Soporta Flechas, WASD, Espacio y Enter)
    const handleKeyDown = (event) => {
        // Evitamos capturar teclas si el usuario está escribiendo un mensaje a la IA
        if (document.activeElement && document.activeElement.id === 'ai-input') return;

        const key = event.key.toLowerCase();

        if (key === 'arrowdown' || key === 'arrowright' || key === 's' || key === 'd') {
            event.preventDefault();
            if (typeof window.moveNext === 'function') window.moveNext();
        } else if (key === 'arrowup' || key === 'arrowleft' || key === 'w' || key === 'a') {
            event.preventDefault();
            if (typeof window.movePrev === 'function') window.movePrev();
        } else if (key === 'enter' || key === ' ' || key === 'e') {
            event.preventDefault();
            if (typeof window.ejecutarAccionFisica === 'function') window.ejecutarAccionFisica();
        }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    // 3. Rueda del ratón en PC
    window.addEventListener('wheel', (event) => {
        if (event.deltaY > 0) {
            if (typeof window.moveNext === 'function') window.moveNext();
        } else if (event.deltaY < 0) {
            if (typeof window.movePrev === 'function') window.movePrev();
        }
    }, { passive: true });
});