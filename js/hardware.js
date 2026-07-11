// js/hardware.js

/**
 * R1 Creations - Hardware Controller para Digivice
 * Conecta los eventos físicos del Rabbit R1 (y emuladores de PC)
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

    // 2. Emulador de Teclado y Rueda de Ratón para Pruebas en PC
    window.addEventListener('keydown', (event) => {
        // Evitamos capturar el teclado si el usuario está escribiendo un mensaje a la IA
        if (document.activeElement && document.activeElement.id === 'ai-input') return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            if (typeof window.moveNext === 'function') window.moveNext();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            if (typeof window.movePrev === 'function') window.movePrev();
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (typeof window.ejecutarAccionFisica === 'function') window.ejecutarAccionFisica();
        }
    }, { capture: true });

    window.addEventListener('wheel', (event) => {
        if (event.deltaY > 0) {
            if (typeof window.moveNext === 'function') window.moveNext();
        } else if (event.deltaY < 0) {
            if (typeof window.movePrev === 'function') window.movePrev();
        }
    }, { passive: true });
});