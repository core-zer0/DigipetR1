// js/app.js

// --- 1. FUNCIONES GLOBALES DE RENDERIZADO Y NAVEGACIÓN ---
function getAnimatedSprite(id, state = 'idle') {
    let digi = ROSTER[id] || ROSTER['yukimibotamon'];
    let animConfig = ANIMATIONS[state] || ANIMATIONS['idle'];
    
    // Si la animación tiene más de 1 frame, aplicamos @keyframes. Si es 1 frame (happy, hurt...), se queda estático en su coordenada.
    let inlineStyle = animConfig.frames > 1 
        ? `animation: play-anim 0.8s steps(${animConfig.frames}) infinite;`
        : `background-position: calc(var(--start-x) * -1px) calc(var(--start-y) * -1px);`;

    return `<div class="sprite-grid-render" style="
        --sheet-url: url('${SHEET_CONFIG.url}'); 
        --offset-x: ${SHEET_CONFIG.startX};
        --offset-y: ${SHEET_CONFIG.startY};
        --w: ${SHEET_CONFIG.w}; 
        --h: ${SHEET_CONFIG.h}; 
        --row: ${digi.row};
        --col: ${animConfig.col};
        --frames: ${animConfig.frames};
        ${inlineStyle}
    "></div>`;
}

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


// --- 2. ESCUCHADORES DE HARDWARE (INICIALIZACIÓN AL CARGAR EL DOM) ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializamos el entorno de hardware del SDK
    if (typeof initializeHardwareListeners === 'function') {
        initializeHardwareListeners();
    }

    // Creamos el chivato visual en pantalla
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

    // Captura universal del teclado y botones del R1
    window.addEventListener('keydown', (event) => {
        logger.innerText = `Tecla detectada: ${event.key} (Code: ${event.keyCode})`;

        if (event.key === 'ArrowDown' || event.keyCode === 40) {
            moveNext();
        } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
            movePrev();
        } 
        else if (event.key === 'Enter' || event.keyCode === 13 || event.key === ' ') {
            if (typeof ejecutarAccionFisica === 'function') ejecutarAccionFisica();
        }
    }, { capture: true }); 

    // Rueda del ratón para desarrollo rápido en PC
    window.addEventListener('wheel', (event) => {
        logger.innerText = `Mouse Wheel detectado: ${event.deltaY}`;
        if (event.deltaY > 0) {
            moveNext();
        } else if (event.deltaY < 0) {
            movePrev();
        }
    }, { passive: true });

    // Eventos custom que pueda mandar el firmware del R1
    window.addEventListener('scrollUp', movePrev);
    window.addEventListener('scrollDown', moveNext);
    window.addEventListener('sideClick', () => {
        if (typeof ejecutarAccionFisica === 'function') ejecutarAccionFisica();
    });

    // ¡Arrancamos la interfaz por primera vez de forma segura ahora que todo existe!
    if (typeof renderUI === 'function') renderUI();
});


// --- 3. LÓGICA DE ACCIONES DEL JUEGO ---
window.ejecutarAccionFisica = function() {
    if (db.phase === 'HATCHING' || db.stage === 'muerto') {
        db.stage = 'yukimibotamon'; 
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

    if (db.phase === 'EXPEDITION') {
        if (subMenuIndex === 0) ejecutarCombate();
        else if (subMenuIndex === 1) ejecutarEntrenamiento();
        else if (subMenuIndex === 2) db.phase = 'MAIN';
        subMenuIndex = 0;
        guardarJuego();
        renderUI();
        return;
    }

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

window.onPluginMessage = function(data) {
    console.log('Plugin HW msg:', data);
};