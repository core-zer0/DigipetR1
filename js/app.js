// js/app.js

// --- 1. ESTADO DEL JUEGO ---
let db = JSON.parse(localStorage.getItem('r1_digipet_save')) || {
    phase: 'HATCHING', stage: 'yukimibotamon', hunger: 0, energy: 4, poop: 0,
    isSick: false, coins: 10, level: 1, careMistakes: 0, trainings: 0, lastStageCheck: '',
    lastAiResponse: ''
};

db.lastStageCheck = '';

if (db.phase === 'MENU_EXEC' || db.phase === 'COMMS_THINKING') {
    db.phase = 'MAIN';
}

let eggTaps = 0;
let isEggWobbling = false;
let combatState = {
    enemyId: 'goblimon',
    playerHp: 10,
    playerMaxHp: 10,
    enemyHp: 10,
    enemyMaxHp: 10,
    subPhase: 'SELECT', // 'SELECT', 'ANIMATING', 'END'
    message: '¡ENEMIGO SALVAJE!',
    playerAction: 0 // 0: Atacar, 1: Esquivar
};

if (typeof ROSTER !== 'undefined' && !ROSTER[db.stage]) {
    db.stage = 'yukimibotamon';
    db.phase = 'HATCHING';
}

let currentIconIndex = 0; 
let subMenuIndex = 0;
let spritePosX = 50;
let spriteDireccion = -1;

function guardarJuego() {
    localStorage.setItem('r1_digipet_save', JSON.stringify(db));
}

// --- 2. FUNCIONES DE RENDERIZADO VISUAL ---

function getAnimatedSprite(id, state = 'idle', forceFlip = null) {
    let digi = ROSTER[id] || ROSTER['yukimibotamon'];
    let animConfig = ANIMATIONS[state] || ANIMATIONS['idle'];
    
    let inlineStyle = animConfig.frames > 1 
        ? `animation: play-anim 0.8s steps(${animConfig.frames}) infinite;`
        : ``;

    // Si forceFlip es null, usa la dirección del deambuleo; si no, fuerza la orientación (-1 derecha, 1 izquierda)
    let flipX = forceFlip !== null ? forceFlip : (spriteDireccion === 1 ? -1 : 1);
    let scaleFactor = 8;
    let transformValue = `scale(${scaleFactor}) scaleX(${flipX})`;

    let posicionEstilo = (db.phase === 'MAIN' && state === 'idle' && forceFlip === null)
        ? `position: absolute; left: ${spritePosX}%; transform: translate(-50%, -50%) ${transformValue}; top: 55%;`
        : `transform: ${transformValue};`;

    return `<div style="display: flex; justify-content: center; align-items: center; height: 60px; width: 100%; position: relative;">
            <div class="sprite-grid-render" style="
                --sheet-url: url('${SHEET_CONFIG.url}'); 
                --offset-x: ${SHEET_CONFIG.startX};
                --offset-y: ${SHEET_CONFIG.startY};
                --w: ${SHEET_CONFIG.w}; 
                --h: ${SHEET_CONFIG.h}; 
                --sheet-w: ${SHEET_CONFIG.sheetW}px; 
                --sheet-h: ${SHEET_CONFIG.sheetH}px;
                --row: ${digi.row};
                --col: ${animConfig.col};
                --frames: ${animConfig.frames};
                --transform: ${transformValue};
                ${posicionEstilo}
                ${inlineStyle}
            "></div>
        </div>`;
}

function renderUI() {
    const view = document.getElementById('view-port');
    const statusBar = document.getElementById('status-bar');
    if (!view || !statusBar) return; 

    let currentData = ROSTER[db.stage] || ROSTER['yukimibotamon'];
    
    let emoteHambre = db.hunger >= 3 ? '💢' : '🍖';
    let emoteEnergia = db.energy <= 1 ? '🪫' : '🔋';
    let emoteSalud = db.isSick ? '🤢' : (db.poop > 0 ? '💩' : '✨');
    statusBar.innerText = `${currentData.nombre.toUpperCase()} ${emoteHambre} ${emoteEnergia} ${emoteSalud}`;

    
    if (db.phase === 'SLEEP') {
        view.style.filter = 'brightness(0.35) contrast(1.2)';
    } else {
        view.style.filter = 'none';
    }

// CORRECCIÓN: Se añade el estado de combate al check para que la pantalla se actualice al recibir daño

    let combatKey = db.phase === 'COMBAT' ? `_${combatState.playerHp}_${combatState.enemyHp}_${combatState.subPhase}_${combatState.message}` : '';
    let uiCheckKey = `${db.phase}_${db.stage}_${subMenuIndex}_${db.poop}_${db.hunger}_${db.isSick}_${eggTaps}_${isEggWobbling}_${spritePosX}_${spriteDireccion}_${db.lastAiResponse}${combatKey}`;
   
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
        let wobbleAnimation = isEggWobbling ? 'animation: egg-shake 0.2s ease-in-out;' : '';
        view.innerHTML = `
            <style>
                @keyframes egg-shake {
                    0% { transform: translateX(0) rotate(0deg); }
                    25% { transform: translateX(-3px) rotate(-6deg); }
                    75% { transform: translateX(3px) rotate(6deg); }
                    100% { transform: translateX(0) rotate(0deg); }
                }
            </style>
            <div class="menu-title">ELIGE TU HUEVO</div>
            <div style="display:inline-block; ${wobbleAnimation}">
                ${getAnimatedSprite('yukimibotamon', 'idle')}
            </div>
            <div class="menu-list" style="font-size:11px; margin-top:4px; line-height: 14px;">
                ${eggTaps > 0 ? `¡Se está moviendo!<br>Grietas: ${eggTaps}/5` : '[Pulsa PTT para incubar]'}
            </div>
        `;
    }
    else if (db.phase === 'SLEEP') {
        view.innerHTML = `
            <div class="menu-title">Zzz... Zzz...</div>
            ${getAnimatedSprite(db.stage, 'sleep')}
            <div class="menu-list" style="font-size:10px; margin-top:6px; color:#555;">[Cualquier botón despierta]</div>
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
                ${subMenuIndex === 0 ? '👉 BUSCAR COMBATE' : '    BUSCAR COMBATE'}<br>
                ${subMenuIndex === 1 ? '👉 ENTRENAR' : '    ENTRENAR'}<br>
                ${subMenuIndex === 2 ? '👉 VOLVER' : '    VOLVER'}
            </div>
        `;
    }
    else if (db.phase === 'SHOP') {
        view.innerHTML = `
            <div class="menu-title">🛒 TIENDA (${db.coins}C)</div>
            <div class="menu-list" style="text-align:left; width:85%; margin-top:10px;">
                ${subMenuIndex === 0 ? '👉 SUPER MEAT (4C)' : '    SUPER MEAT (4C)'}<br>
                ${subMenuIndex === 1 ? '👉 MEDICINA (8C)' : '    MEDICINA (8C)'}<br>
                ${subMenuIndex === 2 ? '👉 VOLVER' : '    VOLVER'}
            </div>
        `;
    }
    else if (db.phase === 'COMBAT') {
        let enemyData = ROSTER[combatState.enemyId] || ROSTER['agumon'];
        let playerAnim = combatState.subPhase === 'ANIMATING' && combatState.playerAction === 0 ? 'attack' : 'idle';
        let enemyAnim = combatState.subPhase === 'ANIMATING' && combatState.playerAction === 1 ? 'attack' : 'idle';

        view.innerHTML = `
            <div class="menu-title" style="font-size:10px;">⚔️ VS ${enemyData.nombre.toUpperCase()} ⚔️</div>
            <div style="display: flex; justify-content: space-around; align-items: center; height: 55px; margin: 2px 0;">
                <div style="width: 45%;">${getAnimatedSprite(db.stage, playerAnim, -1)}</div>
                <div style="font-size: 10px; font-weight: bold; color: #333;">VS</div>
                <div style="width: 45%;">${getAnimatedSprite(combatState.enemyId, enemyAnim, 1)}</div>
            </div>
            <div style="font-size: 9px; background: #111; color: #8b9d77; padding: 2px 4px; border-radius: 2px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>TÚ: ${combatState.playerHp}/${combatState.playerMaxHp}</span>
                <span>RIVAL: ${combatState.enemyHp}/${combatState.enemyMaxHp}</span>
            </div>
            <div class="menu-list" style="font-size: 10px; min-height: 14px; margin-bottom: 4px;">
                ${combatState.message}
            </div>
            ${combatState.subPhase === 'SELECT' ? `
            <div class="menu-list" style="font-size: 10px; display: flex; justify-content: center; gap: 10px;">
                <span style="${subMenuIndex === 0 ? 'font-weight:bold; text-decoration:underline;' : ''}">👉 ATACAR</span>
                <span style="${subMenuIndex === 1 ? 'font-weight:bold; text-decoration:underline;' : ''}">👉 ESQUIVAR</span>
            </div>` : ''}
        `;
    }
    else if (db.phase === 'MENU_EXEC') {
        view.innerHTML = `
            <div class="menu-title">PROCESANDO...</div>
            <div style="font-size:2.5rem; margin: 15px 0; animation: spin 1.5s infinite linear;">⚙️</div>
        `;
    }
    else if (db.phase === 'KEYBOARD') {
        view.innerHTML = `
            <div class="menu-title">TERMINAL DIGITAL</div>
            <div style="margin: 6px 0;">
                ${getAnimatedSprite(db.stage, 'idle')}
            </div>
            <form id="ai-form" style="width: 95%; display: flex; gap: 4px; margin: 0 auto;" onsubmit="enviarMensajeAI(event)">
                <input 
                    type="text" 
                    id="ai-input" 
                    placeholder="Toca para escribir..." 
                    autocomplete="off"
                    maxlength="50"
                    style="flex: 1; background: #111; color: #8b9d77; border: 2px solid #222; padding: 6px 8px; font-family: 'Courier New', monospace; font-size: 0.8rem; border-radius: 4px; outline: none; box-shadow: inset 0 0 5px rgba(0,0,0,0.8);"
                >
                <button type="submit" style="background: #222; color: #8b9d77; border: 1px solid #444; padding: 0 10px; font-weight: bold; border-radius: 4px; cursor: pointer;">✔</button>
            </form>
            <div style="font-size: 0.65rem; color: #333; margin-top: 8px;">[PTT o Enter para salir]</div>
        `;
        setTimeout(() => {
            const input = document.getElementById('ai-input');
            if (input) input.focus();
        }, 150);
    }
    // CORRECCIÓN: Pantalla de carga mientras el modelo piensa
    else if (db.phase === 'COMMS_THINKING') {
        view.innerHTML = `
            <div class="menu-title">TERMINAL DIGITAL</div>
            <div style="font-size:2rem; margin: 15px 0; animation: spin 1.5s infinite linear;">📡</div>
            <div class="menu-list" style="font-size:10px; color:#333;">[Conectando con el Digimundo...]</div>
        `;
    }
    // CORRECCIÓN: Pantalla para mostrar la respuesta del Digimon
    else if (db.phase === 'COMMS_RESPONSE') {
        view.innerHTML = `
            <div class="menu-title">${currentData.nombre.toUpperCase()} DICE:</div>
            <div style="margin: 2px 0;">
                ${getAnimatedSprite(db.stage, 'happy')}
            </div>
            <div style="font-size: 0.75rem; background: #111; color: #8b9d77; padding: 6px; border-radius: 4px; width: 95%; max-height: 65px; overflow-y: auto; margin: 0 auto; line-height: 1.2; text-align: left; box-shadow: inset 0 0 5px rgba(0,0,0,0.8);">
                "${db.lastAiResponse || '...'}"
            </div>
            <div style="font-size: 0.65rem; color: #333; margin-top: 4px;">[Pulsa PTT para salir]</div>
        `;
    }
    
    actualizarFilaIconos();
}

function actualizarFilaIconos() {
    // CORRECCIÓN: Ajustado al nuevo límite de 7 iconos
    for (let i = 0; i < 7; i++) {
        const icon = document.getElementById(`icon-${i}`);
        if (!icon) continue;
        if (db.phase === 'MAIN' && i === currentIconIndex) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    }
}

function comprobarDespertar() {
    if (db.phase === 'SLEEP') {
        db.phase = 'MAIN';
        guardarJuego();
        renderUI();
        return true; 
    }
    return false;
}

// --- 3. LÓGICA DE NAVEGACIÓN Y ACCIONES ---
window.moveNext = function() {
    if (comprobarDespertar()) return;
    if (db.phase === 'MAIN') currentIconIndex = (currentIconIndex + 1) % 7; // Modulo 7
    else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') subMenuIndex = (subMenuIndex + 1) % 3;
    else if (db.phase === 'COMBAT' && combatState.subPhase === 'SELECT') subMenuIndex = (subMenuIndex + 1) % 2; // Atacar o Esquivar
    renderUI();
};

window.movePrev = function() {
    if (comprobarDespertar()) return;
    if (db.phase === 'MAIN') currentIconIndex = (currentIconIndex - 1 + 7) % 7; // Modulo 7
    else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') subMenuIndex = (subMenuIndex - 1 + 3) % 3;
    else if (db.phase === 'COMBAT' && combatState.subPhase === 'SELECT') subMenuIndex = (subMenuIndex - 1 + 2) % 2;
    renderUI();
};

window.ejecutarAccionFisica = function() {
    if (comprobarDespertar()) return;

    // CORRECCIÓN: Permitir salir de pantallas de IA con el botón PTT
    if (db.phase === 'KEYBOARD' || db.phase === 'COMMS_RESPONSE' || db.phase === 'COMMS_THINKING') {
        db.phase = 'MAIN';
        db.lastStageCheck = '';
        renderUI();
        return;
    }

    if (db.phase === 'HATCHING') {
        eggTaps++;
        isEggWobbling = true;
        renderUI();

        setTimeout(() => {
            isEggWobbling = false;
            renderUI();
        }, 200);

        if (eggTaps >= 5) {
            eggTaps = 0;
            db.stage = 'yukimibotamon'; 
            db.phase = 'MAIN';
            db.hunger = 0; db.energy = 4; db.poop = 0; db.isSick = false;
            db.trainings = 0; db.careMistakes = 0;
            guardarJuego();
            renderUI();
        }
        return;
    }

    if (db.stage === 'muerto') {
        db.stage = 'yukimibotamon'; 
        db.phase = 'MAIN';
        db.hunger = 0; db.energy = 4; db.poop = 0; db.isSick = false;
        db.trainings = 0; db.careMistakes = 0;
        guardarJuego();
        renderUI();
        return;
    }

    if (db.phase === 'COMBAT') {
        if (combatState.subPhase === 'SELECT') {
            ejecutarTurnoCombate(subMenuIndex);
        } else if (combatState.subPhase === 'END') {
            db.phase = 'MAIN';
            db.lastStageCheck = '';
            guardarJuego();
            renderUI();
        }
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
            case 0: db.hunger = Math.max(0, db.hunger - 1); mostrarAccionBreve(); break; // 🍖
            case 1: db.phase = 'EXPEDITION'; subMenuIndex = 0; break;                    // ⚔️
            case 2: db.phase = 'SHOP'; subMenuIndex = 0; break;                          // 🛒
            case 3: db.phase = 'KEYBOARD'; break;                                        // 💬 (Chat IA)
            case 4: db.phase = 'SLEEP'; guardarJuego(); break;                           // 💤
            case 5: db.poop = 0; mostrarAccionBreve(); break;                            // 🧹
            case 6: db.isSick = false; mostrarAccionBreve(); break;                      // 💊
        }
        renderUI();
    }
};

function mostrarAccionBreve() {
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => { 
        db.phase = 'MAIN'; 
        db.lastStageCheck = '';
        guardarJuego(); 
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
        db.lastStageCheck = '';
        guardarJuego();
        renderUI();
    }, 1200);
}

function ejecutarCombate() {
    if (db.energy === 0) { db.phase = 'MAIN'; renderUI(); return; }
    
    // Gastar energía al iniciar y seleccionar enemigo aleatorio
    db.energy = Math.max(0, db.energy - 1);
    const enemigosDisponibles = Object.keys(ROSTER).filter(id => id !== 'yukimibotamon' && id !== 'nyaromon' && id !== 'muerto');
    const enemigoAleatorio = enemigosDisponibles[Math.floor(Math.random() * enemigosDisponibles.length)] || 'agumon';

    // Inicializar el estado de la batalla
    let maxHp = 10 + (db.level * 2);
    combatState = {
        enemyId: enemigoAleatorio,
        playerHp: maxHp,
        playerMaxHp: maxHp,
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
        subPhase: 'SELECT',
        message: '¡PULSA ACCIÓN PARA LUCHAR!',
        playerAction: 0
    };

    subMenuIndex = 0;
    db.phase = 'COMBAT';
    db.lastStageCheck = '';
    renderUI();
}

function ejecutarTurnoCombate(accionSeleccionada) {
    combatState.subPhase = 'ANIMATING';
    combatState.playerAction = accionSeleccionada;
    
    // 1. Turno del Jugador
    if (accionSeleccionada === 0) { // ATACAR
        let probAcierto = 0.7 + (db.level * 0.05);
        if (Math.random() < probAcierto) {
            let dano = Math.floor(Math.random() * 3) + 3; // 3 a 5 de daño
            combatState.enemyHp = Math.max(0, combatState.enemyHp - dano);
            combatState.message = `¡HIT! Haces ${dano} de daño.`;
        } else {
            combatState.message = `¡FALLASTE EL ATAQUE!`;
        }
    } else { // ESQUIVAR (Prepara postura defensiva)
        combatState.message = `¡ADOPTAS POSTURA DEFENSIVA!`;
    }
    
    db.lastStageCheck = '';
    renderUI();

    // Comprobar victoria antes del contraataque
    if (combatState.enemyHp <= 0) {
        setTimeout(() => {
            combatState.subPhase = 'END';
            combatState.message = `¡VICTORIA! +6C y +1 LVL [PTT: Salir]`;
            db.coins += 6;
            db.level++;
            db.lastStageCheck = '';
            renderUI();
        }, 1200);
        return;
    }

    // 2. Turno del Enemigo (Contraataque después de 1.5 segundos)
    setTimeout(() => {
        let probAciertoEnemigo = accionSeleccionada === 1 ? 0.2 : 0.6; // Esquivar reduce mucho su acierto
        
        if (Math.random() < probAciertoEnemigo) {
            let danoEnemigo = Math.floor(Math.random() * 3) + 2;
            combatState.playerHp = Math.max(0, combatState.playerHp - danoEnemigo);
            combatState.message = `¡RECIBES DAÑO! -${danoEnemigo} HP.`;
            combatState.playerAction = 1; // Hace que el sprite del enemigo muestre animación de ataque
        } else {
            combatState.message = accionSeleccionada === 1 ? `¡ESQUIVADA PERFECTA!` : `¡RIVAL FALLÓ!`;
            combatState.playerAction = 0;
        }

        // CORRECCIÓN CRÍTICA: Forzar renderizado para mostrar el contraataque y el daño en la barra LCD
        db.lastStageCheck = '';
        renderUI();

        // Comprobar derrota o volver a menú de selección
        setTimeout(() => {
            if (combatState.playerHp <= 0) {
                combatState.subPhase = 'END';
                combatState.message = `¡DERROTA! Pierdes energía [PTT: Salir]`;
                db.energy = Math.max(0, db.energy - 1);
                db.careMistakes++;
            } else {
                combatState.subPhase = 'SELECT';
                combatState.message = `¿QUÉ HARÁS AHORA?`;
            }
            db.lastStageCheck = '';
            renderUI();
        }, 1400);

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

// --- 4. INTEGRACIÓN CON IA (RABBIT R1 BRIDGE) ---
function llamarModeloRabbit(systemPrompt, mensajeUsuario) {
    return new Promise((resolve, reject) => {
        if (typeof PluginMessageHandler === 'undefined') {
            console.warn("PluginMessageHandler no detectado. Ejecutando en modo emulador PC.");
            setTimeout(() => resolve("¡Grr! (Modo PC: No estoy dentro del Rabbit R1)"), 1500);
            return;
        }

        const fullPrompt = `${systemPrompt}\n\nMENSAJE DEL JUGADOR: "${mensajeUsuario}"\n\nResponde ÚNICAMENTE con un JSON válido con esta estructura exacta: {"respuesta": "tu texto corto aquí"}`;

        const payload = {
            message: fullPrompt,
            useLLM: true,
            wantsR1Response: false 
        };

        const timeoutId = setTimeout(() => {
            reject("Timeout: El Digimundo no responde.");
        }, 15000);

        const originalHandler = window.onPluginMessage;
        window.onPluginMessage = function(data) {
            clearTimeout(timeoutId);
            if (originalHandler) window.onPluginMessage = originalHandler;

            try {
                let parsed = null;
                if (data.data) {
                    parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                } else if (data.message) {
                    parsed = JSON.parse(data.message);
                }

                if (parsed && parsed.respuesta) {
                    resolve(parsed.respuesta);
                } else {
                    resolve(data.message || data.data || "... [ruido estático] ...");
                }
            } catch (e) {
                resolve(data.message || data.data || "... [error de decodificación] ...");
            }
        };

        PluginMessageHandler.postMessage(JSON.stringify(payload));
    });
}

async function consultarDigimonAI(mensajeUsuario, idDigimon) {
    const digi = ROSTER[idDigimon] || ROSTER['yukimibotamon'];
    
    const systemPrompt = `
        Eres un Digimon llamado ${digi.nombre}. Estás dentro de un dispositivo Digivice.
        Tus estadísticas actuales en el juego son:
        - Nivel: ${db.level}
        - Hambre: ${db.hunger}/5
        - Suciedad en pantalla: ${db.poop} cacas
        - Estado de salud: ${db.isSick ? 'ENFERMO' : 'SANO'}
        
        INSTRUCCIONES DE COMPORTAMIENTO:
        1. Responde SIEMPRE en carácter, como si fueras este monstruo digital.
        2. Si tu "Hambre" es 0 o estás "ENFERMO", debes quejarte de tu mal estado en la respuesta, sin importar qué te pregunte el jugador.
        3. Tus respuestas deben ser breves (máximo 2 o 3 frases cortas) para que quepan en una pantalla retro de LCD.
        4. Puedes dar datos curiosos del Mundo Digital si el jugador te lo pide.
    `;

    try {
        let respuestaAI = await llamarModeloRabbit(systemPrompt, mensajeUsuario);
        db.phase = 'COMMS_RESPONSE';
        db.lastAiResponse = respuestaAI; 
        db.lastStageCheck = ''; // Fuerza repintado en la nueva pantalla
        renderUI();
        return respuestaAI;
    } catch (error) {
        console.error("Error en conexión AI:", error);
        db.phase = 'COMMS_RESPONSE';
        db.lastAiResponse = "... [ERROR DIGITAL: SEÑAL PERDIDA] ...";
        db.lastStageCheck = '';
        renderUI();
        return db.lastAiResponse;
    }
}

window.enviarMensajeAI = function(event) {
    event.preventDefault(); 
    const input = document.getElementById('ai-input');
    const mensaje = input ? input.value.trim() : "";
    
    if (mensaje.length > 0) {
        db.phase = 'COMMS_THINKING';
        db.lastStageCheck = ''; // Fuerza el renderizado de la pantalla de carga
        renderUI();
        consultarDigimonAI(mensaje, db.stage);
    }
};

// --- 5. BUCLES DE JUEGO E INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // --- BUCLE DE DEAMBULEO RETRO (Cada 600ms) ---
    setInterval(() => {
        if (db.phase !== 'MAIN' || db.isSick || db.hunger >= 3 || db.poop > 0 || db.stage === 'muerto') return;

        let rand = Math.random();
        if (rand < 0.2) {
            spriteDireccion *= -1; 
        } else if (rand > 0.3) {
            spritePosX += (spriteDireccion * 5);
            if (spritePosX < 15) {
                spritePosX = 15;
                spriteDireccion = 1; 
            } else if (spritePosX > 85) {
                spritePosX = 85;
                spriteDireccion = -1; 
            }
        }
        renderUI(); 
    }, 600);

    // --- BUCLE VITAL (Cada 2 minutos) ---
    setInterval(() => {
        if (db.phase === 'HATCHING' || db.stage === 'muerto') return;
        
        if (db.phase === 'SLEEP') {
            db.energy = Math.min(4, db.energy + 1); 
            db.hunger = Math.min(4, db.hunger + 1); 
            guardarJuego();
            renderUI();
            return; 
        }

        db.hunger = Math.min(4, db.hunger + 1);
        if (db.hunger === 4) db.careMistakes++;
        if (db.poop >= 3) db.isSick = true;
        comprobarEvolucion();
        guardarJuego();
        renderUI();
    }, 120000);

    renderUI();
});