// ============================================
// ETA Pellets Logik — Hinweis-Modus
// Automatik greift NICHT mehr in den ETA ein,
// sondern schickt Empfehlungen per Telegram.
// Nur manuelle Befehle (/pellets_ein, /pellets_aus)
// schreiben in den Kessel.
// Stand: 10.06.2026
// ============================================

var http = require('http');

var CONFIG = {
    ETA_IP: '192.168.178.5',
    ETA_PORT: 8080,
    ETA_URI: '/user/var/264/10891/0/0/12651',

    // Hysterese verhindert staendiges Umschalten der Empfehlung
    PUFFER_SPERRE_AB: 42,
    PUFFER_FREIGABE_AB: 38,

    WW_MIN_TEMP: 45,
    AUSSEN_TEMP_HEIZEN: 15,

    NACHT_START: 0,
    NACHT_ENDE: 4.5,

    // Kein Empfehlungs-Spam bei flatternden Werten
    EMPFEHLUNG_COOLDOWN_MIN: 30,

    // Falls ETA / Solarmanager Werte fehlen
    MAX_DATENALTER_MIN: 15
};

createState('eta.pellets.gesperrt', false, {
    name: 'Pellets gesperrt durch ioBroker (nur manuell)',
    type: 'boolean',
    role: 'indicator',
    read: true,
    write: false
});

createState('eta.pellets.modus', 'auto', {
    name: 'Pellets Modus (auto/manuell_ein/manuell_aus)',
    type: 'string',
    role: 'value',
    read: true,
    write: true
});

createState('eta.pellets.empfehlung', '', {
    name: 'Aktuelle Empfehlung (sperren/freigeben)',
    type: 'string',
    role: 'text',
    read: true,
    write: false
});

createState('eta.pellets.empfehlung_zeit', 0, {
    name: 'Zeitpunkt der letzten Empfehlungs-Nachricht',
    type: 'number',
    role: 'value',
    read: true,
    write: false
});

createState('eta.pellets.letzte_entscheidung', '', {
    name: 'Letzte Empfehlung / Entscheidung',
    type: 'string',
    role: 'text',
    read: true,
    write: false
});

function safeState(id, fallback) {
    try {
        var obj = getState('javascript.0.' + id);
        if (obj && obj.val !== null && obj.val !== undefined) {
            return obj.val;
        }
    } catch (e) {}
    return fallback;
}

function datenZuAlt(id) {
    try {
        var obj = getState('javascript.0.' + id);
        if (!obj || !obj.ts) return true;

        var alterMin = (Date.now() - obj.ts) / 1000 / 60;
        return alterMin > CONFIG.MAX_DATENALTER_MIN;
    } catch (e) {
        return true;
    }
}

// Schreibt NUR bei manuellen Befehlen oder zur einmaligen
// Freigabe beim Wechsel zurück auf Automatik
function etaSchreiben(sperren, grund) {

    var aktuellGesperrt = safeState('eta.pellets.gesperrt', false);

    // Kein unnötiges Schreiben
    if (aktuellGesperrt === sperren) {
        return;
    }

    var wert = sperren ? 1801 : 1800;
    var aktion = sperren ? 'GESPERRT' : 'FREIGEGEBEN';
    var postData = 'value=' + wert;

    var options = {
        host: CONFIG.ETA_IP,
        port: CONFIG.ETA_PORT,
        path: CONFIG.ETA_URI,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };

    var req = http.request(options, function(res) {

        var data = '';

        res.on('data', function(c) {
            data += c;
        });

        res.on('end', function() {

            if (data.indexOf('<success') !== -1) {

                setState('javascript.0.eta.pellets.gesperrt', {
                    val: sperren,
                    ack: true
                });

                setState('javascript.0.eta.pellets.letzte_entscheidung', {
                    val: grund,
                    ack: true
                });

                var msg =
                    '🔥 ETA Pellets ' + aktion +
                    '\nGrund: ' + grund +
                    '\nPuffer: ' + safeState('eta.puffer.oben', '?') + '°C' +
                    '\nWarmwasser: ' + safeState('eta.warmwasser.oben', '?') + '°C' +
                    '\nAußen: ' + safeState('eta.aussen.temperatur', '?') + '°C' +
                    '\nPV: ' + safeState('solar.pv.watt', '?') + 'W';

                sendTo('telegram.0', msg);

                log('ETA Pellets ' + aktion + ' | ' + grund);

            } else {

                log('ETA Schreibfehler: ' + data, 'error');

            }
        });
    });

    req.on('error', function(e) {
        log('ETA Verbindungsfehler: ' + e.message, 'error');
    });

    req.write(postData);
    req.end();
}

// Telegram-Hinweis senden wenn sich die Empfehlung ändert
function empfehlungSenden(sperren, grund) {

    var letzteEmpfehlung = safeState('eta.pellets.empfehlung', '');
    var neueEmpfehlung = sperren ? 'sperren' : 'freigeben';

    setState('javascript.0.eta.pellets.letzte_entscheidung', {
        val: grund,
        ack: true
    });

    // Nur bei Wechsel benachrichtigen
    if (letzteEmpfehlung === neueEmpfehlung) {
        return;
    }

    // Cooldown gegen Flattern
    var letzteZeit = safeState('eta.pellets.empfehlung_zeit', 0);
    var minSeitNachricht = (Date.now() - letzteZeit) / 1000 / 60;

    if (letzteZeit > 0 && minSeitNachricht < CONFIG.EMPFEHLUNG_COOLDOWN_MIN) {
        log('Empfehlungswechsel (' + neueEmpfehlung + ') — Cooldown aktiv (' +
            Math.round(minSeitNachricht) + '/' + CONFIG.EMPFEHLUNG_COOLDOWN_MIN + ' Min)');
        return;
    }

    setState('javascript.0.eta.pellets.empfehlung', {
        val: neueEmpfehlung,
        ack: true
    });

    setState('javascript.0.eta.pellets.empfehlung_zeit', {
        val: Date.now(),
        ack: true
    });

    var msg =
        (sperren ? '💡 Empfehlung: Pellets SPERREN' : '🔥 Empfehlung: Pellets FREIGEBEN') +
        '\nGrund: ' + grund +
        '\nPuffer: ' + safeState('eta.puffer.oben', '?') + '°C' +
        '\nWarmwasser: ' + safeState('eta.warmwasser.oben', '?') + '°C' +
        '\nAußen: ' + safeState('eta.aussen.temperatur', '?') + '°C' +
        '\nPV: ' + safeState('solar.pv.watt', '?') + 'W' +
        '\n\nManuell: ' + (sperren ? '/pellets_aus' : '/pellets_ein');

    sendTo('telegram.0', msg);

    log('Empfehlung ' + neueEmpfehlung.toUpperCase() + ' | ' + grund);
}

function etaPelletsSteuerung() {

    var modus = safeState('eta.pellets.modus', 'auto');

    // --- Manuelle Modi: einzige verbleibende Schreibzugriffe ---
    if (modus === 'manuell_ein') {
        etaSchreiben(false, 'Manuell per Telegram freigegeben');
        return;
    }

    if (modus === 'manuell_aus') {
        etaSchreiben(true, 'Manuell per Telegram gesperrt');
        return;
    }

    // --- Automatik = nur Hinweise, kein Eingriff ---

    // Sicherheit: Im Auto-Modus darf keine Sperre von uns aktiv sein.
    // Greift beim Umstieg auf Hinweis-Modus und nach /pellets_auto.
    if (safeState('eta.pellets.gesperrt', false)) {
        etaSchreiben(false, 'Automatik aktiv — Sperre aufgehoben (Hinweis-Modus)');
        return;
    }

    var puffer = safeState('eta.puffer.oben', 99);
    var ww = safeState('eta.warmwasser.oben', 99);
    var aussen = safeState('eta.aussen.temperatur', 0);

    var switch_an = safeState('solar.switch', false);
    var pvWatt = safeState('solar.pv.watt', 0);

    // Bei alten Daten keine Empfehlung abgeben
    var kritischeDatenAlt =
        datenZuAlt('eta.puffer.oben') ||
        datenZuAlt('eta.warmwasser.oben') ||
        datenZuAlt('solar.switch');

    if (kritischeDatenAlt) {
        log('Daten zu alt — keine Empfehlung', 'warn');
        return;
    }

    var jetzt = new Date();

    var stundeJetzt =
        jetzt.getHours() +
        jetzt.getMinutes() / 60;

    var istNacht =
        stundeJetzt >= CONFIG.NACHT_START &&
        stundeJetzt < CONFIG.NACHT_ENDE;

    var letzteEmpfehlung = safeState('eta.pellets.empfehlung', '');

    var sperren = false;
    var grund = '';

    // Prioritaet 1: Pufferlogik mit Hysterese
    if (letzteEmpfehlung === 'sperren') {

        if (puffer >= CONFIG.PUFFER_FREIGABE_AB) {

            sperren = true;
            grund =
                'Puffer noch warm (' +
                puffer +
                '°C >= ' +
                CONFIG.PUFFER_FREIGABE_AB +
                '°C)';
        }

    } else {

        if (puffer >= CONFIG.PUFFER_SPERRE_AB) {

            sperren = true;
            grund =
                'Puffer voll (' +
                puffer +
                '°C >= ' +
                CONFIG.PUFFER_SPERRE_AB +
                '°C)';
        }
    }

    // Weitere Kriterien nur wenn noch nicht entschieden
    if (!sperren) {

        if (istNacht) {

            grund = 'Nachtbetrieb';

        } else if (aussen < CONFIG.AUSSEN_TEMP_HEIZEN) {

            grund =
                'Heizbedarf wegen Außentemperatur (' +
                aussen +
                '°C)';

        } else if (ww < CONFIG.WW_MIN_TEMP) {

            grund =
                'Warmwasser zu kalt (' +
                ww +
                '°C)';

        } else if (switch_an) {

            sperren = true;

            grund =
                'PV Überschuss aktiv (' +
                pvWatt +
                'W)';

        } else {

            grund = 'Kein Sperrgrund aktiv';
        }
    }

    log(
        'ETA Hinweis-Logik [' +
        modus +
        ']: Empfehlung ' +
        (sperren ? 'SPERREN' : 'FREIGEBEN') +
        ' | ' +
        grund
    );

    empfehlungSenden(sperren, grund);
}

// Sofortige Reaktion wenn Modus per Telegram geändert wird
on({id: 'javascript.0.eta.pellets.modus', change: 'any'}, function() {
    etaPelletsSteuerung();
});

etaPelletsSteuerung();

schedule('*/5 * * * *', function() {
    etaPelletsSteuerung();
});

log('ETA Pellets Hinweis-Logik gestartet (Automatik greift nicht mehr ein)');
