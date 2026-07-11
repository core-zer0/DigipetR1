// js/app.js

// --- 1. ESTADO DEL JUEGO ---
let db = JSON.parse(localStorage.getItem('r1_digipet_save')) || {
    phase: 'HATCHING', stage: 'yukimibotamon', hunger: 0, energy: 4, poop: 0,
    isSick: false, coins: 10, level: 1, careMistakes: 0, trainings: 0, lastStageCheck: ''
};

// ¡PARCHE DE INICIO!: Forzamos el vaciado del tracker de UI en cada inicio 
// para obligar al DOM a dibujar la pantalla la primera vez que carga.
db.lastStageCheck = '';

// SOLUCIÓN AL BUG F5: Si la partida se guardó por accidente en fase de procesamiento, 
// lo recuperamos forzándolo a volver al menú principal para que no se quede congelado.
if (db.phase === 'MENU_EXEC') {
    db.phase = 'MAIN';
}

// Variables volátiles para la Mecánica de Eclosión (Opción A)
let eggTaps = 0;
let isEggWobbling = false;

// Salvavidas: Si vienes de una partida vieja y el Digimon ya no existe en el roster actual, resetea.
if (typeof ROSTER !== 'undefined' && !ROSTER[db.stage]) {
    db.stage = 'yukimibotamon';
    db.phase = 'HATCHING';
}
// Variables globales
let currentIconIndex = 0; 
let subMenuIndex = 0;
let spritePosX = 50;
let spriteDireccion = -1;

function guardarJuego() {
    localStorage.setItem('r1_digipet_save', JSON.stringify(db));
}

// --- 2. FUNCIONES DE RENDERIZADO VISUAL ---
function getAnimatedSprite(id, state = 'idle') {
    let digi = ROSTER[id] || ROSTER['yukimibotamon'];
    let animConfig = ANIMATIONS[state] || ANIMATIONS['idle'];
    
    let inlineStyle = animConfig.frames > 1 
        ? `animation: play-anim 0.8s steps(${animConfig.frames}) infinite;`
        : ``;

    let flipX = spriteDireccion === 1 ? -1 : 1;
    
    // CORRECCIÓN: Definimos el factor de escala aquí para no perderlo
    let scaleFactor = 5;
    let transformValue = `scale(${scaleFactor}) scaleX(${flipX})`;

    // Solo aplicamos el movimiento de coordenadas si estamos deambulando en la pantalla MAIN
    // Nota: Agregamos el transformValue aquí también para mantener el tamaño
    let posicionEstilo = (db.phase === 'MAIN' && state === 'idle')
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
    
    // Control visual del Modo Sueño (Opción C): Filtro de oscurecimiento del LCD por CSS
    if (db.phase === 'SLEEP') {
        view.style.filter = 'brightness(0.35) contrast(1.2)';
    } else {
        view.style.filter = 'none';
    }

    let uiCheckKey = `${db.phase}_${db.stage}_${subMenuIndex}_${db.poop}_${db.hunger}_${db.isSick}_${eggTaps}_${isEggWobbling}`;
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
        // Opción A: Añadimos dinámicamente los keyframes de vibración y mostramos el contador de grietas
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
        // Opción C: Renderizado único para cuando el Digimon duerme permanentemente
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
    else if (db.phase === 'MENU_EXEC') {
        view.innerHTML = `
            <div class="menu-title">PROCESANDO...</div>
            <div style="font-size:2.5rem; margin: 15px 0; animation: spin 1.5s infinite linear;">⚙️</div>
        `;
    }
    else if (db.phase === 'KEYBOARD') {
        view.innerHTML = `
            <div class="menu-title">TERMINAL DIGITAL</div>
            
            <!-- Mostramos un pequeño sprite para saber con quién hablamos -->
            <div style="margin: 6px 0;">
                ${getAnimatedSprite(db.stage, 'idle')}
            </div>

            <!-- Formulario nativo para invocar el teclado táctil -->
            <form id="ai-form" style="width: 95%; display: flex; gap: 4px; margin: 0 auto;" onsubmit="enviarMensajeAI(event)">
                <input 
                    type="text" 
                    id="ai-input" 
                    placeholder="Toca para escribir..." 
                    autocomplete="off"
                    maxlength="50"
                    style="
                        flex: 1; 
                        background: #111; 
                        color: #8b9d77; 
                        border: 2px solid #222; 
                        padding: 6px 8px; 
                        font-family: 'Courier New', monospace; 
                        font-size: 0.8rem;
                        border-radius: 4px;
                        outline: none;
                        box-shadow: inset 0 0 5px rgba(0,0,0,0.8);
                    "
                >
                <button 
                    type="submit" 
                    style="
                        background: #222; 
                        color: #8b9d77; 
                        border: 1px solid #444; 
                        padding: 0 10px; 
                        font-weight: bold; 
                        border-radius: 4px;
                        cursor: pointer;
                    "
                >✔</button>
            </form>
            
            <div style="font-size: 0.65rem; color: #333; margin-top: 8px;">
                [Pantalla táctil habilitada para teclado]
            </div>
        `;
        
        // Opcional: Foco automático para que el Rabbit intente abrir el teclado
        // en cuanto entres a la pantalla (dependerá de los permisos del navegador en el R1)
        setTimeout(() => {
            const input = document.getElementById('ai-input');
            if (input) input.focus();
        }, 150);
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

// Interrupción de Sueño: Si interactúa con los controles físicos, se despierta automáticamente
function comprobarDespertar() {
    if (db.phase === 'SLEEP') {
        db.phase = 'MAIN';
        guardarJuego();
        renderUI();
        return true; // Interrumpió la acción
    }
    return false;
}

// --- 3. LÓGICA DE NAVEGACIÓN Y ACCIONES ---
function moveNext() {
    if (comprobarDespertar()) return;
    if (db.phase === 'MAIN') currentIconIndex = (currentIconIndex + 1) % 6;
    else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') subMenuIndex = (subMenuIndex + 1) % 3;
    renderUI();
}

function movePrev() {
    if (comprobarDespertar()) return;
    if (db.phase === 'MAIN') currentIconIndex = (currentIconIndex - 1 + 6) % 6;
    else if (db.phase === 'EXPEDITION' || db.phase === 'SHOP') subMenuIndex = (subMenuIndex - 1 + 3) % 3;
    renderUI();
}

window.ejecutarAccionFisica = function() {
    if (comprobarDespertar()) return;

    // Opción A: Lógica de eclosión rítmica interactiva
    if (db.phase === 'HATCHING') {
        eggTaps++;
        isEggWobbling = true;
        renderUI();

        // Apaga el efecto de bamboleo poco después del click
        setTimeout(() => {
            isEggWobbling = false;
            renderUI();
        }, 200);

        if (eggTaps >= 5) {
            eggTaps = 0;
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
            
            // Opción C: Activar el Modo Sueño Real en lugar de curar energía al instante
            case 3: 
                db.phase = 'SLEEP'; 
                guardarJuego();
                break;
                
            case 4: db.poop = 0; mostrarAccionBreve(); break;
            case 5: db.isSick = false; mostrarAccionBreve(); break;
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
        guardarJuego(); // Guardamos una vez ha regresado de forma segura a MAIN
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
    db.phase = 'MENU_EXEC';
    renderUI();
    setTimeout(() => {
        if (Math.random() > 0.4) { db.coins += 6; db.level++; } 
        else { db.energy = Math.max(0, db.energy - 2); db.careMistakes++; }
        db.phase = 'MAIN';
        db.lastStageCheck = '';
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
function llamarModeloRabbit(systemPrompt, mensajeUsuario) {
    return new Promise((resolve, reject) => {
        // 1. Fallback por si estás probando en el PC de casa y no en el hardware del R1
        if (typeof PluginMessageHandler === 'undefined') {[cite: 3, 5]
            console.warn("PluginMessageHandler no detectado. Ejecutando en modo emulador PC.");[cite: 3, 5]
            setTimeout(() => resolve("¡Grr! (Modo PC: No estoy dentro del Rabbit R1)"), 1500);
            return;
        }

        // 2. Unificamos prompts y exigimos formato JSON (siguiendo el patrón oficial del SDK)[cite: 3]
        const fullPrompt = `${systemPrompt}\n\nMENSAJE DEL JUGADOR: "${mensajeUsuario}"\n\nResponde ÚNICAMENTE con un JSON válido con esta estructura exacta: {"respuesta": "tu texto corto aquí"}`;[cite: 3]

        const payload = {
            message: fullPrompt,[cite: 3, 5]
            useLLM: true,[cite: 3, 5]
            wantsR1Response: false // Si lo pones en 'true', ¡el altavoz del Rabbit leerá el mensaje con síntesis de voz!
        };

        // 3. Temporizador de seguridad (15s) por si el bosque digital está caído
        const timeoutId = setTimeout(() => {
            reject("Timeout: El Digimundo no responde.");
        }, 15000);

        // 4. Interceptamos la respuesta global del sistema operativo[cite: 6]
        const originalHandler = window.onPluginMessage;[cite: 6]
        window.onPluginMessage = function(data) {[cite: 6]
            clearTimeout(timeoutId);
            
            // Restauramos el handler anterior para no romper otras funciones del OS
            if (originalHandler) window.onPluginMessage = originalHandler;[cite: 6]

            try {
                let parsed = null;
                // El SDK puede devolver la respuesta en data.data o en data.message[cite: 3, 5]
                if (data.data) {[cite: 3, 5]
                    parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;[cite: 3]
                } else if (data.message) {[cite: 3, 5]
                    parsed = JSON.parse(data.message);[cite: 3]
                }

                // Si logramos extraer el JSON limpio, devolvemos solo el texto del Digimon[cite: 3]
                if (parsed && parsed.respuesta) {
                    resolve(parsed.respuesta);
                } else {
                    // Fallback si la IA no obedeció el formato JSON
                    resolve(data.message || data.data || "... [ruido estático] ...");[cite: 3, 5]
                }
            } catch (e) {[cite: 3]
                // Si falla el parseo, devolvemos el texto crudo tal cual[cite: 3]
                resolve(data.message || data.data || "... [error de decodificación] ...");[cite: 3, 5]
            }
        };

        // 5. Enviamos la petición al hardware nativo[cite: 3, 5]
        PluginMessageHandler.postMessage(JSON.stringify(payload));[cite: 3, 5]
    });
}

async function consultarDigimonAI(mensajeUsuario, idDigimon) {
    // 1. Capturamos el estado real del juego
    const digi = ROSTER[idDigimon] || ROSTER['yukimibotamon'];
    
    // 2. Construimos el System Prompt con las estadísticas de tu V-Pet
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

    // 3. Llamada al puente asíncrono del Rabbit R1
    try {
        let respuestaAI = await llamarModeloRabbit(systemPrompt, mensajeUsuario);
        
        // Cuando llegue la respuesta, cambiamos la fase y actualizamos la interfaz
        db.phase = 'COMMS_RESPONSE';
        db.lastAiResponse = respuestaAI; // Guarda la respuesta para mostrarla en el LCD
        renderUI();
        
        return respuestaAI;
    } catch (error) {
        console.error("Error en conexión AI:", error);
        db.phase = 'COMMS_RESPONSE';
        db.lastAiResponse = "... [ERROR DIGITAL: SEÑAL PERDIDA] ...";
        renderUI();
        return db.lastAiResponse;
    }
}

function enviarMensajeAI(event) {
    // Evitamos que la web se recargue por el comportamiento por defecto de los formularios
    event.preventDefault(); 
    
    const input = document.getElementById('ai-input');
    const mensaje = input ? input.value.trim() : "";
    
    if (mensaje.length > 0) {
        // Cambiamos a la pantalla de "Procesando respuesta..."
        db.phase = 'COMMS_THINKING';
        renderUI();
        
        // Ejecutamos la consulta asíncrona al modelo del Rabbit
        consultarDigimonAI(mensaje, db.stage);
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

    // --- BUCLE DE DEAMBULEO RETRO (Cada 2.5 segundos da un saltito) ---
    setInterval(() => {
        // Solo deambula si está en la pantalla principal y no está enfermo, triste o reteniendo cacas
        if (db.phase !== 'MAIN' || db.isSick || db.hunger >= 3 || db.poop > 0 || db.stage === 'muerto') return;

        // Decisión aleatoria: 70% de probabilidad de moverse, 30% de quedarse quieto o cambiar de dirección
        let rand = Math.random();
        if (rand < 0.2) {
            spriteDireccion *= -1; // Da la vuelta en estático
        } else if (rand > 0.3) {
            // Da un "salto" retro de 12% del tamaño de la pantalla en su dirección actual
            spritePosX += (spriteDireccion * 5);
            
            // Límites de la pantalla LCD (un colchón entre 15% y 85% para que no se salga de los bordes)
            if (spritePosX < 15) {
                spritePosX = 15;
                spriteDireccion = 1; // Rebota a la derecha
            } else if (spritePosX > 85) {
                spritePosX = 85;
                spriteDireccion = -1; // Rebota a la izquierda
            }
        }
        
        renderUI(); // Forzamos actualización visual del deambuleo
    }, 600);

    // Bucle vital (Cada 2 minutos)
    setInterval(() => {
        if (db.phase === 'HATCHING' || db.stage === 'muerto') return;
        
        // Opción C: Modificación del Bucle Vital para el estado SLEEP
        if (db.phase === 'SLEEP') {
            db.energy = Math.min(4, db.energy + 1); // Recuperación pasiva de energía
            db.hunger = Math.min(4, db.hunger + 1); // Sigue consumiendo hambre lentamente pero no genera cacas
            guardarJuego();
            renderUI();
            return; // Saltamos comprobación de evolución e infección médica mientras duerme
        }

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