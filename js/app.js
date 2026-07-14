// js/app.js
// --- ARQUITECTURA: EVENT BUS & FSM ENGINE ---

class EventBus {
    constructor() {
        this.events = {};
    }
    on(event, listener) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
    }
    emit(event, payload) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(payload));
        }
    }
}

const events = new EventBus();

class FiniteStateMachine {
    constructor() {
        this.state = 'BOOT';
        this.states = {};
    }
    register(name, handlers) {
        this.states[name] = handlers;
    }
    transition(newState, payload = {}) {
        if (this.states[this.state] && this.states[this.state].onExit) {
            this.states[this.state].onExit();
        }
        this.state = newState;
        db.phase = newState;
        if (this.states[this.state] && this.states[this.state].onEnter) {
            this.states[this.state].onEnter(payload);
        }
        events.emit('STATE_CHANGE', newState);
    }
    handleInput(action) {
        if (this.states[this.state] && this.states[this.state].onInput) {
            this.states[this.state].onInput(action);
        }
    }
    update(deltaTime) {
        if (this.states[this.state] && this.states[this.state].onUpdate) {
            this.states[this.state].onUpdate(deltaTime);
        }
    }
}

const fsm = new FiniteStateMachine();

// --- 1. CONFIGURACIÓN GLOBALES Y ALMACENAMIENTO ---

let ROSTER = {};
let SHEET_CONFIG = {};
let ANIMATIONS = {};

let db = JSON.parse(localStorage.getItem('r1_digipet_save')) || {
    phase: 'HATCHING', stage: 'yukimibotamon', hunger: 0, energy: 4, poop: 0,
    isSick: false, coins: 10, level: 1, careMistakes: 0, trainings: 0, lastStageCheck: '',
    lastAiResponse: ''
};

db.lastStageCheck = '';

let eggTaps = 0;
let isEggWobbling = false;
let currentIconIndex = 0; 
let subMenuIndex = 0;
let spritePosX = 50;
let spriteDireccion = -1;

let combatState = {
    enemyId: 'agumon', playerHp: 10, playerMaxHp: 10,
    enemyHp: 10, enemyMaxHp: 10, subPhase: 'SELECT',
    message: '¡ENEMIGO SALVAJE!', playerAction: 0
};

function guardarJuego() {
    localStorage.setItem('r1_digipet_save', JSON.stringify(db));
}

// --- 2. GESTOR DE SISTEMA VISUAL ---

function getAnimatedSprite(id, state = 'idle', forceFlip = null) {
    let digi = ROSTER[id] || ROSTER['yukimibotamon'];
    let animConfig = ANIMATIONS[state] || ANIMATIONS['idle'];
    
    let inlineStyle = animConfig.frames > 1 
        ? `animation: play-anim 0.8s steps(${animConfig.frames}) infinite;` : ``;

    let flipX = forceFlip !== null ? forceFlip : (spriteDireccion === 1 ? -1 : 1);
    let scaleFactor = 8;
    let transformValue = `scale(${scaleFactor}) scaleX(${flipX})`;

    let posicionEstilo = (fsm.state === 'MAIN' && state === 'idle' && forceFlip === null)
        ? `position: absolute; left: ${spritePosX}%; transform: translate(-50%, -50%) ${transformValue}; top: 55%;`
        : `transform: ${transformValue};`;

    return `<div style="display: flex; justify-content: center; align-items: center; height: 60px; width: 100%; position: relative;">
            <div class="sprite-grid-render" style="
                --sheet-url: url('${SHEET_CONFIG.url}'); 
                --offset-x: ${SHEET_CONFIG.startX}; --offset-y: ${SHEET_CONFIG.startY};
                --w: ${SHEET_CONFIG.w}; --h: ${SHEET_CONFIG.h}; 
                --sheet-w: ${SHEET_CONFIG.sheetW}px; --sheet-h: ${SHEET_CONFIG.sheetH}px;
                --row: ${digi.row}; --col: ${animConfig.col}; --frames: ${animConfig.frames};
                --transform: ${transformValue}; ${posicionEstilo} ${inlineStyle}
            "></div></div>`;
}

function renderUI() {
    const view = document.getElementById('view-port');
    const statusBar = document.getElementById('status-bar');
    if (!view || !statusBar || !ROSTER[db.stage]) return; 

    let currentData = ROSTER[db.stage];
    let emoteHambre = db.hunger >= 3 ? '💢' : '🍖';
    let emoteEnergia = db.energy <= 1 ? '🪫' : '🔋';
    let emoteSalud = db.isSick ? '🤢' : (db.poop > 0 ? '💩' : '✨');
    statusBar.innerText = `${currentData.nombre.toUpperCase()} ${emoteHambre} ${emoteEnergia} ${emoteSalud}`;

    view.style.filter = fsm.state === 'SLEEP' ? 'brightness(0.35) contrast(1.2)' : 'none';

    let combatKey = fsm.state === 'COMBAT' ? `_${combatState.playerHp}_${combatState.enemyHp}_${combatState.subPhase}_${combatState.message}_${subMenuIndex}` : '';
    let uiCheckKey = `${fsm.state}_${db.stage}_${subMenuIndex}_${db.poop}_${db.hunger}_${db.isSick}_${eggTaps}_${isEggWobbling}_${spritePosX}_${spriteDireccion}_${db.lastAiResponse}${combatKey}`;
   
    if (db.lastStageCheck === uiCheckKey) {
        actualizarFilaIconos();
        return;
    }
    db.lastStageCheck = uiCheckKey;

    let animState = 'idle';
    if (db.isSick) animState = 'hurt';
    else if (db.hunger >= 3) animState = 'sad';
    else if (db.poop > 0) animState = 'refuse';

    switch(fsm.state) {
        case 'HATCHING':
            let wobbleAnimation = isEggWobbling ? 'animation: egg-shake 0.2s ease-in-out;' : '';
            view.innerHTML = `
                <style>
                    @keyframes egg-shake {
                        0%, 100% { transform: translateX(0) rotate(0deg); }
                        25% { transform: translateX(-3px) rotate(-6deg); }
                        75% { transform: translateX(3px) rotate(6deg); }
                    }
                </style>
                <div class="menu-title">ELIGE TU HUEVO</div>
                <div style="display:inline-block; ${wobbleAnimation}">${getAnimatedSprite('yukimibotamon', 'idle')}</div>
                <div class="menu-list" style="font-size:11px; margin-top:4px; line-height: 14px;">
                    ${eggTaps > 0 ? `¡Se está moviendo!<br>Grietas: ${eggTaps}/5` : '[Pulsa PTT para incubar]'}
                </div>`;
            break;

        case 'SLEEP':
            view.innerHTML = `
                <div class="menu-title">Zzz... Zzz...</div>
                ${getAnimatedSprite(db.stage, 'sleep')}
                <div class="menu-list" style="font-size:10px; margin-top:6px; color:#555;">[Cualquier botón despierta]</div>`;
            break;

        case 'DEAD':
            view.innerHTML = `
                <div class="menu-title">CONEXIÓN PERDIDA</div>
                ${getAnimatedSprite('yukimibotamon', 'hurt')}
                <div class="menu-list" style="font-size:11px; margin-top:4px;">[PTT para Reiniciar]</div>`;
            break;

        case 'MAIN':
            view.innerHTML = `
                <div class="menu-title">LV.${db.level} ${currentData.nombre}</div>
                ${getAnimatedSprite(db.stage, animState)}
                <div style="font-size:11px; height:14px; margin-top:2px;">${'💩'.repeat(db.poop)}</div>`;
            break;

        case 'EXPEDITION':
            view.innerHTML = `
                <div class="menu-title">⚔️ EXPEDICIÓN ⚔️</div>
                <div class="menu-list" style="text-align:left; width:85%; margin-top:10px;">
                    ${subMenuIndex === 0 ? '👉 BUSCAR COMBATE' : '    BUSCAR COMBATE'}<br>
                    ${subMenuIndex === 1 ? '👉 ENTRENAR' : '    ENTRENAR'}<br>
                    ${subMenuIndex === 2 ? '👉 VOLVER' : '    VOLVER'}
                </div>`;
            break;

        case 'SHOP':
            view.innerHTML = `
                <div class="menu-title">🛒 TIENDA (${db.coins}C)</div>
                <div class="menu-list" style="text-align:left; width:85%; margin-top:10px;">
                    ${subMenuIndex === 0 ? '👉 SUPER MEAT (4C)' : '    SUPER MEAT (4C)'}<br>
                    ${subMenuIndex === 1 ? '👉 MEDICINA (8C)' : '    MEDICINA (8C)'}<br>
                    ${subMenuIndex === 2 ? '👉 VOLVER' : '    VOLVER'}
                </div>`;
            break;

        case 'COMBAT':
            let enemyData = ROSTER[combatState.enemyId] || ROSTER['agumon'];
            let playerAnim = combatState.subPhase === 'ANIMATING' && combatState.playerAction === 0 ? 'attack' : 'idle';
            let enemyAnim = combatState.subPhase === 'ANIMATING' && combatState.playerAction === 1 ? 'attack' : 'idle';
            view.innerHTML = `
                <div class="menu-title" style="font-size:10px;">⚔️ VS ${enemyData.nombre.toUpperCase()} ⚔️</div>
                <div style="display: flex; justify-content: space-around; align-items: center; height: 50px; margin: 2px 0;">
                    <div style="width: 45%;">${getAnimatedSprite(db.stage, playerAnim, -1)}</div>
                    <div style="font-size: 10px; font-weight: bold; color: #333;">VS</div>
                    <div style="width: 45%;">${getAnimatedSprite(combatState.enemyId, enemyAnim, 1)}</div>
                </div>
                <div style="font-size: 9px; background: #111; color: #8b9d77; padding: 2px 4px; border-radius: 2px; margin-bottom: 2px; display: flex; justify-content: space-between;">
                    <span>TÚ: ${combatState.playerHp}/${combatState.playerMaxHp}</span>
                    <span>RIVAL: ${combatState.enemyHp}/${combatState.enemyMaxHp}</span>
                </div>
                <div class="menu-list" style="font-size: 9px; min-height: 14px; margin-bottom: 4px;">${combatState.message}</div>
                ${combatState.subPhase === 'SELECT' ? `
                <div class="menu-list" style="font-size: 9px; display: flex; justify-content: center; gap: 8px;">
                    <span style="${subMenuIndex === 0 ? 'font-weight:bold; text-decoration:underline;' : ''}">👉 ATQ</span>
                    <span style="${subMenuIndex === 1 ? 'font-weight:bold; text-decoration:underline;' : ''}">👉 VEL</span>
                    <span style="${subMenuIndex === 2 ? 'font-weight:bold; text-decoration:underline;' : ''}">👉 DEF</span>
                </div>` : ''}`;
            break;

        case 'MENU_EXEC':
            view.innerHTML = `
                <div class="menu-title">PROCESANDO...</div>
                <div style="font-size:2.5rem; margin: 15px 0; animation: spin 1.5s infinite linear;">⚙️</div>`;
            break;

        case 'KEYBOARD':
            view.innerHTML = `
                <div class="menu-title">TERMINAL DIGITAL</div>
                <div style="margin: 6px 0;">${getAnimatedSprite(db.stage, 'idle')}</div>
                <form id="ai-form" style="width: 95%; display: flex; gap: 4px; margin: 0 auto;" onsubmit="enviarMensajeAI(event)">
                    <input type="text" id="ai-input" placeholder="Toca para escribir..." autocomplete="off" maxlength="50"
                        style="flex: 1; background: #111; color: #8b9d77; border: 2px solid #222; padding: 6px 8px; font-family: 'Courier New', monospace; font-size: 0.8rem; border-radius: 4px; outline: none; box-shadow: inset 0 0 5px rgba(0,0,0,0.8);">
                    <button type="submit" style="background: #222; color: #8b9d77; border: 1px solid #444; padding: 0 10px; font-weight: bold; border-radius: 4px; cursor: pointer;">✔</button>
                </form>
                <div style="font-size: 0.65rem; color: #333; margin-top: 8px;">[PTT o Enter para salir]</div>`;
            setTimeout(() => { let i = document.getElementById('ai-input'); if(i) i.focus(); }, 150);
            break;

        case 'COMMS_THINKING':
            view.innerHTML = `
                <div class="menu-title">TERMINAL DIGITAL</div>
                <div style="font-size:2rem; margin: 15px 0; animation: spin 1.5s infinite linear;">📡</div>
                <div class="menu-list" style="font-size:10px; color:#333;">[Conectando con el Digimundo...]</div>`;
            break;

        case 'COMMS_RESPONSE':
            view.innerHTML = `
                <div class="menu-title">${currentData.nombre.toUpperCase()} DICE:</div>
                <div style="margin: 2px 0;">${getAnimatedSprite(db.stage, 'happy')}</div>
                <div style="font-size: 0.75rem; background: #111; color: #8b9d77; padding: 6px; border-radius: 4px; width: 95%; max-height: 65px; overflow-y: auto; margin: 0 auto; line-height: 1.2; text-align: left; box-shadow: inset 0 0 5px rgba(0,0,0,0.8);">
                    "${db.lastAiResponse || '...'}"
                </div>
                <div style="font-size: 0.65rem; color: #333; margin-top: 4px;">[Pulsa PTT para salir]</div>`;
            break;
    }
    
    actualizarFilaIconos();
}

function actualizarFilaIconos() {
    for (let i = 0; i < 7; i++) {
        const icon = document.getElementById(`icon-${i}`);
        if (!icon) continue;
        if (fsm.state === 'MAIN' && i === currentIconIndex) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    }
}

// --- 3. DEFINICIÓN DE ESTADOS DE LA FSM ---

fsm.register('HATCHING', {
    onInput: (action) => {
        if (action === 'EXEC') {
            eggTaps++;
            isEggWobbling = true;
            renderUI();
            setTimeout(() => { isEggWobbling = false; renderUI(); }, 200);

            if (eggTaps >= 5) {
                eggTaps = 0;
                db.stage = 'yukimibotamon';
                db.hunger = 0; db.energy = 4; db.poop = 0; db.isSick = false;
                db.trainings = 0; db.careMistakes = 0;
                guardarJuego();
                fsm.transition('MAIN');
            }
        }
    }
});

fsm.register('MAIN', {
    onEnter: () => { db.lastStageCheck = ''; renderUI(); },
    onInput: (action) => {
        if (action === 'NEXT') { currentIconIndex = (currentIconIndex + 1) % 7; renderUI(); }
        else if (action === 'PREV') { currentIconIndex = (currentIconIndex - 1 + 7) % 7; renderUI(); }
        else if (action === 'EXEC') {
            switch(currentIconIndex) {
                case 0: db.hunger = Math.max(0, db.hunger - 1); fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' }); break;
                case 1: fsm.transition('EXPEDITION'); break;
                case 2: fsm.transition('SHOP'); break;
                case 3: fsm.transition('KEYBOARD'); break;
                case 4: fsm.transition('SLEEP'); break;
                case 5: db.poop = 0; fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' }); break;
                case 6: db.isSick = false; fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' }); break;
            }
            guardarJuego();
        }
    }
});

fsm.register('SLEEP', {
    onEnter: () => { guardarJuego(); renderUI(); },
    onInput: () => { fsm.transition('MAIN'); }
});

fsm.register('DEAD', {
    onInput: (action) => {
        if (action === 'EXEC') {
            db.stage = 'yukimibotamon';
            db.hunger = 0; db.energy = 4; db.poop = 0; db.isSick = false;
            db.trainings = 0; db.careMistakes = 0;
            guardarJuego();
            fsm.transition('MAIN');
        }
    }
});

fsm.register('EXPEDITION', {
    onEnter: () => { subMenuIndex = 0; renderUI(); },
    onInput: (action) => {
        if (action === 'NEXT') { subMenuIndex = (subMenuIndex + 1) % 3; renderUI(); }
        else if (action === 'PREV') { subMenuIndex = (subMenuIndex - 1 + 3) % 3; renderUI(); }
        else if (action === 'EXEC') {
            if (subMenuIndex === 0) iniciarBatalla();
            else if (subMenuIndex === 1) iniciarEntrenamiento();
            else if (subMenuIndex === 2) fsm.transition('MAIN');
        }
    }
});

fsm.register('SHOP', {
    onEnter: () => { subMenuIndex = 0; renderUI(); },
    onInput: (action) => {
        if (action === 'NEXT') { subMenuIndex = (subMenuIndex + 1) % 3; renderUI(); }
        else if (action === 'PREV') { subMenuIndex = (subMenuIndex - 1 + 3) % 3; renderUI(); }
        else if (action === 'EXEC') {
            if (subMenuIndex === 0 && db.coins >= 4) { db.coins -= 4; db.hunger = Math.max(0, db.hunger - 2); }
            else if (subMenuIndex === 1 && db.coins >= 8) { db.coins -= 8; db.isSick = false; }
            else if (subMenuIndex === 2) { fsm.transition('MAIN'); return; }
            guardarJuego();
            fsm.transition('MAIN');
        }
    }
});

fsm.register('COMBAT', {
    onEnter: () => { subMenuIndex = 0; renderUI(); },
    onInput: (action) => {
        if (combatState.subPhase === 'SELECT') {
            if (action === 'NEXT') { subMenuIndex = (subMenuIndex + 1) % 3; renderUI(); }
            else if (action === 'PREV') { subMenuIndex = (subMenuIndex - 1 + 3) % 3; renderUI(); }
            else if (action === 'EXEC') { resolverTurnoCombate(subMenuIndex); }
        } else if (combatState.subPhase === 'END' && action === 'EXEC') {
            fsm.transition('MAIN');
        }
    }
});

fsm.register('MENU_EXEC', {
    onEnter: (payload) => {
        renderUI();
        setTimeout(() => { fsm.transition(payload.next || 'MAIN'); }, payload.duration || 1000);
    }
});

fsm.register('KEYBOARD', {
    onEnter: () => { renderUI(); },
    onInput: (action) => { if (action === 'EXEC') fsm.transition('MAIN'); }
});

fsm.register('COMMS_THINKING', {
    onEnter: () => { renderUI(); },
    onInput: (action) => { if (action === 'EXEC') fsm.transition('MAIN'); }
});

fsm.register('COMMS_RESPONSE', {
    onEnter: () => { renderUI(); },
    onInput: (action) => { if (action === 'EXEC') fsm.transition('MAIN'); }
});

// --- 4. LÓGICA DE EVENTOS FISICOS DEL DISPOSITIVO ---

window.moveNext = () => fsm.handleInput('NEXT');
window.movePrev = () => fsm.handleInput('PREV');
window.ejecutarAccionFisica = () => fsm.handleInput('EXEC');

// --- 5. SISTEMAS DE ENTRENAMIENTO Y COMBATE ---

function iniciarEntrenamiento() {
    db.trainings++;
    db.energy = Math.max(0, db.energy - 1);
    db.coins += 2;
    guardarJuego();
    fsm.transition('MENU_EXEC', { duration: 1200, next: 'MAIN' });
}

function iniciarBatalla() {
    if (db.energy === 0) { fsm.transition('MAIN'); return; }
    db.energy = Math.max(0, db.energy - 1);
    
    const enemigosDisponibles = Object.keys(ROSTER).filter(id => id !== 'yukimibotamon' && id !== 'nyaromon');
    const enemigoAleatorio = enemigosDisponibles[Math.floor(Math.random() * enemigosDisponibles.length)] || 'agumon';

    let maxHp = 10 + (db.level * 3);
    combatState = {
        enemyId: enemigoAleatorio, playerHp: maxHp, playerMaxHp: maxHp,
        enemyHp: maxHp, enemyMaxHp: maxHp, subPhase: 'SELECT',
        message: '¡ELIGE TU ACCIÓN TÁCTICA!', playerAction: 0
    };
    fsm.transition('COMBAT');
}

function resolverTurnoCombate(accionJugador) {
    combatState.subPhase = 'ANIMATING';
    combatState.playerAction = accionJugador;
    
    const accionRival = Math.floor(Math.random() * 3);
    const nombresAccion = ['ATQ', 'VEL', 'DEF'];
    const statsJugador = ROSTER[db.stage] || ROSTER['agumon'];
    const statsRival = ROSTER[combatState.enemyId] || ROSTER['agumon'];
    
    let ventaja = 0;
    if (accionJugador !== accionRival) {
        if ((accionJugador === 0 && accionRival === 2) || (accionJugador === 1 && accionRival === 0) || (accionJugador === 2 && accionRival === 1)) {
            ventaja = 1;
        } else { ventaja = -1; }
    }

    if (ventaja === 1) {
        let multi = accionJugador === 0 ? statsJugador.atq : (accionJugador === 1 ? statsJugador.vel : statsJugador.def);
        let dano = Math.max(3, Math.floor((multi * 0.8) - (statsRival.def * 0.3) + 2));
        combatState.enemyHp = Math.max(0, combatState.enemyHp - dano);
        combatState.message = `¡${nombresAccion[accionJugador]} SUPERA ${nombresAccion[accionRival]}! -${dano} HP RIVAL`;
    } else if (ventaja === -1) {
        let multi = accionRival === 0 ? statsRival.atq : (accionRival === 1 ? statsRival.vel : statsRival.def);
        let dano = Math.max(2, Math.floor((multi * 0.8) - (statsJugador.def * 0.3) + 2));
        combatState.playerHp = Math.max(0, combatState.playerHp - dano);
        combatState.message = `¡${nombresAccion[accionRival]} SUPERA ${nombresAccion[accionJugador]}! -${dano} HP TÚ`;
    } else {
        let statJ = accionJugador === 0 ? statsJugador.atq : (accionJugador === 1 ? statsJugador.vel : statsJugador.def);
        let statR = accionRival === 0 ? statsRival.atq : (accionRival === 1 ? statsRival.vel : statsRival.def);
        if (statJ >= statR) {
            combatState.enemyHp = Math.max(0, combatState.enemyHp - 2);
            combatState.message = `¡CHOQUE! Tu fuerza domina: -2 HP RIVAL`;
        } else {
            combatState.playerHp = Math.max(0, combatState.playerHp - 2);
            combatState.message = `¡CHOQUE! El rival domina: -2 HP TÚ`;
        }
    }
    
    db.lastStageCheck = '';
    renderUI();

    setTimeout(() => {
        if (combatState.enemyHp <= 0) {
            combatState.subPhase = 'END';
            combatState.message = `¡VICTORIA! +8C y +1 LVL [PTT: Salir]`;
            db.coins += 8; db.level++;
        } else if (combatState.playerHp <= 0) {
            combatState.subPhase = 'END';
            combatState.message = `¡DERROTA! Pierdes energía [PTT: Salir]`;
            db.energy = Math.max(0, db.energy - 1); db.careMistakes++;
        } else {
            combatState.subPhase = 'SELECT';
            combatState.message = `¿QUÉ HARÁS AHORA?`;
        }
        db.lastStageCheck = '';
        renderUI();
    }, 1800);
}

// --- 6. EVOLUCIÓN CONDICIONADA ---

function comprobarEvolucion() {
    if (db.stage === 'yukimibotamon') db.stage = 'nyaromon';
    else if (db.stage === 'nyaromon') { 
        db.stage = db.careMistakes <= 1 ? 'agumon' : (db.careMistakes <= 3 ? 'gabumon' : 'gammamon'); 
        db.careMistakes = 0; 
    }
    else if (db.stage === 'agumon') {
        if (db.trainings >= 6 && db.careMistakes === 0) db.stage = 'greymon';
        else if (db.trainings >= 4 && db.careMistakes <= 2) db.stage = 'leomon';
        else db.stage = 'igamon';
    }
    else if (db.stage === 'gabumon') {
        if (db.trainings >= 5 && db.careMistakes === 0) db.stage = 'garurumon';
        else if (db.trainings >= 3 && db.careMistakes <= 2) db.stage = 'tailmon';
        else db.stage = 'igamon';
    }
    else if (db.stage === 'gammamon') {
        if (db.trainings >= 6 && db.careMistakes === 0) db.stage = 'betelgammamon';
        else if (db.trainings >= 4 && db.careMistakes <= 1) db.stage = 'kausgammamon';
        else if (db.trainings >= 2 && db.careMistakes <= 2) db.stage = 'wezengammamon';
        else db.stage = 'gulusgammamon';
    }
    else if (db.stage === 'greymon' || db.stage === 'leomon') {
        if (db.trainings >= 10 && db.careMistakes === 0) db.stage = 'metalgreymon';
        else if (db.careMistakes >= 3) db.stage = 'asuramon';
    }
    else if (db.stage === 'garurumon' || db.stage === 'tailmon') {
        if (db.trainings >= 10 && db.careMistakes === 0) db.stage = 'weregarurumon';
        else if (db.careMistakes >= 3) db.stage = 'metalmamemon';
    }
    else if (db.stage === 'gulusgammamon' || db.stage === 'igamon') {
        if (db.trainings >= 8) db.stage = 'regulusmon';
    }
    else if (db.stage === 'regulusmon') {
        if (db.trainings >= 15) db.stage = 'arcturusmon';
    }
    else if (db.stage === 'metalgreymon' || db.stage === 'weregarurumon') {
        if (db.trainings >= 15 && db.careMistakes === 0) db.stage = 'wargreymon';
        else if (db.trainings >= 12) db.stage = 'metalgarurumon';
    }
    else if (db.stage === 'wargreymon' || db.stage === 'metalgarurumon') {
        if (db.trainings >= 25 && db.careMistakes === 0) db.stage = 'omegamon';
    }
}

// --- 7. INTELIGENCIA ARTIFICIAL & RABBIT R1 BRIDGE ---

function llamarModeloRabbit(systemPrompt, mensajeUsuario) {
    return new Promise((resolve, reject) => {
        if (typeof PluginMessageHandler === 'undefined') {
            setTimeout(() => resolve("¡Grr! (Modo PC: No estoy dentro del Rabbit R1)"), 1500);
            return;
        }
        const fullPrompt = `${systemPrompt}\n\nMENSAJE DEL JUGADOR: "${mensajeUsuario}"\n\nResponde ÚNICAMENTE con un JSON válido: {"respuesta": "tu texto corto aquí"}`;
        const payload = { message: fullPrompt, useLLM: true, wantsR1Response: false };
        const timeoutId = setTimeout(() => reject("Timeout"), 15000);

        const originalHandler = window.onPluginMessage;
        window.onPluginMessage = function(data) {
            clearTimeout(timeoutId);
            if (originalHandler) window.onPluginMessage = originalHandler;
            try {
                let parsed = data.data ? (typeof data.data === 'string' ? JSON.parse(data.data) : data.data) : JSON.parse(data.message);
                resolve(parsed && parsed.respuesta ? parsed.respuesta : (data.message || data.data));
            } catch (e) { resolve(data.message || data.data || "Error digital"); }
        };
        PluginMessageHandler.postMessage(JSON.stringify(payload));
    });
}

async function consultarDigimonAI(mensajeUsuario, idDigimon) {
    const digi = ROSTER[idDigimon] || ROSTER['yukimibotamon'];
    const systemPrompt = `Eres un Digimon llamado ${digi.nombre}. Nivel: ${db.level}, Alineación: ${digi.isLuminous?'Luz':'Oscuridad'}, Hambre: ${db.hunger}/5, Salud: ${db.isSick?'ENFERMO':'SANO'}. Responde en carácter, máximo 2 frases cortas.`;
    
    try {
        let respuestaAI = await llamarModeloRabbit(systemPrompt, mensajeUsuario);
        db.lastAiResponse = respuestaAI;
        fsm.transition('COMMS_RESPONSE');
    } catch (error) {
        db.lastAiResponse = "... [ERROR DIGITAL: SEÑAL PERDIDA] ...";
        fsm.transition('COMMS_RESPONSE');
    }
}

window.enviarMensajeAI = function(event) {
    event.preventDefault(); 
    const input = document.getElementById('ai-input');
    const mensaje = input ? input.value.trim() : "";
    if (mensaje.length > 0) {
        fsm.transition('COMMS_THINKING');
        consultarDigimonAI(mensaje, db.stage);
    }
};

// --- 8. CICLO DE RENDIMIENTO AVANZADO (requestAnimationFrame) ---

let lastWanderTime = 0;
let lastVitalTime = 0;

function gameLoop(timestamp) {
    if (!lastWanderTime) lastWanderTime = timestamp;
    if (!lastVitalTime) lastVitalTime = timestamp;

    const wanderDelta = timestamp - lastWanderTime;
    const vitalDelta = timestamp - lastVitalTime;

    // Bucle de Deambuleo (600ms exactos, sin desincronización)
    if (wanderDelta >= 600) {
        lastWanderTime = timestamp - (wanderDelta % 600);
        if (fsm.state === 'MAIN' && !db.isSick && db.hunger < 3 && db.poop === 0) {
            if (Math.random() < 0.2) {
                spriteDireccion *= -1; 
            } else if (Math.random() > 0.3) {
                spritePosX += (spriteDireccion * 5);
                if (spritePosX < 15) { spritePosX = 15; spriteDireccion = 1; }
                else if (spritePosX > 85) { spritePosX = 85; spriteDireccion = -1; }
            }
            renderUI();
        }
    }

    // Bucle Vital (120,000ms - 2 Minutos exactos)
    if (vitalDelta >= 120000) {
        lastVitalTime = timestamp - (vitalDelta % 120000);
        if (fsm.state !== 'HATCHING' && fsm.state !== 'DEAD') {
            if (fsm.state === 'SLEEP') {
                db.energy = Math.min(4, db.energy + 1); 
                db.hunger = Math.min(4, db.hunger + 1); 
            } else {
                db.hunger = Math.min(4, db.hunger + 1);
                if (db.hunger === 4) db.careMistakes++;
                if (db.poop >= 3) db.isSick = true;
                comprobarEvolucion();
            }
            guardarJuego();
            renderUI();
        }
    }

    fsm.update(timestamp);
    requestAnimationFrame(gameLoop);
}

// --- 9. ARRANQUE ASÍNCRONO DEL MOTOR ---

async function bootGame() {
    try {
        const [animRes, rosterRes] = await Promise.all([
            fetch('data/animations.json'),
            fetch('data/roster.json')
        ]);
        
        const animData = await animRes.json();
        SHEET_CONFIG = animData.SHEET_CONFIG;
        ANIMATIONS = animData.ANIMATIONS;
        ROSTER = await rosterRes.json();

        if (!ROSTER[db.stage] || db.stage === 'muerto') {
            db.stage = 'yukimibotamon';
            db.phase = 'HATCHING';
        }

        fsm.transition(db.phase === 'MENU_EXEC' || db.phase === 'COMMS_THINKING' ? 'MAIN' : db.phase);
        requestAnimationFrame(gameLoop);

    } catch (e) {
        console.error("Fallo crítico al inicializar base de datos:", e);
        document.body.innerHTML = `<div style="color:red; text-align:center; padding:20px;">[ERROR DE ARRANQUE: Faltan archivos .json en la carpeta /data]</div>`;
    }
}

document.addEventListener('DOMContentLoaded', bootGame);