// ============================================
// ETA Pellets Logik
// Temperatur + PV + Warmwasser gesteuert
// Mit Telegram Steuerung inkl. Forecast
// Optimierte Sicherheits- und Hysterese-Logik
// Stand: 26.05.2026
// ============================================

var http = require('http');

var CONFIG = {
    ETA_IP: '192.168.178.5',
    ETA_PORT: 8080,
    ETA_URI: '/user/var/264/10891/0/0/12651',

    // Hysterese verhindert staendiges Umschalten
    PUFFER_SPERRE_AB: 42,
    PUFFER_FREIGABE_AB: 38,

    WW_MIN_TEMP: 45,
    AUSSEN_TEMP_HEIZEN: 15,

    NACHT_START: 0,
    NACHT_ENDE: 4.5,

    MINDESTLAUFZEIT_MIN: 30,

    // Falls ETA / Solarmanager Werte fehlen
    MAX_DATENALTER_MIN: 15
};

createState('eta.pellets.gesperrt', false, {
    name: 'Pellets gesperrt durch ioBroker',
    type: 'boolean',
    role: 'indicator',
    read: true,
    write: false
});

createState('eta.pellets.freigabe_zeit', 0, {
    name: 'Zeitpunkt der letzten Freigabe',
    type: 'number',
    role: 'value',
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

createState('eta.pellets.letzte_entscheidung', '', {
    name: 'Letzte Automatikentscheidung',
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

                if (!sperren) {
                    setState('javascript.0.eta.pellets.freigabe_zeit', {
                        val: Date.now(),
                        ack: true
                    });
                }

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

function etaPelletsSteuerung() {

    var modus = safeState('eta.pellets.modus', 'auto');

    var puffer = safeState('eta.puffer.oben', 99);
    var ww = safeState('eta.warmwasser.oben', 99);
    var aussen = safeState('eta.aussen.temperatur', 0);

    var switch_an = safeState('solar.switch', false);
    var pvWatt = safeState('solar.pv.watt', 0);

    var aktuellGesperrt = safeState('eta.pellets.gesperrt', false);

    var freigabeZeit = safeState('eta.pellets.freigabe_zeit', 0);

    // Sicherheitslogik bei fehlenden Daten
    var kritischeDatenAlt =
        datenZuAlt('eta.puffer.oben') ||
        datenZuAlt('eta.warmwasser.oben') ||
        datenZuAlt('solar.switch');

    if (kritischeDatenAlt) {

        log('Daten zu alt -> ETA Sicherheit FREIGABE', 'warn');

        etaSchreiben(false, 'Sicherheitsfreigabe wegen fehlender Daten');

        return;
    }

    // Manuelle Modi
    if (modus === 'manuell_ein') {

        etaSchreiben(false, 'Manuell per Telegram freigegeben');
        return;
    }

    if (modus === 'manuell_aus') {

        etaSchreiben(true, 'Manuell per Telegram gesperrt');
        return;
    }

    var jetzt = new Date();

    var stundeJetzt =
        jetzt.getHours() +
        jetzt.getMinutes() / 60;

    var istNacht =
        stundeJetzt >= CONFIG.NACHT_START &&
        stundeJetzt < CONFIG.NACHT_ENDE;

    var minSeitFreigabe =
        (Date.now() - freigabeZeit) / 1000 / 60;

    var mindestlaufzeitAktiv =
        !aktuellGesperrt &&
        freigabeZeit > 0 &&
        minSeitFreigabe < CONFIG.MINDESTLAUFZEIT_MIN;

    var sperren = false;
    var grund = '';

    // Prioritaet 1: Pufferlogik mit Hysterese
    if (aktuellGesperrt) {

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

            grund = 'Keine PV Sperre aktiv';
        }
    }

    // Mindestlaufzeit beachten
    if (mindestlaufzeitAktiv && sperren) {

        sperren = false;

        grund =
            'Mindestlaufzeit aktiv (' +
            Math.round(minSeitFreigabe) +
            '/' +
            CONFIG.MINDESTLAUFZEIT_MIN +
            ' Min)';
    }

    setState('javascript.0.eta.pellets.letzte_entscheidung', {
        val: grund,
        ack: true
    });

    log(
        'ETA Logik [' +
        modus +
        ']: ' +
        (sperren ? 'SPERREN' : 'FREIGEBEN') +
        ' | ' +
        grund
    );

    etaSchreiben(sperren, grund);
}

// Sofortige Reaktion wenn Modus per Telegram geändert wird
on({id: 'javascript.0.eta.pellets.modus', change: 'any'}, function() {
    etaPelletsSteuerung();
});

etaPelletsSteuerung();

schedule('*/5 * * * *', function() {
    etaPelletsSteuerung();
});

log('ETA Pellets Logik gestartet');
