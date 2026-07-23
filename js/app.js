// js/app.js
// ==========================================
// 1. ARQUITECTURA: EVENT BUS & FSM ENGINE
// ==========================================

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
        if (typeof Creature !== 'undefined' && Creature.db) Creature.db.fase = newState;
        if (this.states[this.state] && this.states[this.state].onEnter) {
            this.states[this.state].onEnter(payload);
        }
        events.emit('STATE_CHANGE', newState);
    }
    onInput(action) {
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

// ==========================================
// 2. CONFIGURACIÓN DEL REEL (CARRUSEL)
// ==========================================

// Tira horizontal fija: Posiciones 0 a 6
const SCREENS = ['AVENTURA', 'TIENDA', 'INVENTARIO', 'MAIN', 'ENTRENAMIENTO', 'CASA', 'JARDIN'];

const SCREEN_COLORS = {
    'AVENTURA': '#8B4513',      // 0: Marrón
    'TIENDA': '#DAA520',        // 1: Dorado
    'INVENTARIO': '#4682B4',    // 2: Azul
    'MAIN': '#8b9d77',          // 3: Verde LCD
    'ENTRENAMIENTO': '#B22222', // 4: Rojo
    'CASA': '#DEB887',          // 5: Arena
    'JARDIN': '#228B22'         // 6: Verde bosque
};

// Devuelve la posición numérica del estado activo
function getScreenIndex() {
    const index = SCREENS.indexOf(fsm.state);
    return index !== -1 ? index : 3;
}

// ==========================================
// 3. RENDERIZADO Y DESPLAZAMIENTO PARALLAX
// ==========================================

function renderUI() {
    const view = document.getElementById('view-port');
    if (!view) return;

    let carousel = document.getElementById('carousel');
    
    // Construcción inicial del contenedor del carrusel y sus 7 pantallas
    if (!carousel) {
        view.innerHTML = `<div id="carousel" style="display: flex; height: 100%; width: ${SCREENS.length * 100}%; transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);"></div>`;
        carousel = document.getElementById('carousel');

        SCREENS.forEach(screenName => {
            const screenDiv = document.createElement('div');
            screenDiv.style.width = `${100 / SCREENS.length}%`;
            screenDiv.style.height = '100%';
            screenDiv.style.display = 'flex';
            screenDiv.style.flexDirection = 'column';
            screenDiv.style.justifyContent = 'center';
            screenDiv.style.alignItems = 'center';
            screenDiv.style.backgroundColor = SCREEN_COLORS[screenName] || '#333';
            screenDiv.id = `screen-${screenName}`;

            carousel.appendChild(screenDiv);
        });
    }

    // Calculamos desplazamiento de la tira horizontal
    const currentIndex = getScreenIndex();
    const translateX = -(currentIndex * (100 / SCREENS.length));
    carousel.style.transform = `translateX(${translateX}%)`;

    // Renderizamos los contenidos de las pantallas
    actualizarTodasLasPantallas();
}

function actualizarTodasLasPantallas() {
    SCREENS.forEach(state => {
        const screenDiv = document.getElementById(`screen-${state}`);
        if (!screenDiv) return;

        if (state === 'MAIN' && typeof Creature !== 'undefined' && Creature.db) {
            const db = Creature.db;
            const nombreDigimon = db.estadoEvolutivo ? db.estadoEvolutivo.toUpperCase() : 'DIGIMON';
            
            screenDiv.innerHTML = `
                <div style="background: rgba(0,0,0,0.6); color: white; padding: 10px 20px; border-radius: 8px; font-size: 1.2rem; margin-bottom: 20px;">
                    LV.${db.nivel || 1} ${nombreDigimon}
                </div>
                <div style="font-size: 0.9rem; background: rgba(255,255,255,0.85); color: #000; border: 3px dashed #333; padding: 20px; border-radius: 12px; text-align: center;">
                    <strong>[ SPRITE: ${db.estadoEvolutivo.toUpperCase()} ]</strong><br><br>
                    <span style="font-size: 0.8rem;">Emociones: ${db.emocionPrimera} ${db.emocionSegunda}</span>
                </div>
                <div style="font-size: 1.5rem; margin-top: 15px; height: 30px;">${'💩'.repeat(db.caca || 0)}</div>
            `;
        } else {
            screenDiv.innerHTML = `
                <div style="background: rgba(0,0,0,0.6); color: white; padding: 15px 30px; border-radius: 8px; font-size: 1.5rem; font-weight: bold; letter-spacing: 2px;">
                    ${state}
                </div>
            `;
        }
    });
}

function gameLoop(timestamp) {
    if (typeof Creature !== 'undefined' && Creature.updateVitalCycle(timestamp)) {
        renderUI();
    }
    fsm.update(timestamp);
    requestAnimationFrame(gameLoop);
}

// ==========================================
// 4. REGISTRO DE ESTADOS Y FILTRO DE EVENTOS
// ==========================================

let lastNavTime = 0;
const NAV_COOLDOWN_MS = 180; // Tiempo mínimo de espera entre muescas de la rueda (Anti-rebote)

SCREENS.forEach((screen) => {
    fsm.register(screen, {
        onEnter: () => {
            renderUI();
        },
        onInput: (action) => {
            const now = Date.now();

            // Bloqueo de ráfaga para NEXT y PREV
            if (action === 'NEXT' || action === 'PREV') {
                if (now - lastNavTime < NAV_COOLDOWN_MS) {
                    return; // Ignora los pulsos excesivos del scroll
                }
                lastNavTime = now;
            }

            const currentIdx = getScreenIndex();

        if (action === 'NEXT') {
            // Solo transiciona si NO estamos en la última pantalla (JARDIN)
            if (currentIdx < SCREENS.length - 1) {
                fsm.transition(SCREENS[currentIdx + 1]);
            }
        } else if (action === 'PREV') {
            // Solo transiciona si NO estamos en la primera pantalla (AVENTURA)
            if (currentIdx > 0) {
                fsm.transition(SCREENS[currentIdx - 1]);
            }
        } else if (action === 'EXEC') {
            console.log(`[HARDWARE]: Ejecutar en ${screen}`);
        } else if (action === 'BACK') {
            console.log(`[HARDWARE]: Volver a MAIN desde ${screen}`);
            if (screen !== 'MAIN') fsm.transition('MAIN');
        }

        }
    });
});

// ==========================================
// 5. INICIALIZACIÓN
// ==========================================

async function bootGame() {
    try {
        console.log("[BOOT]: Arrancando motor Parallax con Filtro Anti-Rebote...");
        if (typeof Creature !== 'undefined') Creature.init();

        fsm.transition('MAIN');
        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("[BOOT ERROR]:", e);
    }
}

// ==========================================
// 6. ENTRADAS DE HARDWARE
// ==========================================

window.moveNext = () => fsm.onInput('NEXT');
window.movePrev = () => fsm.onInput('PREV');

let temporizadorClic = null;
window.ejecutarAccionFisica = () => {
    if (temporizadorClic) {
        clearTimeout(temporizadorClic);
        temporizadorClic = null;
        fsm.onInput('BACK');
    } else {
        temporizadorClic = setTimeout(() => {
            temporizadorClic = null;
            fsm.onInput('EXEC');
        }, 250);
    }
};

document.addEventListener('DOMContentLoaded', bootGame);