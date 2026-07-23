// js/creature.js
// ==========================================
// NÚCLEO BIOLÓGICO Y DE DATOS DEL DIGIMON
// ==========================================

let ANIMATIONS = {};
let ROSTER = {};

class CreatureManager {
    constructor() {
        this.DEFAULT_DB = {
            fase: 'MAIN',
            estadoEvolutivo: 'yukimibotamon',
            emocionPrimera: 'chachi',
            emocionSegunda: '',
            cansancio: 0,
            hambre: 0,
            caca: 0,
            higiene: false,
            nivel: 1,
            entrenamiento: 0,
            errores: 0,
            tempCorporal: 5,
            suerte: 0,
            confianza: 0,
            regeneracion: 0,
            lastStateCheck: '',
            inventario: {
                carne: 3,
                carne_xl: 1,
                pienso: 2,
                medicina: 1
            }
        };
        this.db = null;
        this.lastVitalTime = 0;
    }

    init() {
        this.db = JSON.parse(localStorage.getItem('r1_digipet_save')) || { ...this.DEFAULT_DB };
        if (!this.db.inventario) this.db.inventario = { ...this.DEFAULT_DB.inventario };
        this.db.lastStateCheck = '';
        console.log("[CREATURE]: Biometría y base de datos cargadas con éxito.");
    }

    save() {
        localStorage.setItem('r1_digipet_save', JSON.stringify(this.db));
    }

    usarItem(itemKey, catalogo) {
        const item = catalogo[itemKey];
        if (!item || !this.db.inventario[itemKey] || this.db.inventario[itemKey] <= 0) return false;

        this.db.inventario[itemKey]--;
        
        if (item.hambre) {
            this.db.hambre = Math.max(0, this.db.hambre - item.hambre);
        }
        if (item.energia) {
            this.db.cansancio = Math.max(0, this.db.cansancio - item.energia);
        }
        if (item.tipo === 'cura' && this.db.higiene) {
            this.db.higiene = false;
        }
        
        this.save();
        return true;
    }

    updateVitalCycle(timestamp) {
        if (!this.lastVitalTime) this.lastVitalTime = timestamp;
        const vitalDelta = timestamp - this.lastVitalTime;

        // Ciclo vital biológico cada 2 minutos (120,000 ms)
        if (vitalDelta >= 120000) {
            this.lastVitalTime = timestamp - (vitalDelta % 120000);
            
            this.db.hambre = Math.min(5, this.db.hambre + 1);
            
            if (this.db.hambre >= 4) {
                this.db.errores++;
            }
            
            this.save();
            return true; // Retorna true si hubo un cambio biológico para refrescar la pantalla
        }
        return false;
    }
}

// Instancia global accesible desde app.js
const Creature = new CreatureManager();