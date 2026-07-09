// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializamos el entorno de hardware del SDK (del backup)
    if (typeof initializeHardwareListeners === 'function') {
        initializeHardwareListeners();
    }

    // 2. CREAMOS UN CHIVATO VISUAL (del backup)
    const logger = document.createElement('div');
    logger.style.position = 'fixed';
    logger.style.top = '10px';
    logger.style.left = '10px';
    logger.style.background = 'rgba(0,0,0,0.8)';
    logger.style.color = '#00ff00';
    logger.style.padding = '5px';
    logger.style.fontSize = '12px';
    logger.style.zIndex = '9999';
    logger.style.pointerEvents = 'none';
    logger.innerText = 'Buscando rueda/teclado...';
    document.body.appendChild(logger);

    // --- LÓGICA DE NAVEGACIÓN ADAPTADA AL DIGIVICE ---
    function moveNext() {
        if (db.phase === 'MAIN') {
            currentIconIndex = (currentIconIndex + 1) % 6;
        } else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') {
            subMenuIndex = (subMenuIndex + 1) % 3;
        }
        if (typeof renderUI === 'function') renderUI();
    }

    function movePrev() {
        if (db.phase === 'MAIN') {
            currentIconIndex = (currentIconIndex - 1 + 6) % 6;
        } else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') {
            subMenuIndex = (subMenuIndex - 1 + 3) % 3;
        }
        if (typeof renderUI === 'function') renderUI();
    }

    // 3. CAPTURA UNIVERSAL DE EVENTOS (del backup adaptado)
    window.addEventListener('keydown', (event) => {
        logger.innerText = `Tecla detectada: ${event.key} (Code: ${event.keyCode})`;

        // Cambiamos el scrollBy por la navegación del menú
        if (event.key === 'ArrowDown' || event.keyCode === 40) {
            moveNext();
        } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
            movePrev();
        } 
        // Añadimos Enter o Espacio para simular el botón PTT/Click lateral
        else if (event.key === 'Enter' || event.keyCode === 13 || event.key === ' ') {
            if (typeof ejecutarAccionFisica === 'function') ejecutarAccionFisica();
        }
    }, { capture: true }); 

    window.addEventListener('wheel', (event) => {
        logger.innerText = `Mouse Wheel detectado: ${event.deltaY}`;
        if (event.deltaY > 0) {
            moveNext();
        } else if (event.deltaY < 0) {
            movePrev();
        }
    }, { passive: true });

    // 4. LISTENERS DE HARDWARE (Por si los eventos personalizados del R1 saltan)
    window.addEventListener('scrollUp', movePrev);
    window.addEventListener('scrollDown', moveNext);
    window.addEventListener('sideClick', () => {
        if (typeof ejecutarAccionFisica === 'function') ejecutarAccionFisica();
    });
});

// --- LÓGICA DE ACCIONES DEL JUEGO ---
window.ejecutarAccionFisica = function() {
    // Si es un huevo o está muerto, el botón PTT lo reinicia
    if (db.phase === 'HATCHING' || db.stage === 'muerto') {
        db.stage = 'botamon'; 
        db.phase = 'MAIN';
        db.hunger = 0;
        db.energy = 4;
        db.poop = 0;
        db.isSick = false;
        db.trainings = 0;
        db.careMistakes = 0;
        guardarJuego();
        renderUI();
        return;
    }

    // Acciones dentro de Expedición
    if (db.phase === 'EXPEDITION') {
        if (subMenuIndex === 0) ejecutarCombate();
        else if (subMenuIndex === 1) ejecutarEntrenamiento();
        else if (subMenuIndex === 2) db.phase = 'MAIN';
        subMenuIndex = 0;
        guardarJuego();
        renderUI();
        return;
    }

    // Acciones dentro de Tienda
    if (db.phase === 'SHOP') {
        if (subMenuIndex === 0) {
            if (db.coins >= 4) { db.coins -= 4; db.hunger = Math.max(0, db.hunger - 2); }
        } else if (subMenuIndex === 1) {
            if (db.coins >= 8) { db.coins -= 8; db.isSick = false; }
        } else if (subMenuIndex === 2) {
            db.phase = 'MAIN';
        }
        subMenuIndex = 0;
        guardarJuego();
        renderUI();
        return;
    }

    // Acciones en Menú Principal
    if (db.phase === 'MAIN') {
        switch(currentIconIndex) {
            case 0: // Carne
                db.hunger = Math.max(0, db.hunger - 1);
                mostrarAccionBreve();
                break;
            case 1: // Expedición
                db.phase = 'EXPEDITION';
                subMenuIndex = 0;
                break;
            case 2: // Tienda
                db.phase = 'SHOP';
                subMenuIndex = 0;
                break;
            case 3: // Dormir
                db.energy = Math.min(4, db.energy + 2);
                mostrarAccionBreve();
                break;
            case 4: // Limpiar
                db.poop = 0;
                mostrarAccionBreve();
                break;
            case 5: // Medicina
                db.isSick = false;
                mostrarAccionBreve();
                break;
        }
        guardarJuego();
        renderUI();
    }
};

function mostrarAccionBreve() {
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => {
        db.phase = 'MAIN';
        renderUI();
    }, 1000);
}

function ejecutarEntrenamiento() {
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => {
        db.trainings++;
        db.energy = Math.max(0, db.energy - 1);
        db.coins += 2;
        db.phase = 'MAIN';
        guardarJuego();
        renderUI();
    }, 1200);
}

function ejecutarCombate() {
    if (db.energy === 0) {
        db.phase = 'MAIN';
        renderUI();
        return;
    }
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => {
        let victoria = Math.random() > 0.4;
        if (victoria) {
            db.coins += 6;
            db.level++;
        } else {
            db.energy = Math.max(0, db.energy - 2);
            db.careMistakes++;
        }
        db.phase = 'MAIN';
        guardarJuego();
        renderUI();
    }, 1500);
}

// Intercepta mensajes puros si el R1 manda un JSON por puerto serie interno
window.onPluginMessage = function(data) {
    console.log('Plugin HW msg:', data);
};