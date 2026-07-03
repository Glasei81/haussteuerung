// ============================================
// Klima Logik — Tuya Klimaanlage Treppenhaus
// Einschalten bei Raumtemp >= 25°C
// 2h Betrieb, 1h Pflichtpause
// Steuerung: nur Power (DPS 1) — Modus/Temp vom Gerät gemerkt
// ============================================

var TUYA_POWER       = 'tuya.0.0.121075124022d88f2e59.1';
var ZIGBEE_TREPPE    = 'zigbee.0.a4c138d0a5ca4495.local_temperature';

var CONFIG = {
    TEMP_EIN:        25,                   // Raumtemp zum Einschalten (°C)
    TEMP_AUS:        22,                   // Zieltemperatur / Ausschalten (°C)
    MIN_LAUFZEIT_MS: 20 * 60 * 1000,      // Mindestlaufzeit bevor Energie/WW-Sperre greift
    MAX_LAUFZEIT_MS: 2 * 60 * 60 * 1000,  // 2h maximale Laufzeit
    PAUSE_MS:        1 * 60 * 60 * 1000,  // 1h Pause danach
    MAX_BATTERIE_W:  2000,                 // Batterie darf bis -2000W liefern
    ENERGIE_SPERRE_ZYKLEN: 2,              // Energie-Sperre erst nach 2 Zyklen (entprellt Lastspitzen)
    WW_TEMP_MIN:     50,                   // WW muss bis 14:00 Uhr >= 50°C sein
    WW_STUNDE:       14,
};

// Modul-Status (überlebt die 5-Min-Schedules, resettet nur bei Script-Neustart)
var energieSperreZaehler = 0;
var tuyaOfflineGemeldet  = false;

createState('klima.treppe.aktiv',       false, { name: 'Klima Treppenhaus aktiv',         type: 'boolean', role: 'switch', read: true, write: true });
createState('klima.treppe.start_zeit',  0,     { name: 'Klima Treppenhaus Startzeit ms',  type: 'number',  role: 'value',  read: true, write: false });
createState('klima.treppe.pause_start', 0,     { name: 'Klima Treppenhaus Pausestart ms', type: 'number',  role: 'value',  read: true, write: false });
createState('klima.treppe.grund',       '',    { name: 'Klima Treppenhaus letzter Grund', type: 'string',  role: 'text',   read: true, write: false });

function safe(id, fallback) {
    try {
        var s = getState(id);
        if (s && s.val !== null && s.val !== undefined) return s.val;
    } catch(e) {}
    return fallback;
}

// Prüft ob das Tuya-Gerät in ioBroker vorhanden ist (State existiert).
// existsState wirft keine Warnung wenn der State fehlt — anders als getState.
function tuyaVerfuegbar() {
    try { return existsState(TUYA_POWER); }
    catch(e) { return false; }
}

function klimaEin(raumTemp) {
    setState(TUYA_POWER, true);
    setState('javascript.0.klima.treppe.aktiv',       { val: true,       ack: true });
    setState('javascript.0.klima.treppe.start_zeit',  { val: Date.now(), ack: true });
    setState('javascript.0.klima.treppe.pause_start', { val: 0,          ack: true });
    setState('javascript.0.klima.treppe.grund',       { val: 'Eingeschaltet — ' + raumTemp + '°C', ack: true });
    sendTo('telegram.0', '❄️ Klimaanlage Treppenhaus EIN\n' + raumTemp + '°C → Ziel: ' + CONFIG.TEMP_AUS + '°C');
    log('Klima Treppe EIN — ' + raumTemp + '°C');
}

function klimaAus(grund, mitTelegram) {
    setState(TUYA_POWER, false);
    setState('javascript.0.klima.treppe.aktiv', { val: false, ack: true });
    setState('javascript.0.klima.treppe.grund', { val: grund, ack: true });
    if (mitTelegram) sendTo('telegram.0', '❄️ Klimaanlage Treppenhaus AUS\n' + grund);
    log('Klima Treppe AUS — ' + grund);

    // Verifikation nach 2 Min
    setTimeout(function() {
        if (!tuyaVerfuegbar()) return;
        var realState = getState(TUYA_POWER);
        if (realState && realState.val === true) {
            log('Klima Treppe: Abschaltbefehl nicht bestätigt — Retry', 'warn');
            setState(TUYA_POWER, false);
            sendTo('telegram.0', '⚠️ Klimaanlage Treppenhaus: Abschaltbefehl nicht bestätigt, erneuter Versuch...');
        }
    }, 2 * 60 * 1000);
}

function klimaLogik() {
    // Gerät nicht erreichbar → Automatik pausieren, einmalig melden (kein Log-Spam)
    if (!tuyaVerfuegbar()) {
        if (!tuyaOfflineGemeldet) {
            tuyaOfflineGemeldet = true;
            sendTo('telegram.0', '⚠️ Klima Treppenhaus: Tuya-Gerät nicht erreichbar.\nAutomatik pausiert bis das Gerät wieder online ist.');
            log('Klima Treppe: Tuya-State fehlt — Automatik pausiert bis Gerät wieder da', 'warn');
        }
        return;
    }
    if (tuyaOfflineGemeldet) {
        tuyaOfflineGemeldet = false;
        sendTo('telegram.0', '✅ Klima Treppenhaus: Tuya wieder erreichbar — Automatik aktiv.');
        log('Klima Treppe: Tuya wieder erreichbar — Automatik aktiv');
    }

    var jetzt      = Date.now();
    var stunde     = new Date().getHours();

    var aktiv      = safe('javascript.0.klima.treppe.aktiv',       false);
    var startZeit  = safe('javascript.0.klima.treppe.start_zeit',  0);
    var pauseStart = safe('javascript.0.klima.treppe.pause_start', 0);

    var raumTemp   = safe(ZIGBEE_TREPPE,                          0);
    var pvWatt     = safe('javascript.0.solar.pv.watt',           0);
    var verbWatt   = safe('javascript.0.solar.verbrauch.watt',    0);
    var wwTemp     = safe('javascript.0.eta.warmwasser.oben',     99);

    var netto = pvWatt - verbWatt;

    // Energie-Sperre entprellen: einzelne Lastspitzen sollen nicht sofort abschalten
    if (netto < -CONFIG.MAX_BATTERIE_W) { energieSperreZaehler++; }
    else                                { energieSperreZaehler = 0; }
    var energieSperre = energieSperreZaehler >= CONFIG.ENERGIE_SPERRE_ZYKLEN;

    var wwSperre = stunde >= CONFIG.WW_STUNDE && wwTemp < CONFIG.WW_TEMP_MIN;

    var inPause = false;
    if (pauseStart > 0) {
        if ((jetzt - pauseStart) < CONFIG.PAUSE_MS) {
            inPause = true;
        } else {
            setState('javascript.0.klima.treppe.pause_start', { val: 0, ack: true });
        }
    }

    if (aktiv) {
        var laufzeit    = jetzt - startZeit;
        var minErreicht = laufzeit >= CONFIG.MIN_LAUFZEIT_MS;

        // Zieltemperatur immer sofort (Komfort), Sperren erst nach Mindestlaufzeit (Anti-Takt)
        if (raumTemp > 0 && raumTemp <= CONFIG.TEMP_AUS) {
            klimaAus('Zieltemperatur ' + CONFIG.TEMP_AUS + '°C erreicht (' + raumTemp + '°C)', true);
        } else if (laufzeit >= CONFIG.MAX_LAUFZEIT_MS) {
            setState('javascript.0.klima.treppe.pause_start', { val: jetzt, ack: true });
            klimaAus('2h Laufzeit — 1h Pause', true);
        } else if (minErreicht && wwSperre) {
            setState('javascript.0.klima.treppe.pause_start', { val: jetzt, ack: true });
            klimaAus('WW-Vorrang: ' + wwTemp + '°C < ' + CONFIG.WW_TEMP_MIN + '°C nach 14:00', true);
        } else if (minErreicht && energieSperre) {
            setState('javascript.0.klima.treppe.pause_start', { val: jetzt, ack: true });
            klimaAus('Energie-Sperre: Netto ' + Math.round(netto) + 'W', false);
        }

    } else if (!inPause && !wwSperre && !energieSperre && raumTemp >= CONFIG.TEMP_EIN) {
        klimaEin(raumTemp);
    }

    log('Klima Treppe: ' + raumTemp + '°C | ' + Math.round(netto) + 'W Netto | aktiv=' + aktiv +
        ' | pause=' + inPause + (energieSperre ? ' | ENERGIE-SPERRE' : ''));
}

// Externes Schalten erkennen (Tuya App / Fernbedienung)
on({id: TUYA_POWER, ack: true, change: 'any'}, function(obj) {
    var realOn   = obj.state.val;
    var shadowOn = safe('javascript.0.klima.treppe.aktiv', false);

    if (realOn && !shadowOn) {
        setState('javascript.0.klima.treppe.aktiv',      { val: true,       ack: true });
        setState('javascript.0.klima.treppe.start_zeit', { val: Date.now(), ack: true });
        setState('javascript.0.klima.treppe.pause_start',{ val: 0,          ack: true });
        setState('javascript.0.klima.treppe.grund',      { val: 'Extern EIN (App/FB)', ack: true });
        log('Klima Treppe: extern EIN erkannt');
    } else if (!realOn && shadowOn) {
        setState('javascript.0.klima.treppe.aktiv', { val: false, ack: true });
        setState('javascript.0.klima.treppe.grund', { val: 'Extern AUS (App/FB)', ack: true });
        log('Klima Treppe: extern AUS erkannt');
    }
});

klimaLogik();
schedule('*/5 * * * *', function() { klimaLogik(); });
log('Klima Treppe gestartet — Tuya ' + TUYA_POWER);
