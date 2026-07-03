// ============================================
// Klima Logik — Midea Klimaanlage Schlafzimmer
// Einschalten bei Raumtemp >= 25°C
// 2h Betrieb, 1h Pflichtpause
// Anti-Takt: Mindestlaufzeit + Energie-Sperre entprellt
// Robust gegen fehlendes/offline Midea-Gerät
// Stand: 03.07.2026
// ============================================

var MIDEA_ID         = '153931628437826';
var MIDEA_POWER      = 'midea.0.' + MIDEA_ID + '.powerState';
var MIDEA_MODE       = 'midea.0.' + MIDEA_ID + '.operationalMode';
var MIDEA_TEMP       = 'midea.0.' + MIDEA_ID + '.targetTemperature';
var ZIGBEE_SCHLAFEN  = 'zigbee.0.a4c1388f0b92eb71.temperature';

var CONFIG = {
    TEMP_EIN:           25,                    // Raumtemp zum Einschalten (°C)
    TEMP_AUS:           22,                    // Zieltemperatur / Ausschalten (°C)
    TEMP_SOLL:          22,                    // Klimaanlage Sollwert (°C)
    MIN_LAUFZEIT_MS:    20 * 60 * 1000,        // Mindestlaufzeit bevor Energie/WW-Sperre greift
    MAX_LAUFZEIT_MS:    2 * 60 * 60 * 1000,    // 2h maximale Laufzeit
    PAUSE_MS:           1 * 60 * 60 * 1000,    // 1h Pause danach
    MAX_BATTERIE_W:     2000,                  // Batterie darf bis -2000W liefern
    ENERGIE_SPERRE_ZYKLEN: 2,                  // Energie-Sperre erst nach 2 Zyklen (entprellt Lastspitzen)
    WW_TEMP_MIN:        50,                    // WW muss bis 14:00 Uhr >= 50°C sein
    WW_STUNDE:          14,                    // Uhrzeit für WW-Check
};

createState('klima.schlafzimmer.aktiv',       false, { name: 'Klima Schlafzimmer aktiv',        type: 'boolean', role: 'switch', read: true, write: true });
createState('klima.schlafzimmer.start_zeit',  0,     { name: 'Klima Schlafzimmer Startzeit ms', type: 'number',  role: 'value',  read: true, write: false });
createState('klima.schlafzimmer.pause_start', 0,     { name: 'Klima Schlafzimmer Pausestart ms',type: 'number',  role: 'value',  read: true, write: false });
createState('klima.schlafzimmer.grund',       '',    { name: 'Klima Schlafzimmer letzter Grund',type: 'string',  role: 'text',   read: true, write: false });

// Modul-Status (überlebt die 5-Min-Schedules, resettet nur bei Script-Neustart)
var energieSperreZaehler = 0;
var mideaOfflineGemeldet = false;

function safe(id, fallback) {
    try {
        var s = getState(id);
        if (s && s.val !== null && s.val !== undefined) return s.val;
    } catch(e) {}
    return fallback;
}

// Prüft ob das Midea-Gerät in ioBroker vorhanden ist (States existieren).
// existsState wirft keine Warnung wenn der State fehlt — im Gegensatz zu getState.
function mideaVerfuegbar() {
    try { return existsState(MIDEA_POWER); }
    catch(e) { return false; }
}

function klimaEin(raumTemp) {
    setState(MIDEA_MODE,  2);                  // Kühlen = 2
    setState(MIDEA_TEMP,  CONFIG.TEMP_SOLL);   // 22°C
    setState(MIDEA_POWER, true);               // Einschalten
    setState('javascript.0.klima.schlafzimmer.aktiv',       { val: true,       ack: true });
    setState('javascript.0.klima.schlafzimmer.start_zeit',  { val: Date.now(), ack: true });
    setState('javascript.0.klima.schlafzimmer.pause_start', { val: 0,          ack: true });
    setState('javascript.0.klima.schlafzimmer.grund',       { val: 'Eingeschaltet — ' + raumTemp + '°C', ack: true });
    sendTo('telegram.0', '❄️ Klimaanlage EIN\nSchlafzimmer: ' + raumTemp + '°C → Ziel: ' + CONFIG.TEMP_SOLL + '°C');
    log('Klima EIN — Schlafzimmer ' + raumTemp + '°C');
}

function klimaAus(grund, mitTelegram) {
    setState(MIDEA_POWER, false);
    setState('javascript.0.klima.schlafzimmer.aktiv', { val: false, ack: true });
    setState('javascript.0.klima.schlafzimmer.grund', { val: grund, ack: true });
    if (mitTelegram) sendTo('telegram.0', '❄️ Klimaanlage AUS\n' + grund);
    log('Klima AUS — ' + grund);

    // Verifikation: nach 2 Min prüfen ob Gerät wirklich aus ist
    setTimeout(function() {
        if (!mideaVerfuegbar()) return;
        var realState = getState(MIDEA_POWER);
        if (realState && realState.val === true) {
            log('Klima Verifikation: Abschaltbefehl nicht bestätigt — Retry', 'warn');
            setState(MIDEA_POWER, false);
            sendTo('telegram.0', '⚠️ Klimaanlage: Abschaltbefehl nicht bestätigt, erneuter Versuch...');
        }
    }, 2 * 60 * 1000);
}

function klimaLogik() {
    // Gerät nicht erreichbar → Automatik pausieren, einmalig melden (kein Log-Spam)
    if (!mideaVerfuegbar()) {
        if (!mideaOfflineGemeldet) {
            mideaOfflineGemeldet = true;
            sendTo('telegram.0', '⚠️ Klima Schlafzimmer: Midea-Gerät nicht erreichbar.\nAutomatik pausiert bis das Gerät wieder online ist.');
            log('Klima: Midea-States fehlen — Automatik pausiert bis Gerät wieder da', 'warn');
        }
        return;
    }
    if (mideaOfflineGemeldet) {
        mideaOfflineGemeldet = false;
        sendTo('telegram.0', '✅ Klima Schlafzimmer: Midea wieder erreichbar — Automatik aktiv.');
        log('Klima: Midea wieder erreichbar — Automatik aktiv');
    }

    var jetzt      = Date.now();
    var stunde     = new Date().getHours();

    var aktiv      = safe('javascript.0.klima.schlafzimmer.aktiv',       false);
    var startZeit  = safe('javascript.0.klima.schlafzimmer.start_zeit',  0);
    var pauseStart = safe('javascript.0.klima.schlafzimmer.pause_start', 0);

    var raumTemp   = safe(ZIGBEE_SCHLAFEN,                        0);
    var pvWatt     = safe('javascript.0.solar.pv.watt',           0);
    var verbWatt   = safe('javascript.0.solar.verbrauch.watt',    0);
    var wwTemp     = safe('javascript.0.eta.warmwasser.oben',     99);

    // Nettobilanz: negativ = Batterie/Netz liefert Energie
    var netto      = pvWatt - verbWatt;

    // Energie-Sperre entprellen: einzelne Lastspitzen (Backofen etc.) sollen nicht
    // sofort abschalten. Erst wenn N Zyklen in Folge unter der Schwelle liegen.
    if (netto < -CONFIG.MAX_BATTERIE_W) { energieSperreZaehler++; }
    else                                { energieSperreZaehler = 0; }
    var energieSperre = energieSperreZaehler >= CONFIG.ENERGIE_SPERRE_ZYKLEN;

    var wwSperre = stunde >= CONFIG.WW_STUNDE && wwTemp < CONFIG.WW_TEMP_MIN;

    // Pause-Status aktualisieren
    var inPause = false;
    if (pauseStart > 0) {
        if ((jetzt - pauseStart) < CONFIG.PAUSE_MS) {
            inPause = true;
        } else {
            setState('javascript.0.klima.schlafzimmer.pause_start', { val: 0, ack: true });
        }
    }

    if (aktiv) {
        var laufzeit    = jetzt - startZeit;
        var minErreicht = laufzeit >= CONFIG.MIN_LAUFZEIT_MS;

        // Zieltemperatur immer sofort (Komfort), Sperren erst nach Mindestlaufzeit (Anti-Takt)
        if (raumTemp > 0 && raumTemp <= CONFIG.TEMP_AUS) {
            klimaAus('Zieltemperatur ' + CONFIG.TEMP_AUS + '°C erreicht (' + raumTemp + '°C)', true);

        } else if (laufzeit >= CONFIG.MAX_LAUFZEIT_MS) {
            setState('javascript.0.klima.schlafzimmer.pause_start', { val: jetzt, ack: true });
            klimaAus('2h Laufzeit — 1h Pause', true);

        } else if (minErreicht && wwSperre) {
            setState('javascript.0.klima.schlafzimmer.pause_start', { val: jetzt, ack: true });
            klimaAus('WW-Vorrang: ' + wwTemp + '°C < ' + CONFIG.WW_TEMP_MIN + '°C nach 14:00', true);

        } else if (minErreicht && energieSperre) {
            setState('javascript.0.klima.schlafzimmer.pause_start', { val: jetzt, ack: true });
            klimaAus('Energie-Sperre: Netto ' + Math.round(netto) + 'W', false);
        }

    } else if (!inPause && !wwSperre && !energieSperre && raumTemp >= CONFIG.TEMP_EIN) {
        klimaEin(raumTemp);
    }

    log('Klima Logik: ' + raumTemp + '°C Raum | ' + Math.round(netto) + 'W Netto | aktiv=' + aktiv +
        ' | pause=' + inPause + (energieSperre ? ' | ENERGIE-SPERRE' : ''));
}

// Echten Gerätestatus überwachen (ack:true = vom Gerät bestätigt)
// Erkennt externes Schalten via NetHome App oder Fernbedienung
on({id: MIDEA_POWER, ack: true, change: 'any'}, function(obj) {
    var realOn    = obj.state.val;
    var shadowOn  = safe('javascript.0.klima.schlafzimmer.aktiv', false);

    if (realOn && !shadowOn) {
        // Extern eingeschaltet — Shadow State nachziehen
        setState('javascript.0.klima.schlafzimmer.aktiv',      { val: true,       ack: true });
        setState('javascript.0.klima.schlafzimmer.start_zeit', { val: Date.now(), ack: true });
        setState('javascript.0.klima.schlafzimmer.pause_start',{ val: 0,          ack: true });
        setState('javascript.0.klima.schlafzimmer.grund',      { val: 'Extern EIN (NetHome/FB)', ack: true });
        log('Klima: extern EIN erkannt — Shadow State korrigiert');
    } else if (!realOn && shadowOn) {
        // Extern ausgeschaltet — Shadow State nachziehen
        setState('javascript.0.klima.schlafzimmer.aktiv', { val: false, ack: true });
        setState('javascript.0.klima.schlafzimmer.grund', { val: 'Extern AUS (NetHome/FB)', ack: true });
        log('Klima: extern AUS erkannt — Shadow State korrigiert');
    }
});

klimaLogik();
schedule('*/5 * * * *', function() { klimaLogik(); });
log('Klima Logik gestartet — Schlafzimmer Midea ' + MIDEA_ID);
