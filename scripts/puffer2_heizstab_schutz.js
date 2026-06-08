// ============================================
// Puffer 2 Heizstab Schutz
// NUR Schutzabschaltung — keine Ladeoptimierung
// Hohe Puffertemperatur allein ist KEIN Fehler
// (Holz/Solarthermie → 85°C normal)
// Fehlerfall: elektrische Leistung bei hoher Temp
// Stand: 07.06.2026
// ============================================

var http = require('http');

// ============================================
// SHELLY KONFIGURATION — IP EINTRAGEN!
// Shelly Pro3 (Gen2), 3 Relais à 1500W
// Gen2 API: GET /rpc/Switch.Set?id=N&on=false
// Gen1 API: GET /relay/N?turn=off
//
// ACHTUNG: Solarmanager steuert diese Relais
// ebenfalls. Direktabschaltung via Shelly HTTP
// kann vom Solarmanager im nächsten Zyklus
// (alle 1 Min) wieder eingeschaltet werden.
// Schutz läuft alle 5 Min → max. 5 Min Lücke.
// ============================================
var CONFIG = {
    SHELLY_IP:   '0.0.0.0',   // << SHELLY PRO3 IP HIER EINTRAGEN (Beispiel: 192.168.178.XX)
    SHELLY_GEN:  2,            // 2 = Shelly Pro/Gen2 API, 1 = ältere Shelly Gen1 API

    ABSCHALT_TEMP:            65,   // Elektrische Abschalttemperatur (°C)
    HEIZSTAB_MAX_TEMP:        80,   // Regler-Maximum des Heizstabs (°C) — Hardware-Grenze
    PUFFER_HOLZ_NORMAL_TEMP:  85,   // Normale Puffertemperatur bei Holz/Solarthermie (°C)
    MIN_RELEVANTE_LEISTUNG_W: 100,  // Unter diesem Wert gilt Heizstab als "aus" (W)
    MAX_DATENALTER_MIN:       15,   // ETA-Daten älter als X Min → Sicherheitsabschaltung

    VERIFIKATION_VERZ_MS:     30000, // Prüfverzögerung nach Abschaltbefehl (ms)
};

createState('puffer2.heizstab_schutz.aktiv',            false, { name: 'Heizstab Schutz aktiv',              type: 'boolean', role: 'indicator', read: true, write: false });
createState('puffer2.heizstab_schutz.abschaltung_aktiv',false, { name: 'Heizstab Abschaltung aktiv',         type: 'boolean', role: 'indicator', read: true, write: false });
createState('puffer2.heizstab_schutz.status',           '',    { name: 'Heizstab Schutz Status',             type: 'string',  role: 'text',      read: true, write: false });
createState('puffer2.heizstab_schutz.letzte_aktion',    '',    { name: 'Heizstab letzte Aktion',             type: 'string',  role: 'text',      read: true, write: false });
createState('puffer2.heizstab_schutz.letzter_alarm',    '',    { name: 'Heizstab letzter Alarm',             type: 'string',  role: 'text',      read: true, write: false });

function safe(id, fallback) {
    try {
        var s = getState(id);
        if (s && s.val !== null && s.val !== undefined) return s.val;
    } catch(e) {}
    return fallback;
}

function datenZuAlt(id) {
    try {
        var s = getState(id);
        if (!s || !s.ts) return true;
        return (Date.now() - s.ts) / 60000 > CONFIG.MAX_DATENALTER_MIN;
    } catch(e) { return true; }
}

function shellyRelaisAus(relaisNr) {
    var path = CONFIG.SHELLY_GEN === 2
        ? '/rpc/Switch.Set?id=' + relaisNr + '&on=false'
        : '/relay/' + relaisNr + '?turn=off';

    var options = { host: CONFIG.SHELLY_IP, port: 80, path: path, method: 'GET' };

    var req = http.request(options, function(res) {
        res.on('data', function() {});
        res.on('end', function() {
            log('Shelly Relais ' + relaisNr + ' AUS — HTTP ' + res.statusCode);
        });
    });
    req.on('error', function(e) {
        log('Shelly Relais ' + relaisNr + ' Fehler: ' + e.message, 'error');
    });
    req.end();
}

function alleRelaisAus() {
    shellyRelaisAus(0);
    shellyRelaisAus(1);
    shellyRelaisAus(2);
}

function setStatus(aktiv, abschaltung, status) {
    setState('javascript.0.puffer2.heizstab_schutz.aktiv',            { val: aktiv,      ack: true });
    setState('javascript.0.puffer2.heizstab_schutz.abschaltung_aktiv',{ val: abschaltung, ack: true });
    setState('javascript.0.puffer2.heizstab_schutz.status',           { val: status,     ack: true });
}

function alarm(text) {
    var jetzt = new Date().toLocaleString('de-DE');
    setState('javascript.0.puffer2.heizstab_schutz.letzter_alarm', { val: jetzt + ' — ' + text, ack: true });
    sendTo('telegram.0', text);
    log('Heizstab ALARM: ' + text, 'warn');
}

function abschalten(grund, alarmText) {
    var jetzt = new Date().toLocaleString('de-DE');
    alleRelaisAus();
    setState('javascript.0.puffer2.heizstab_schutz.letzte_aktion', { val: jetzt + ' — ' + grund, ack: true });
    setStatus(true, true, grund);
    log('Heizstab Puffer2 ABGESCHALTET: ' + grund);

    if (alarmText) alarm(alarmText);

    // Verifizierung: prüfen ob Leistung nach Verzögerung wirklich weg
    setTimeout(function() {
        var wattNach = safe('javascript.0.solar.puffer2.watt', 0);
        if (wattNach > CONFIG.MIN_RELEVANTE_LEISTUNG_W) {
            alarm(
                '🚨 Heizstab Puffer 2: Abschaltbefehl gesendet, aber noch ' +
                Math.round(wattNach) + 'W Leistung!\nBitte Shelly-IP prüfen und manuell eingreifen.'
            );
        }
    }, CONFIG.VERIFIKATION_VERZ_MS);
}

function heizstabSchutzLogik() {

    // ETA-Datenverfügbarkeit prüfen
    if (datenZuAlt('javascript.0.eta.puffer2.oben') || datenZuAlt('javascript.0.eta.puffer2.mitte')) {
        abschalten('Sicherheitsabschaltung: ETA Puffer2-Daten fehlen oder älter als ' + CONFIG.MAX_DATENALTER_MIN + ' Min', null);
        log('Heizstab Schutz: ETA-Daten zu alt — Sicherheitsabschaltung', 'warn');
        return;
    }

    var oben  = safe('javascript.0.eta.puffer2.oben',  0);
    var mitte = safe('javascript.0.eta.puffer2.mitte', 0);
    var watt  = safe('javascript.0.solar.puffer2.watt', 0);

    var maxTemp        = Math.max(oben, mitte);
    var heizstabLaeuft = watt > CONFIG.MIN_RELEVANTE_LEISTUNG_W;

    log('Heizstab Schutz: Puffer2 oben=' + oben + '°C mitte=' + mitte + '°C | Heizstab=' + Math.round(watt) + 'W');

    // --- Kritischer Alarm: Heizstab nahe/über eigener Hardware-Grenze ---
    if (maxTemp >= CONFIG.HEIZSTAB_MAX_TEMP && heizstabLaeuft) {
        abschalten(
            'ALARM: Puffer2 ' + maxTemp + '°C ≥ Heizstab-Regler ' + CONFIG.HEIZSTAB_MAX_TEMP + '°C, ' + Math.round(watt) + 'W Leistung',
            '🚨 ALARM: Heizstab Puffer 2 läuft bei ' + maxTemp + '°C!\n' +
            'Regler-Grenze: ' + CONFIG.HEIZSTAB_MAX_TEMP + '°C — sofort abgeschaltet.\n' +
            'Puffer2: oben ' + oben + '°C / mitte ' + mitte + '°C\n' +
            'Leistung: ' + Math.round(watt) + 'W'
        );
        return;
    }

    // --- Warnung: Heizstab läuft trotz erreichter Abschalttemperatur ---
    if (maxTemp >= CONFIG.ABSCHALT_TEMP && heizstabLaeuft) {
        abschalten(
            'Abschalttemperatur ' + CONFIG.ABSCHALT_TEMP + '°C erreicht (' + maxTemp + '°C), ' + Math.round(watt) + 'W — Relais AUS',
            '⚠️ Heizstab Puffer 2: läuft trotz ' + maxTemp + '°C (Abschalt: ' + CONFIG.ABSCHALT_TEMP + '°C)\n' +
            'Puffer2: oben ' + oben + '°C / mitte ' + mitte + '°C\n' +
            'Leistung: ' + Math.round(watt) + 'W — Relais abgeschaltet.'
        );
        return;
    }

    // --- Normal: Abschalttemperatur erreicht, Heizstab ist bereits aus ---
    if (maxTemp >= CONFIG.ABSCHALT_TEMP && !heizstabLaeuft) {
        alleRelaisAus(); // sicherheitshalber trotzdem senden
        setStatus(true, false, 'Elektrische Zieltemperatur erreicht: ' + maxTemp + '°C — Heizstab aus');
        return;
    }

    // --- Info: Hohe Temperatur durch Holz/Solarthermie, kein Alarm ---
    if (maxTemp >= CONFIG.PUFFER_HOLZ_NORMAL_TEMP && !heizstabLaeuft) {
        setStatus(false, false,
            'Hohe Puffertemperatur (' + maxTemp + '°C) — kein Heizstab aktiv, vermutlich Holz/Solarthermie'
        );
        return;
    }

    // --- Alles OK ---
    setStatus(false, false,
        'OK — Puffer2: ' + oben + '°C / ' + mitte + '°C | Heizstab: ' + (heizstabLaeuft ? Math.round(watt) + 'W' : 'aus')
    );
}

heizstabSchutzLogik();
schedule('*/5 * * * *', function() { heizstabSchutzLogik(); });
log('Puffer2 Heizstab Schutz gestartet — Shelly IP: ' + CONFIG.SHELLY_IP);
