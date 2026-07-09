// js/app.js

// --- 1. ESTADO DEL JUEGO (Migrado desde index.html) ---
let db = JSON.parse(localStorage.getItem('r1_digipet_save')) || {
    phase: 'HATCHING', stage: 'yukimibotamon', hunger: 0, energy: 4, poop: 0,
    isSick: false, coins: 10, level: 1, careMistakes: 0, trainings: 0, lastStageCheck: ''
};

// Salvavidas: Si vienes de una partida vieja y el Digimon ya no existe en el roster actual, resetea.
if (typeof ROSTER !== 'undefined' && !ROSTER[db.stage]) {
    db.stage = 'yukimibotamon';
    db.phase = 'HATCHING';
}

let currentIconIndex = 0; 
let subMenuIndex = 0;

function guardarJuego() {
    localStorage.setItem('r1_digipet_save', JSON.stringify(db));
}

// --- 2. FUNCIONES DE RENDERIZADO VISUAL ---
function getAnimatedSprite(id, state = 'idle') {
    let digi = ROSTER[id] || ROSTER['yukimibotamon'];
    let animConfig = ANIMATIONS[state] || ANIMATIONS['idle'];
    
    // Si tiene más de 1 frame, activamos la animación. Si no, el CSS usa la posición estática base.
    let inlineStyle = animConfig.frames > 1 
        ? `animation: play-anim 0.8s steps(${animConfig.frames}) infinite;`
        : ``;

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

function renderUI() {
    const view = document.getElementById('view-port');
    const statusBar = document.getElementById('status-bar');
    if (!view || !statusBar) return; // Evita crasheos si el DOM aún no existe

    let currentData = ROSTER[db.stage] || ROSTER['yukimibotamon'];
    
    let emoteHambre = db.hunger >= 3 ? '💢' : '🍖';
    let emoteEnergia = db.energy <= 1 ? '🪫' : '🔋';
    let emoteSalud = db.isSick ? '🤢' : (db.poop > 0 ? '💩' : '✨');
    statusBar.innerText = `${currentData.nombre.toUpperCase()} ${emoteHambre} ${emoteEnergia} ${emoteSalud}`;
    
    let uiCheckKey = `${db.phase}_${db.stage}_${subMenuIndex}_${db.poop}_${db.hunger}_${db.isSick}`;
    if (db.lastStageCheck === uiCheckKey) {
        actualizarFilaIconos();
        return;
    }
    db.lastStageCheck = uiCheckKey;

    let animState = 'idle';
    if (db.isSick) animState = 'hurt';
    else if (db.hunger >= 3) animState = 'sad';
    else if (db.poop > 0) animState = 'refuse';

    if (db.phase === 'HATCHING') {
        view.innerHTML = `
            <div class="menu-title">ELIGE TU HUEVO</div>
            ${getAnimatedSprite('yukimibotamon', 'idle')}
            <div class="menu-list" style="font-size:11px; margin-top:4px;">[Pulsa PTT para nacer]</div>
        `;
    }
    else if (db.stage === 'muerto') {
        view.innerHTML = `
            <div class="menu-title">CONEXIÓN PERDIDA</div>
            ${getAnimatedSprite('yukimibotamon', 'hurt')}
            <div class="menu-list" style="font-size:11px; margin-top:4px;">[PTT para Reiniciar]</div>
        `;
    }
    else if (db.phase === 'MAIN') {
        let poopDisplay = '💩'.repeat(db.poop);
        view.innerHTML = `
            <div class="menu-title">LV.${db.level} ${currentData.nombre}</div>
            ${getAnimatedSprite(db.stage, animState)}
            <div style="font-size:11px; height:14px; margin-top:2px;">${poopDisplay}</div>
        `;
    } 
    else if (db.phase === 'EXPEDITION') {
        view.innerHTML = `
            <div class="menu-title">⚔️ EXPEDICIÓN ⚔️</div>
            <div class="menu-list" style="text-align:left; width:85%; margin-top:10px;">
                ${subMenuIndex === 0 ? '👉 BUSCAR COMBATE' : '   BUSCAR COMBATE'}<br>
                ${subMenuIndex === 1 ? '👉 ENTRENAR' : '   ENTRENAR'}<br>
                ${subMenuIndex === 2 ? '👉 VOLVER' : '   VOLVER'}
            </div>
        `;
    }
    else if (db.phase === 'SHOP') {
        view.innerHTML = `
            <div class="menu-title">🛒 TIENDA (${db.coins}C)</div>
            <div class="menu-list" style="text-align:left; width:85%; margin-top:10px;">
                ${subMenuIndex === 0 ? '👉 SUPER MEAT (4C)' : '   SUPER MEAT (4C)'}<br>
                ${subMenuIndex === 1 ? '👉 MEDICINA (8C)' : '   MEDICINA (8C)'}<br>
                ${subMenuIndex === 2 ? '👉 VOLVER' : '   VOLVER'}
            </div>
        `;
    }
    else if (db.phase === 'MENU_EXEC') {
        view.innerHTML = `
            <div class="menu-title">PROCESANDO...</div>
            <div style="font-size:2.5rem; margin: 15px 0; animation: spin 1.5s infinite linear;">⚙️</div>
        `;
    }
    actualizarFilaIconos();
}

function actualizarFilaIconos() {
    for (let i = 0; i < 6; i++) {
        const icon = document.getElementById(`icon-${i}`);
        if (!icon) continue;
        if (db.phase === 'MAIN' && i === currentIconIndex) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    }
}

// --- 3. LÓGICA DE NAVEGACIÓN Y ACCIONES ---
function moveNext() {
    if (db.phase === 'MAIN') currentIconIndex = (currentIconIndex + 1) % 6;
    else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') subMenuIndex = (subMenuIndex + 1) % 3;
    renderUI();
}

function movePrev() {
    if (db.phase === 'MAIN') currentIconIndex = (currentIconIndex - 1 + 6) % 6;
    else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') subMenuIndex = (subMenuIndex - 1 + 3) % 3;
    renderUI();
}

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
        } else if (subMenuIndex === 2) db.phase = 'MAIN';
        subMenuIndex = 0;
        guardarJuego();
        renderUI();
        return;
    }

    if (db.phase === 'MAIN') {
        switch(currentIconIndex) {
            case 0: db.hunger = Math.max(0, db.hunger - 1); mostrarAccionBreve(); break;
            case 1: db.phase = 'EXPEDITION'; subMenuIndex = 0; break;
            case 2: db.phase = 'SHOP'; subMenuIndex = 0; break;
            case 3: db.energy = Math.min(4, db.energy + 2); mostrarAccionBreve(); break;
            case 4: db.poop = 0; mostrarAccionBreve(); break;
            case 5: db.isSick = false; mostrarAccionBreve(); break;
        }
        guardarJuego();
        renderUI();
    }
};

function mostrarAccionBreve() {
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => { db.phase = 'MAIN'; renderUI(); }, 1000);
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
    if (db.energy === 0) { db.phase = 'MAIN'; renderUI(); return; }
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => {
        if (Math.random() > 0.4) { db.coins += 6; db.level++; } 
        else { db.energy = Math.max(0, db.energy - 2); db.careMistakes++; }
        db.phase = 'MAIN';
        guardarJuego();
        renderUI();
    }, 1500);
}

function comprobarEvolucion() {
    if (db.stage === 'yukimibotamon') db.stage = 'nyaromon';
    else if (db.stage === 'nyaromon') { db.stage = db.careMistakes <= 2 ? 'agumon' : 'gabumon'; db.careMistakes = 0; }
    else if (db.stage === 'agumon') {
        if (db.trainings >= 5 && db.careMistakes <= 1) db.stage = 'greymon';
        else if (db.trainings >= 3 && db.careMistakes <= 3) db.stage = 'leomon';
        else db.stage = 'igamon';
    }
    else if (db.stage === 'gabumon') {
        if (db.trainings >= 4 && db.careMistakes <= 2) db.stage = 'garurumon';
        else db.stage = 'tailmon';
    }
}

// --- 4. INICIALIZACIÓN Y EVENTOS DEL HARDWARE ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeHardwareListeners === 'function') initializeHardwareListeners();

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
    logger.innerText = 'Sistema Listo - Rueda Activa';
    document.body.appendChild(logger);

    window.addEventListener('keydown', (event) => {
        logger.innerText = `Tecla: ${event.key}`;
        if (event.key === 'ArrowDown' || event.keyCode === 40) moveNext();
        else if (event.key === 'ArrowUp' || event.keyCode === 38) movePrev();
        else if (event.key === 'Enter' || event.keyCode === 13 || event.key === ' ') ejecutarAccionFisica();
    }, { capture: true }); 

    window.addEventListener('wheel', (event) => {
        logger.innerText = `Rueda: ${event.deltaY}`;
        if (event.deltaY > 0) moveNext();
        else if (event.deltaY < 0) movePrev();
    }, { passive: true });

    window.addEventListener('scrollUp', movePrev);
    window.addEventListener('scrollDown', moveNext);
    window.addEventListener('sideClick', ejecutarAccionFisica);

    // Bucle vital
    setInterval(() => {
        if (db.phase === 'HATCHING' || db.stage === 'muerto') return;
        db.hunger = Math.min(4, db.hunger + 1);
        if (db.hunger === 4) db.careMistakes++;
        if (db.poop >= 3) db.isSick = true;
        comprobarEvolucion();
        guardarJuego();
        renderUI();
    }, 120000);

    // Pintar la pantalla por primera vez
    renderUI();
});

window.onPluginMessage = function(data) {
    console.log('Plugin HW msg:', data);
};