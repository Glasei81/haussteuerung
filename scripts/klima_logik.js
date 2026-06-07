// ============================================
// Klima Logik — Tuya Klimaanlage Schlafzimmer
// Einschalten bei Raumtemp >= 25°C
// 2h Betrieb, 1h Pflichtpause
// Stand: 07.06.2026
// ============================================

var TUYA_ID          = '121075124022d88f2e59';
var ZIGBEE_SCHLAFEN  = 'zigbee.0.a4c1388f0b92eb71.temperature';

var CONFIG = {
    TEMP_EIN:         25,                    // Raumtemp zum Einschalten (°C)
    TEMP_AUS:         22,                    // Zieltemperatur / Ausschalten (°C)
    TEMP_SOLL:        22,                    // Klimaanlage Sollwert (°C)
    MAX_LAUFZEIT_MS:  2 * 60 * 60 * 1000,   // 2h maximale Laufzeit
    PAUSE_MS:         1 * 60 * 60 * 1000,   // 1h Pause danach
    MAX_BATTERIE_W:   2000,                  // Batterie darf bis -2000W liefern
    WW_TEMP_MIN:      50,                    // WW muss bis 14:00 Uhr >= 50°C sein
    WW_STUNDE:        14,                    // Uhrzeit für WW-Check
};

createState('klima.tuya.aktiv',       false, { name: 'Klima Tuya aktiv',        type: 'boolean', role: 'switch', read: true, write: true });
createState('klima.tuya.start_zeit',  0,     { name: 'Klima Tuya Startzeit ms', type: 'number',  role: 'value',  read: true, write: false });
createState('klima.tuya.pause_start', 0,     { name: 'Klima Tuya Pausestart ms',type: 'number',  role: 'value',  read: true, write: false });
createState('klima.tuya.grund',       '',    { name: 'Klima Tuya letzter Grund',type: 'string',  role: 'text',   read: true, write: false });

function safe(id, fallback) {
    try {
        var s = getState(id);
        if (s && s.val !== null && s.val !== undefined) return s.val;
    } catch(e) {}
    return fallback;
}

function klimaEin(raumTemp) {
    setState('tuya.0.' + TUYA_ID + '.4', 0);               // Modus: Kühlen (cold=0)
    setState('tuya.0.' + TUYA_ID + '.2', CONFIG.TEMP_SOLL); // Solltemperatur 22°C
    setState('tuya.0.' + TUYA_ID + '.1', true);             // Einschalten
    setState('javascript.0.klima.tuya.aktiv',       { val: true,       ack: true });
    setState('javascript.0.klima.tuya.start_zeit',  { val: Date.now(), ack: true });
    setState('javascript.0.klima.tuya.pause_start', { val: 0,          ack: true });
    setState('javascript.0.klima.tuya.grund',       { val: 'Eingeschaltet — ' + raumTemp + '°C', ack: true });
    sendTo('telegram.0', '❄️ Klimaanlage EIN\nSchlafzimmer: ' + raumTemp + '°C → Ziel: ' + CONFIG.TEMP_SOLL + '°C');
    log('Klima EIN — Schlafzimmer ' + raumTemp + '°C');
}

function klimaAus(grund, mitTelegram) {
    setState('tuya.0.' + TUYA_ID + '.1', false);
    setState('javascript.0.klima.tuya.aktiv', { val: false, ack: true });
    setState('javascript.0.klima.tuya.grund', { val: grund, ack: true });
    if (mitTelegram) sendTo('telegram.0', '❄️ Klimaanlage AUS\n' + grund);
    log('Klima AUS — ' + grund);
}

function klimaLogik() {
    var jetzt      = Date.now();
    var stunde     = new Date().getHours();

    var aktiv      = safe('javascript.0.klima.tuya.aktiv',       false);
    var startZeit  = safe('javascript.0.klima.tuya.start_zeit',  0);
    var pauseStart = safe('javascript.0.klima.tuya.pause_start', 0);

    var raumTemp   = safe(ZIGBEE_SCHLAFEN,                            0);
    var pvWatt     = safe('javascript.0.solar.pv.watt',               0);
    var verbWatt   = safe('javascript.0.solar.verbrauch.watt',        0);
    var wwTemp     = safe('javascript.0.eta.warmwasser.oben',         99);

    // Nettobilanz: negativ = Batterie/Netz liefert Energie
    var netto      = pvWatt - verbWatt;

    // Sperren
    var energieSperre = netto < -CONFIG.MAX_BATTERIE_W;
    var wwSperre      = stunde >= CONFIG.WW_STUNDE && wwTemp < CONFIG.WW_TEMP_MIN;

    // Pause-Status aktualisieren
    var inPause = false;
    if (pauseStart > 0) {
        if ((jetzt - pauseStart) < CONFIG.PAUSE_MS) {
            inPause = true;
        } else {
            setState('javascript.0.klima.tuya.pause_start', { val: 0, ack: true });
        }
    }

    if (aktiv) {
        var laufzeit = jetzt - startZeit;

        if (raumTemp > 0 && raumTemp <= CONFIG.TEMP_AUS) {
            klimaAus('Zieltemperatur ' + CONFIG.TEMP_AUS + '°C erreicht (' + raumTemp + '°C)', true);

        } else if (laufzeit >= CONFIG.MAX_LAUFZEIT_MS) {
            setState('javascript.0.klima.tuya.pause_start', { val: jetzt, ack: true });
            klimaAus('2h Laufzeit — 1h Pause', true);

        } else if (wwSperre) {
            klimaAus('WW-Vorrang: ' + wwTemp + '°C < ' + CONFIG.WW_TEMP_MIN + '°C nach 14:00', true);

        } else if (energieSperre) {
            klimaAus('Energie-Sperre: Netto ' + Math.round(netto) + 'W', false);
        }

    } else if (!inPause && !wwSperre && !energieSperre && raumTemp >= CONFIG.TEMP_EIN) {
        klimaEin(raumTemp);
    }

    log('Klima Logik: ' + raumTemp + '°C Raum | ' + Math.round(netto) + 'W Netto | aktiv=' + aktiv + ' | pause=' + inPause);
}

klimaLogik();
schedule('*/5 * * * *', function() { klimaLogik(); });
log('Klima Logik gestartet — Schlafzimmer Tuya ' + TUYA_ID);
