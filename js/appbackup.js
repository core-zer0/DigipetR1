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

const ITEM_CATALOG = {
    carne: { nombre: 'Carne', emote: '🍖', tipo: 'comida', hambre: 2 },
    carne_xl: { nombre: 'Carne XL', emote: '🥩', tipo: 'comida', hambre: 4 },
    pienso: { nombre: 'Pienso', emote: '🧆', tipo: 'comida', hambre: 1 },
    medicina: { nombre: 'Medicina', emote: '💊', tipo: 'cura' },
    agua: { nombre: 'Agua', emote: '💧', tipo: 'bebida', energia: 1 },
    café: { nombre: 'Café', emote: '☕', tipo: 'bebida', energia: 3 },
    leche: { nombre: 'Leche', emote: '🥛', tipo: 'bebida', hambre: 1, energia: 1 },
    patata: { nombre: 'Patata', emote: '🥔', tipo: 'comida', hambre: 1 },
    calabaza: { nombre: 'Calabaza', emote: '🎃', tipo: 'comida', hambre: 2 },
    cebolla: { nombre: 'Cebolla', emote: '🧅', tipo: 'comida', hambre: 1 },
    arroz: { nombre: 'Arroz', emote: '🍚', tipo: 'comida', hambre: 2 },
    lechuga: { nombre: 'Lechuga', emote: '🥬', tipo: 'comida', hambre: 1 },
    pescado: { nombre: 'Pescado', emote: '🐟', tipo: 'comida', hambre: 3 },
    trigo: { nombre: 'Trigo', emote: '🌾', tipo: 'materia' },
    harina: { nombre: 'Harina', emote: '🥡', tipo: 'materia' },
    semilla_patata: { nombre: 'Sem. Patata', emote: '🌱', tipo: 'semilla' },
    semilla_calabaza: { nombre: 'Sem. Calabaza', emote: '🌱', tipo: 'semilla' },
    semilla_cebolla: { nombre: 'Sem. Cebolla', emote: '🌱', tipo: 'semilla' },
    semilla_arroz: { nombre: 'Sem. Arroz', emote: '🌱', tipo: 'semilla' },
    semilla_trigo: { nombre: 'Sem. Trigo', emote: '🌱', tipo: 'semilla' },
    semilla_lechuga: { nombre: 'Sem. Lechuga', emote: '🌱', tipo: 'semilla' }
};

let ROSTER = {};
let SHEET_CONFIG = {};
let ANIMATIONS = {};

let db = JSON.parse(localStorage.getItem('r1_digipet_save')) || {
    phase: 'HATCHING', stage: 'yukimibotamon', hunger: 0, energy: 4, poop: 0,
    isSick: false, coins: 10, level: 1, careMistakes: 0, trainings: 0, lastStageCheck: '',
    lastAiResponse: '', happiness: 0, inventory: {}
};

const DEFAULT_INVENTORY = {
    carne: 3, carne_xl: 1, pienso: 2, medicina: 1, agua: 5, café: 1, leche: 1,
    patata: 0, calabaza: 0, cebolla: 0, arroz: 0, lechuga: 0, pescado: 1,
    trigo: 0, harina: 0,
    semilla_patata: 2, semilla_calabaza: 1, semilla_cebolla: 1, semilla_arroz: 1, semilla_trigo: 2, semilla_lechuga: 1
};

if (!db.inventory || Object.keys(db.inventory).length === 0) {
    db.inventory = { ...DEFAULT_INVENTORY };
}
if (db.happiness === undefined) db.happiness = 0;

db.lastStageCheck = '';

let eggTaps = 0;
let isEggWobbling = false;
let currentIconIndex = 0; 
let subMenuIndex = 0;
let spritePosX = 50;
let spriteDireccion = -1;

let walkLog = "Explorando...";
let walkTimer = null;
let walkInterval = null;

let combatState = {
    enemyId: 'agumon', playerHp: 10, playerMaxHp: 10,
    enemyHp: 10, enemyMaxHp: 10, subPhase: 'SELECT',
    message: '¡ENEMIGO SALVAJE!', playerAction: 0, isWalk: false
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
    let scaleFactor = (fsm.state === 'COMBAT' || fsm.state === 'PLAY') ? 8 : 10;
    let transformValue = `scale(${scaleFactor}) scaleX(${flipX})`;

    let posicionEstilo = '';
    let transformOrigin = '';

    if (fsm.state === 'MAIN' && state === 'idle' && forceFlip === null) {
        posicionEstilo = `position: absolute; left: ${spritePosX}%; transform: translate(-50%, -50%) ${transformValue}; top: 55%;`;
        transformOrigin = 'transform-origin: center center;';
    } else if (fsm.state === 'COMBAT' || fsm.state === 'PLAY') {
        posicionEstilo = `position: relative; transform: ${transformValue};`;
        transformOrigin = 'transform-origin: bottom center;';
    } else {
        posicionEstilo = `position: relative; transform: ${transformValue};`;
        transformOrigin = 'transform-origin: center center;';
    }

    let wrapperHeight = (fsm.state === 'COMBAT' || fsm.state === 'PLAY') ? '100%' : '150px';
    let wrapperAlign = (fsm.state === 'COMBAT' || fsm.state === 'PLAY') ? 'flex-end' : 'center';

    // AÑADIDA CLASE .digimon-sprite PARA SER DETECTADA POR EL JUEGO DE PELOTA Y CARICIAS
    return `<div style="display: flex; justify-content: center; align-items: ${wrapperAlign}; height: ${wrapperHeight}; width: 100%; position: relative;">
            <div class="sprite-grid-render digimon-sprite" style="
                --sheet-url: url('${SHEET_CONFIG.url}'); 
                --offset-x: ${SHEET_CONFIG.startX}; --offset-y: ${SHEET_CONFIG.startY};
                --w: ${SHEET_CONFIG.w}; --h: ${SHEET_CONFIG.h}; 
                --sheet-w: ${SHEET_CONFIG.sheetW}px; --sheet-h: ${SHEET_CONFIG.sheetH}px;
                --row: ${digi.row}; --col: ${animConfig.col}; --frames: ${animConfig.frames};
                --transform: ${transformValue}; ${posicionEstilo} ${transformOrigin} ${inlineStyle}
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
    let uiCheckKey = `${fsm.state}_${db.stage}_${subMenuIndex}_${db.poop}_${db.hunger}_${db.isSick}_${eggTaps}_${isEggWobbling}_${spritePosX}_${spriteDireccion}_${db.lastAiResponse}_${walkLog}_${db.happiness}${combatKey}`;
   
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
        case 'INVENTORY':
            let invKeys = Object.keys(db.inventory || {}).filter(k => db.inventory[k] > 0);
            invKeys.push('VOLVER');
            
            let startIdx = Math.max(0, Math.min(subMenuIndex - 1, invKeys.length - 3));
            let visibleList = invKeys.slice(startIdx, startIdx + 3).map((key, idx) => {
                let actualIdx = startIdx + idx;
                let isSelected = actualIdx === subMenuIndex;
                if (key === 'VOLVER') {
                    return `${isSelected ? '👉' : '    '} VOLVER`;
                }
                let item = ITEM_CATALOG[key] || { nombre: key, emote: '📦' };
                return `${isSelected ? '👉' : '    '} ${item.emote} ${item.nombre} x${db.inventory[key]}`;
            }).join('<br>');

            view.innerHTML = `
                <div class="menu-title">🎒 INVENTARIO 🎒</div>
                <div class="menu-list" style="text-align:left; width:90%; margin-top:8px; font-size:10px; line-height:16px;">
                    ${visibleList || 'Mochila vacía<br>👉 VOLVER'}
                </div>`;
            break;

        case 'HATCHING':
            let wobbleAnimation = isEggWobbling ? 'animation: egg-shake 0.2s ease-in-out;' : '';
            view.innerHTML = `
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
                <div class="menu-title" style="color: #d32f2f;">💀 FIN DE LA PARTIDA 💀</div>
                <div style="position: relative; width: 100%; height: 110px; display: flex; justify-content: center; align-items: center;">
                    <div style="position: absolute; top: 10px; font-size: 24px; animation: float-skull 2s infinite ease-in-out; z-index: 10;">💀</div>
                    <div class="dead-sprite-wrapper" style="width: 100%; height: 100%;">
                        ${getAnimatedSprite(db.stage, 'sleep')}
                    </div>
                </div>
                <div class="menu-list" style="font-size:10px; margin-top:2px; color:#555;">[Savegame Borrado]</div>
                <div class="menu-list" style="font-size:11px; margin-top:2px; font-weight:bold;">[PTT para Reiniciar]</div>`;
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
                <div class="menu-list" style="text-align:left; width:85%; margin-top:6px; font-size:10px;">
                    ${subMenuIndex === 0 ? '👉 BUSCAR COMBATE' : '    BUSCAR COMBATE'}<br>
                    ${subMenuIndex === 1 ? '👉 ENTRENAR' : '    ENTRENAR'}<br>
                    ${subMenuIndex === 2 ? '👉 PASEAR' : '    PASEAR'}<br>
                    ${subMenuIndex === 3 ? '👉 VOLVER' : '    VOLVER'}
                </div>`;
            break;
            
        case 'WALK':
            view.innerHTML = `
                <style>
                    .walk-bounce { animation: walk-bounce 0.4s infinite alternate ease-in-out; }
                    @keyframes walk-bounce { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }
                    .grass-layer { position: absolute; bottom: 0; left: 0; width: 200%; height: 35px; background: repeating-linear-gradient(45deg, #2d4c1e, #2d4c1e 10px, #3a5f27 10px, #3a5f27 20px); opacity: 0.8; z-index: 10; border-top: 2px dashed #111; animation: slide-grass 1s linear infinite; }
                    @keyframes slide-grass { from { transform: translateX(0); } to { transform: translateX(-28px); } }
                </style>
                <div class="menu-title">🌳 DE PASEO 🌳</div>
                <div class="menu-list" style="font-size:9px; height:12px; margin-top:2px; color:#222; font-weight:bold;">${walkLog}</div>
                <div style="position: relative; width: 100%; height: 90px; display: flex; justify-content: center; align-items: flex-end; overflow: hidden; margin-top: 5px;">
                    <div class="walk-bounce" style="z-index: 5; margin-bottom: 5px;">
                        ${getAnimatedSprite(db.stage, 'idle')}
                    </div>
                    <div class="grass-layer"></div>
                </div>
                <div style="font-size: 0.65rem; color: #333; margin-top: 6px;">[PTT: Volver a casa]</div>`;
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
            let isAnimating = combatState.subPhase === 'ANIMATING';
            let playerAnim = (isAnimating && combatState.attacker === 'player') ? 'attack' : ((isAnimating && combatState.attacker === 'enemy') ? 'hurt' : 'idle');
            let enemyAnim = (isAnimating && combatState.attacker === 'enemy') ? 'attack' : ((isAnimating && combatState.attacker === 'player') ? 'hurt' : 'idle');

            view.innerHTML = `
                <div class="menu-title" style="font-size:10px;">⚔️ VS ${enemyData.nombre.toUpperCase()} ⚔️</div>
                <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end; height: 150px; margin: 2px 0; padding-bottom: 4px; position: relative; width: 100%; overflow: hidden;">
                    <div id="emote-container" style="position: absolute; font-size: 20px; z-index: 20; opacity: 0; pointer-events: none;">
                        ${isAnimating ? combatState.actionEmote : ''}
                    </div>
                    <div style="width: 42%; height: 100%; display: flex; justify-content: center; align-items: flex-end;">
                        ${getAnimatedSprite(db.stage, playerAnim, -1)}
                    </div>
                    <div style="font-size: 10px; font-weight: bold; color: #333; width: 16%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 5;">VS</div>
                    <div style="width: 42%; height: 100%; display: flex; justify-content: center; align-items: flex-end;">
                        ${getAnimatedSprite(combatState.enemyId, enemyAnim, 1)}
                    </div>
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

            if (isAnimating && combatState.actionEmote) {
                requestAnimationFrame(() => triggerEmoteAnimation());
            }
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

        case 'PLAY':
            const gameBall = document.getElementById('fetch-ball');
            if (gameBall) gameBall.style.display = 'block';

            view.innerHTML = `
                <div class="menu-title">🥎 JUEGO DE PELOTA 🥎</div>
                <div style="position: relative; width: 100%; height: 130px; overflow: hidden; margin-top: 5px; display: flex; align-items: flex-end; justify-content: center;">
                    
                    <div style="position: absolute; bottom: 8px; left: 0; width: 100%; height: 1px; border-top: 1px dashed #444; opacity: 0.6; z-index: 1;"></div>
                    
                    <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 8px;">
                        ${getAnimatedSprite(db.stage, animState)}
                    </div>
                </div>
                <div class="menu-list" style="font-size: 9px; text-align: center; color: #222; font-weight: bold; margin-top: 4px;">
                    [Presiona BACK o PTT para salir]
                </div>`;
            break;
    }
    
    actualizarFilaIconos();
}

function actualizarFilaIconos() {
    for (let i = 0; i < 8; i++) {
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

fsm.register('INVENTORY', {
    onEnter: () => { subMenuIndex = 0; renderUI(); },
    onInput: (action) => {
        let invKeys = Object.keys(db.inventory || {}).filter(k => db.inventory[k] > 0);
        invKeys.push('VOLVER');

        if (action === 'NEXT') { 
            subMenuIndex = (subMenuIndex + 1) % invKeys.length; 
            renderUI(); 
        }
        else if (action === 'PREV') { 
            subMenuIndex = (subMenuIndex - 1 + invKeys.length) % invKeys.length; 
            renderUI(); 
        }
        else if (action === 'EXEC') {
            let selectedKey = invKeys[subMenuIndex];
            if (selectedKey === 'VOLVER' || !selectedKey) {
                fsm.transition('MAIN');
                return;
            }
            
            let item = ITEM_CATALOG[selectedKey];
            if (!item || db.inventory[selectedKey] <= 0) return;

            if (item.tipo === 'comida' || item.tipo === 'bebida') {
                db.inventory[selectedKey]--;
                if (item.hambre) db.hunger = Math.max(0, db.hunger - item.hambre);
                if (item.energia) db.energy = Math.min(4, db.energy + item.energia);
                guardarJuego();
                fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' });
            } else if (item.tipo === 'cura') {
                if (db.isSick) {
                    db.inventory[selectedKey]--;
                    db.isSick = false;
                    guardarJuego();
                    fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' });
                } else {
                    fsm.transition('MAIN');
                }
            } else {
                console.log(`[INVENTARIO]: ${item.nombre} reservado para agricultura o crafteo.`);
                fsm.transition('MAIN');
            }
        }
    }
});

fsm.register('PLAY', {
    onEnter: () => {
        const ball = document.getElementById('fetch-ball');
        const hand = document.getElementById('hand-cursor');
        const lcdScreen = document.querySelector('.lcd-screen');
        if (ball) {
            ball.style.display = 'block';
            // Posicionar la pelota abajo a la derecha de forma adaptativa
            if (lcdScreen) {
                ball.style.left = `${lcdScreen.clientWidth - 40}px`;
                ball.style.top = `${lcdScreen.clientHeight - 65}px`;
                ball.style.bottom = 'auto';
                ball.style.right = 'auto';
            }
        }

        window.playState = {
            isPetting: false,
            isDraggingBall: false,
            ballX: (lcdScreen ? lcdScreen.clientWidth - 40 : 180),
            ballY: (lcdScreen ? lcdScreen.clientHeight - 65 : 180),
            vx: 0,
            vy: 0,
            isAirborne: false,
            lastMouseX: 0,
            lastMouseY: 0,
            frictionCounter: 0,
            digimonOffset: 0,
            ballCaughtCooldown: false
        };

        if (typeof activarEventosPlay === 'function') {
            activarEventosPlay();
        }

        renderUI();
    },
    
    onExit: () => {
        const ball = document.getElementById('fetch-ball');
        const hand = document.getElementById('hand-cursor');
        if (ball) ball.style.display = 'none';
        if (hand) hand.style.display = 'none';

        const digimon = document.querySelector('.digimon-sprite');
        if (digimon) digimon.classList.remove('happy-jump');

        if (typeof desactivarEventosPlay === 'function') {
            desactivarEventosPlay();
        }
        
        window.playState = null;
    },

    // CORREGIDO: Cambiado de handleInput a onInput para funcionar con la FSM
    onInput: (action) => {
        if (action === 'BACK' || action === 'SELECT' || action === 'EXEC') {
            fsm.transition('MAIN');
        }
    }
});

fsm.register('HATCHING', {
    onEnter: () => { 
        db.lastStageCheck = ''; 
        renderUI(); 
    },
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
        if (action === 'NEXT') { currentIconIndex = (currentIconIndex + 1) % 8; renderUI(); }
        else if (action === 'PREV') { currentIconIndex = (currentIconIndex - 1 + 8) % 8; renderUI(); }
        else if (action === 'EXEC') {
            switch(currentIconIndex) {
                case 0: fsm.transition('INVENTORY'); break; 
                case 1: fsm.transition('EXPEDITION'); break;
                case 2: fsm.transition('SHOP'); break;
                case 3: fsm.transition('KEYBOARD'); break;
                case 4: fsm.transition('SLEEP'); break;
                case 5: db.poop = 0; fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' }); break;
                case 6: 
                    if (db.inventory && db.inventory.medicina > 0) {
                        db.inventory.medicina--;
                        db.isSick = false;
                        guardarJuego();
                        fsm.transition('MENU_EXEC', { duration: 1000, next: 'MAIN' });
                    } else {
                        fsm.transition('SHOP');
                    }
                    break;
                case 7: fsm.transition('PLAY'); break;
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
    onEnter: () => { 
        db.lastStageCheck = ''; 
        renderUI(); 
    },
    onInput: (action) => {
        if (action === 'EXEC') {
            db = {
                phase: 'HATCHING', stage: 'yukimibotamon', hunger: 0, energy: 4, poop: 0,
                isSick: false, coins: 10, level: 1, careMistakes: 0, trainings: 0, lastStageCheck: '',
                lastAiResponse: '', happiness: 0,
                 inventory: {
                    carne: 3, carne_xl: 1, pienso: 2, medicina: 1, agua: 5, café: 1, leche: 1,
                    patata: 0, calabaza: 0, cebolla: 0, arroz: 0, lechuga: 0, pescado: 1,
                    trigo: 0, harina: 0,
                    semilla_patata: 2, semilla_calabaza: 1, semilla_cebolla: 1, semilla_arroz: 1, semilla_trigo: 2, semilla_lechuga: 1
                }
            };
            eggTaps = 0;
            isEggWobbling = false;
            guardarJuego(); 
            fsm.transition('HATCHING');
        }
    }
});

fsm.register('EXPEDITION', {
    onEnter: () => { subMenuIndex = 0; renderUI(); },
    onInput: (action) => {
        if (action === 'NEXT') { subMenuIndex = (subMenuIndex + 1) % 4; renderUI(); }
        else if (action === 'PREV') { subMenuIndex = (subMenuIndex - 1 + 4) % 4; renderUI(); }
        else if (action === 'EXEC') {
            if (subMenuIndex === 0) iniciarBatalla();
            else if (subMenuIndex === 1) iniciarEntrenamiento();
            else if (subMenuIndex === 2) iniciarPaseo();
            else if (subMenuIndex === 3) fsm.transition('MAIN');
        }
    }
});

fsm.register('WALK', {
    onEnter: () => {
        walkLog = "Caminando por el bosque...";
        renderUI();

        walkTimer = setTimeout(() => {
            walkLog = "¡Paseo terminado! Volviendo...";
            renderUI();
            setTimeout(() => fsm.transition('MAIN'), 2000);
        }, 120000);

        walkInterval = setInterval(() => {
            let roll = Math.random();
            if (roll < 0.15) {
                if (Math.random() < 0.7) { 
                    const lootTable = ['agua', 'pienso', 'semilla_patata', 'semilla_lechuga', 'semilla_trigo'];
                    let loot = lootTable[Math.floor(Math.random() * lootTable.length)];
                    db.inventory[loot] = (db.inventory[loot] || 0) + 1;
                    let itemData = ITEM_CATALOG[loot];
                    walkLog = `¡Encontraste ${itemData.emote} ${itemData.nombre}!`;
                    guardarJuego();
                    renderUI();
                } else { 
                    clearInterval(walkInterval);
                    clearTimeout(walkTimer);
                    walkLog = "¡Digimon salvaje a la vista!";
                    renderUI();
                    setTimeout(() => iniciarBatallaPaseo(), 1500);
                }
            } else {
                const textos = ["Oliendo las flores...", "Buscando en los arbustos...", "Mirando las nubes...", "Disfrutando la brisa...", "Caminando tranquilamente..."];
                walkLog = textos[Math.floor(Math.random() * textos.length)];
                renderUI();
            }
        }, 5000);
    },
    onExit: () => {
        if (walkTimer) clearTimeout(walkTimer);
        if (walkInterval) clearInterval(walkInterval);
    },
    onInput: (action) => {
        if (action === 'EXEC') {
            fsm.transition('MAIN');
        }
    }
});

fsm.register('SHOP', {
    onEnter: () => { subMenuIndex = 0; renderUI(); },
    onInput: (action) => {
        if (action === 'NEXT') { subMenuIndex = (subMenuIndex + 1) % 3; renderUI(); }
        else if (action === 'PREV') { subMenuIndex = (subMenuIndex - 1 + 3) % 3; renderUI(); }
        else if (action === 'EXEC') {
            if (subMenuIndex === 0 && db.coins >= 4) { 
                db.coins -= 4; 
                db.inventory.carne_xl = (db.inventory.carne_xl || 0) + 1; 
            }
            else if (subMenuIndex === 1 && db.coins >= 8) { 
                db.coins -= 8; 
                db.inventory.medicina = (db.inventory.medicina || 0) + 1; 
            }
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

// --- 5. SISTEMAS TÁCTILES EN EL ESTADO "PLAY" ---

let _onPointerDownRef = null;
let _onPointerMoveRef = null;
let _onPointerUpRef = null;

function activarEventosPlay() {
    const lcdScreen = document.querySelector('.lcd-screen');
    const hand = document.getElementById('hand-cursor');
    const ball = document.getElementById('fetch-ball');
    
    if (!lcdScreen || !hand) return;

    hand.style.display = 'none';

    _onPointerDownRef = (e) => {
        if (fsm.state !== 'PLAY' || !window.playState) return;
        
        // Comprobar si el toque es directamente sobre la pelota
        if (e.target === ball || (ball && ball.contains(e.target))) {
            e.preventDefault(); 
            window.playState.isDraggingBall = true;
            window.playState.isAirborne = false;
            window.playState.vx = 0;
            window.playState.vy = 0;
            
            const rectLCD = lcdScreen.getBoundingClientRect();
            window.playState.lastMouseX = e.clientX - rectLCD.left;
            window.playState.lastMouseY = e.clientY - rectLCD.top;
            return;
        }

        window.playState.isPetting = true;
        hand.style.display = 'block';
        actualizarPosicionMano(e, lcdScreen, hand);
    };

    _onPointerMoveRef = (e) => {
        if (fsm.state !== 'PLAY' || !window.playState) return;

        const rectLCD = lcdScreen.getBoundingClientRect();
        const currentX = e.clientX - rectLCD.left;
        const currentY = e.clientY - rectLCD.top;

        // 1. Arrastrando la pelota
        if (window.playState.isDraggingBall && ball) {
            window.playState.vx = (currentX - window.playState.lastMouseX) * 0.85;
            window.playState.vy = (currentY - window.playState.lastMouseY) * 0.85;

            window.playState.ballX = Math.max(10, Math.min(rectLCD.width - 30, currentX - 12));
            window.playState.ballY = Math.max(10, Math.min(rectLCD.height - 30, currentY - 12));
            window.playState.isAirborne = false;

            window.playState.lastMouseX = currentX;
            window.playState.lastMouseY = currentY;

            ball.style.left = `${window.playState.ballX}px`;
            ball.style.top = `${window.playState.ballY}px`;
            return;
        }

        // 2. Acariciando al Digimon
        if (window.playState.isPetting && hand) {
            actualizarPosicionMano(e, lcdScreen, hand);
            
            const digimonSprite = document.querySelector('.digimon-sprite');
            if (digimonSprite) {
                const rectDigimon = digimonSprite.getBoundingClientRect();
                if (e.clientX >= rectDigimon.left && e.clientX <= rectDigimon.right &&
                    e.clientY >= rectDigimon.top && e.clientY <= rectDigimon.bottom) {
                    
                    window.playState.frictionCounter++;
                    hand.style.transform = `rotate(${Math.sin(window.playState.frictionCounter * 0.5) * 18}deg)`;

                    if (window.playState.frictionCounter >= 25) {
                        window.playState.frictionCounter = 0;
                        ejecutarEfectoCariciaFeliz(digimonSprite);
                    }
                }
            }
        }
    };

    _onPointerUpRef = (e) => {
        if (fsm.state !== 'PLAY' || !window.playState) return;

        if (window.playState.isDraggingBall) {
            window.playState.isAirborne = true;
            window.playState.vx = Math.max(-15, Math.min(15, window.playState.vx));
            window.playState.vy = Math.max(-15, Math.min(15, window.playState.vy));
        }

        window.playState.isPetting = false;
        window.playState.isDraggingBall = false;
        
        if (hand) {
            hand.style.display = 'none';
            hand.style.transform = 'rotate(0deg)';
        }
    };

    // CORREGIDO: Los eventos se escuchan en la pantalla LCD completa y window
    lcdScreen.addEventListener('pointerdown', _onPointerDownRef, { passive: false });
    window.addEventListener('pointermove', _onPointerMoveRef, { passive: false });
    window.addEventListener('pointerup', _onPointerUpRef);
}

function actualizarPosicionMano(e, lcdScreen, hand) {
    const rectLCD = lcdScreen.getBoundingClientRect();
    const xRelativa = e.clientX - rectLCD.left - 12;
    const yRelativa = e.clientY - rectLCD.top - 12;

    hand.style.left = `${xRelativa}px`;
    hand.style.top = `${yRelativa}px`;
}

function ejecutarEfectoCariciaFeliz(digimonSprite) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch(err) { console.log("Audio no soportado aún"); }

    db.happiness = Math.min(4, (db.happiness || 0) + 1);
    if (typeof guardarJuego === 'function') guardarJuego();

    if (digimonSprite) {
        digimonSprite.classList.add('happy-jump');
        setTimeout(() => digimonSprite.classList.remove('happy-jump'), 1200);
    }
}

function desactivarEventosPlay() {
    const lcdScreen = document.querySelector('.lcd-screen');
    if (lcdScreen && _onPointerDownRef) lcdScreen.removeEventListener('pointerdown', _onPointerDownRef);
    if (_onPointerMoveRef) window.removeEventListener('pointermove', _onPointerMoveRef);
    if (_onPointerUpRef) window.removeEventListener('pointerup', _onPointerUpRef);
}

// --- MOTOR FÍSICO Y DE IA DEL MINIJUEGO ---
function actualizarFisicasMinijuego() {
    if (fsm.state !== 'PLAY' || !window.playState || window.playState.isDraggingBall) return;

    const ball = document.getElementById('fetch-ball');
    const digimonSprite = document.querySelector('.digimon-sprite');
    const lcdScreen = document.querySelector('.lcd-screen');
    if (!ball || !lcdScreen) return;

    // Colisiones dinámicas según el tamaño real en píxeles del LCD
    const lcdWidth = lcdScreen.clientWidth || 300;
    const lcdHeight = lcdScreen.clientHeight || 300;
    
    const gravedad = 0.45;
    const friccionSuelo = 0.94;
    const rebote = -0.65;
    const sueloY = lcdHeight - 55; // Suelo justo sobre el margen inferior
    const limiteDerecho = lcdWidth - 30;
    const limiteIzquierdo = 10;

    // 1. FÍSICAS DE LA PELOTA
    if (window.playState.isAirborne || Math.abs(window.playState.vx) > 0.1 || window.playState.ballY < sueloY) {
        
        window.playState.vy += gravedad;
        window.playState.ballX += window.playState.vx;
        window.playState.ballY += window.playState.vy;

        if (window.playState.ballY >= sueloY) {
            window.playState.ballY = sueloY;
            window.playState.vy *= rebote;
            window.playState.vx *= friccionSuelo;

            if (Math.abs(window.playState.vy) < 1) {
                window.playState.vy = 0;
                window.playState.isAirborne = false;
            }
        }

        if (window.playState.ballX >= limiteDerecho) {
            window.playState.ballX = limiteDerecho;
            window.playState.vx *= rebote;
        } else if (window.playState.ballX <= limiteIzquierdo) {
            window.playState.ballX = limiteIzquierdo;
            window.playState.vx *= rebote;
        }

        ball.style.left = `${window.playState.ballX}px`;
        ball.style.top = `${window.playState.ballY}px`;
    }

    // 2. IA DEL DIGIMON (Solo persigue cuando la pelota está cerca o en el suelo)
    if (digimonSprite && window.playState.ballY >= sueloY - 30) {
        const rectDigimon = digimonSprite.getBoundingClientRect();
        const rectLCD = lcdScreen.getBoundingClientRect();
        
        // Calculamos el centro horizontal real en píxeles
        const digimonCenterX = rectDigimon.left + (rectDigimon.width / 2) - rectLCD.left;
        const distancia = window.playState.ballX - digimonCenterX;
        const scaleFactor = 8; // Preservamos la escala normal de PLAY

        if (Math.abs(distancia) > 20) {
            const velocidadPaso = 2;
            if (distancia > 0) {
                window.playState.digimonOffset += velocidadPaso;
                digimonSprite.style.transform = `scale(${scaleFactor}) scaleX(-1)`;
            } else {
                window.playState.digimonOffset -= velocidadPaso;
                digimonSprite.style.transform = `scale(${scaleFactor}) scaleX(1)`;
            }
            digimonSprite.style.left = `${window.playState.digimonOffset}px`;
            
        } else if (!window.playState.ballCaughtCooldown && (Math.abs(window.playState.vx) > 0.2 || window.playState.ballY >= sueloY - 5)) {
            // ¡ATRAPA LA PELOTA!
            window.playState.ballCaughtCooldown = true;
            window.playState.vx = 0;
            window.playState.vy = 0;
            window.playState.isAirborne = false;
            
            ejecutarEfectoCariciaFeliz(digimonSprite);
            
            // Relanza la pelota al lado opuesto tras 1.2 segundos
            setTimeout(() => {
                if (window.playState && fsm.state === 'PLAY' && !window.playState.isDraggingBall) {
                    window.playState.vy = -7;
                    window.playState.vx = (window.playState.ballX > lcdWidth / 2) ? -6 : 6;
                    window.playState.isAirborne = true;
                    setTimeout(() => { if (window.playState) window.playState.ballCaughtCooldown = false; }, 500);
                } else if (window.playState) {
                    window.playState.ballCaughtCooldown = false;
                }
            }, 1200);
        }
    }
}

// --- 6. SISTEMAS DE ENTRENAMIENTO Y COMBATE ---

function iniciarEntrenamiento() {
    db.trainings++;
    db.energy = Math.max(0, db.energy - 1);
    db.coins += 2;
    guardarJuego();
    fsm.transition('MENU_EXEC', { duration: 1200, next: 'MAIN' });
}

function iniciarPaseo() {
    if (db.energy === 0) { fsm.transition('MAIN'); return; }
    db.energy = Math.max(0, db.energy - 1);
    db.hunger = Math.min(4, db.hunger + 1);
    guardarJuego();
    fsm.transition('WALK');
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
        message: '¡ELIGE TU ACCIÓN TÁCTICA!', playerAction: 0, isWalk: false
    };
    fsm.transition('COMBAT');
}

function iniciarBatallaPaseo() {
    const enemigosBajos = ['yukimibotamon', 'nyaromon', 'agumon', 'gabumon', 'gammamon'];
    const enemigoAleatorio = enemigosBajos[Math.floor(Math.random() * enemigosBajos.length)];

    let maxHp = 10 + (db.level * 3);
    let enemyMaxHp = 8 + (db.level * 2);

    combatState = {
        enemyId: enemigoAleatorio, playerHp: maxHp, playerMaxHp: maxHp,
        enemyHp: enemyMaxHp, enemyMaxHp: enemyMaxHp, subPhase: 'SELECT',
        message: '¡COMBATE DE PASEO!', playerAction: 0, isWalk: true
    };
    fsm.transition('COMBAT');
}

function resolverTurnoCombate(accionJugador) {
    combatState.subPhase = 'ANIMATING';
    combatState.playerAction = accionJugador;
    
    const accionRival = Math.floor(Math.random() * 3);
    const nombresAccion = ['ATQ', 'VEL', 'DEF'];
    const emotesAccion = ['⚔️', '⚡', '🛡️'];
    const statsJugador = ROSTER[db.stage] || ROSTER['agumon'];
    const statsRival = ROSTER[combatState.enemyId] || ROSTER['agumon'];
    
    let ventaja = 0;
    if (accionJugador !== accionRival) {
        if ((accionJugador === 0 && accionRival === 2) || (accionJugador === 1 && accionRival === 0) || (accionJugador === 2 && accionRival === 1)) {
            ventaja = 1;
        } else { ventaja = -1; }
    }

    if (ventaja === 1) {
        combatState.attacker = 'player';
        combatState.actionEmote = emotesAccion[accionJugador];
    } else if (ventaja === -1) {
        combatState.attacker = 'enemy';
        combatState.actionEmote = emotesAccion[accionRival];
    } else {
        let statJ = accionJugador === 0 ? statsJugador.atq : (accionJugador === 1 ? statsJugador.vel : statsJugador.def);
        let statR = accionRival === 0 ? statsRival.atq : (accionRival === 1 ? statsRival.vel : statsRival.def);
        combatState.attacker = statJ >= statR ? 'player' : 'enemy';
        combatState.actionEmote = emotesAccion[accionJugador];
    }

    let statJ_Usado = accionJugador === 0 ? statsJugador.atq : (accionJugador === 1 ? statsJugador.vel : statsJugador.def);
    let statR_Usado = accionRival === 0 ? statsRival.atq : (accionRival === 1 ? statsRival.vel : statsRival.def);

    if (ventaja === 1) {
        let dano = Math.max(3, Math.floor((statJ_Usado * 0.8) - (statsRival.def * 0.3) + 2));
        combatState.enemyHp = Math.max(0, combatState.enemyHp - dano);
        combatState.message = `¡${nombresAccion[accionJugador]} SUPERA ${nombresAccion[accionRival]}! -${dano} HP RIVAL`;
    } else if (ventaja === -1) {
        let dano = Math.max(2, Math.floor((statR_Usado * 0.8) - (statsJugador.def * 0.3) + 2));
        combatState.playerHp = Math.max(0, combatState.playerHp - dano);
        combatState.message = `¡${nombresAccion[accionRival]} SUPERA ${nombresAccion[accionJugador]}! -${dano} HP TÚ`;
    } else {
        if (statJ_Usado >= statR_Usado) {
            combatState.enemyHp = Math.max(0, combatState.enemyHp - 2);
            combatState.message = `¡CHOQUE! Tu fuerza domina: -2 HP RIVAL`;
        } else {
            combatState.playerHp = Math.max(0, combatState.playerHp - 2);
            combatState.message = `¡CHOQUE! El rival domina: -2 HP TÚ`;
        }
    }
    
    let etapaPrevia = db.stage;
    const enPeligroCritico = combatState.playerHp > 0 && combatState.playerHp <= (combatState.playerMaxHp * 0.3);
    const superacionEstatistica = ventaja === 1 && (statR_Usado > statJ_Usado);
    const choqueGanado = ventaja === 0 && (statJ_Usado >= statR_Usado);
    const enBuenEstado = !db.isSick && db.energy >= 1 && db.hunger < 4;
    
    if (enBuenEstado && (enPeligroCritico || superacionEstatistica || choqueGanado)) {
        if (Math.random() < 0.25) {
            comprobarEvolucion();
        }
    }
    
    if (db.stage !== etapaPrevia) {
        let nombreNuevo = (ROSTER[db.stage]?.nombre || db.stage).toUpperCase();
        combatState.message = `¡EL PELIGRO DESATÓ SU FUERZA! ¡EVOLUCIONA A ${nombreNuevo}!`;
        combatState.playerHp = Math.min(combatState.playerMaxHp, combatState.playerHp + 6);
        db.energy = Math.min(4, db.energy + 1);
    }

    db.lastStageCheck = '';
    renderUI(); 

    setTimeout(() => {
        if (combatState.enemyHp <= 0) {
            combatState.subPhase = 'END';
            if (combatState.isWalk) {
                db.inventory.carne = (db.inventory.carne || 0) + 1;
                combatState.message = `¡VICTORIA! +1 CARNE [PTT: Salir]`;
            } else {
                db.coins += 8; 
                db.level++;
                if (db.stage === etapaPrevia) {
                    combatState.message = `¡VICTORIA! +8C y +1 LVL [PTT: Salir]`;
                }
            }
        } else if (combatState.playerHp <= 0) {
            if (combatState.isWalk) {
                db.energy = Math.max(0, db.energy - 1);
                combatState.subPhase = 'END';
                combatState.message = `¡HUÍSTE CANSADO! -1 BATERÍA [PTT]`;
                guardarJuego();
                return;
            } else {
                ejecutarMuerte("CAYÓ EN BATALLA");
                return;
            }
        } else {
            combatState.subPhase = 'SELECT';
            if (db.stage === etapaPrevia) {
                combatState.message = `¿QUÉ HARÁS AHORA?`;
            }
        }
        db.lastStageCheck = '';
        renderUI();
    }, 1800);
}

function triggerEmoteAnimation() {
    const emote = document.getElementById('emote-container');
    if (!emote) return;

    const fromLeft = combatState.attacker === 'player';
    
    emote.animate([
        { left: fromLeft ? '20%' : '80%', top: '35%', opacity: 0, transform: 'scale(0.5)' },
        { opacity: 1, transform: 'scale(1.4)' },
        { left: fromLeft ? '80%' : '20%', top: '35%', opacity: 1, transform: 'scale(1.4)' },
        { opacity: 0, transform: 'scale(2)' }
    ], {
        duration: 1400,
        easing: 'ease-in-out',
        fill: 'forwards'
    });
}

// --- 7. EVOLUCIÓN CONDICIONADA ---

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

function comprobarInvolucion() {
    const etapasEstables = ['yukimibotamon', 'nyaromon', 'agumon', 'gabumon', 'gammamon'];
    if (etapasEstables.includes(db.stage)) return;

    if (db.careMistakes >= 3 || db.isSick || db.hunger >= 4) {
        let etapaAnterior = db.stage;
        
        if (db.stage === 'omegamon') db.stage = 'wargreymon';
        else if (db.stage === 'wargreymon') db.stage = 'metalgreymon';
        else if (db.stage === 'metalgarurumon') db.stage = 'weregarurumon';
        else if (db.stage === 'arcturusmon') db.stage = 'regulusmon';
        else if (db.stage === 'metalgreymon' || db.stage === 'asuramon') db.stage = 'greymon';
        else if (db.stage === 'weregarurumon' || db.stage === 'metalmamemon') db.stage = 'garurumon';
        else if (db.stage === 'regulusmon') db.stage = 'gulusgammamon';
        else if (db.stage === 'greymon' || db.stage === 'leomon' || db.stage === 'igamon') db.stage = 'agumon';
        else if (db.stage === 'garurumon' || db.stage === 'tailmon') db.stage = 'gabumon';
        else if (db.stage === 'betelgammamon' || db.stage === 'kausgammamon' || db.stage === 'wezengammamon' || db.stage === 'gulusgammamon') db.stage = 'gammamon';

        if (db.stage !== etapaAnterior) {
            db.careMistakes = 1;
        }
    }
}

// --- 8. MOTOR DE PERMADEATH ---

function ejecutarMuerte(motivo = "FALLECIÓ") {
    console.log(`[PERMADEATH]: El Digimon ha muerto por: ${motivo}`);
    localStorage.removeItem('r1_digipet_save');
    fsm.transition('DEAD');
}

function comprobarMuertePorCuidado() {
    if ((db.energy === 0 && db.hunger >= 4 && db.isSick) || db.careMistakes >= 5) {
        ejecutarMuerte("COLAPSO POR NEGLIGENCIA");
        return true; 
    }
    return false;
}

// --- 9. INTELIGENCIA ARTIFICIAL & RABBIT R1 BRIDGE ---

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

// --- 10. CICLO DE RENDIMIENTO AVANZADO (requestAnimationFrame) ---

let lastWanderTime = 0;
let lastVitalTime = 0;

function gameLoop(timestamp) {

    actualizarFisicasMinijuego();

    if (!lastWanderTime) lastWanderTime = timestamp;
    if (!lastVitalTime) lastVitalTime = timestamp;

    const wanderDelta = timestamp - lastWanderTime;
    const vitalDelta = timestamp - lastVitalTime;

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
            }
            comprobarInvolucion();
            if (comprobarMuertePorCuidado()) return;
            guardarJuego();
            renderUI();
        }
    }

    fsm.update(timestamp);
    requestAnimationFrame(gameLoop);
}

// --- 11. ARRANQUE ASÍNCRONO DEL MOTOR ---

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

        if (db.phase === 'HATCHING') {
            db.stage = 'yukimibotamon';
        }

        fsm.transition(db.phase === 'MENU_EXEC' || db.phase === 'COMMS_THINKING' ? 'MAIN' : db.phase);
        requestAnimationFrame(gameLoop);

    } catch (e) {
        console.error("Fallo crítico al inicializar base de datos:", e);
        document.body.innerHTML = `<div style="color:red; text-align:center; padding:20px;">[ERROR DE ARRANQUE: Faltan archivos .json en la carpeta /data]</div>`;
    }
}

document.addEventListener('DOMContentLoaded', bootGame);