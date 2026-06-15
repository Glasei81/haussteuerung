// ============================================
// ETA Puffer 2 Rückspeisung
// Überträgt Wärme von Puffer2 (600L) → Puffer1 (3000L)
// wenn P2 signifikant heißer ist als P1.
//
// Trigger: puffer2.oben > puffer.fuehler1 + DELTA_EIN
//          UND p2.oben >= TEMP_MIN_P2
//          UND Uhrzeit innerhalb STUNDE_VON..STUNDE_BIS
//          UND kein Cooldown aktiv
//
// ETA "Sofort laden" lässt Pufferladeventil/-pumpe 15 Min laufen.
// Manueller Override: /p2rueck per Telegram
// Stand: 13.06.2026
// ============================================

var http = require('http');

var ETA_IP           = '192.168.178.5';
var ETA_PORT         = 8080;
var URI_SOFORT_LADEN = '/121/10601/0/0/13025';

var CONFIG = {
    DELTA_EIN:    10,                  // °C: P2.oben muss X°C über P1.fuehler1 liegen
    TEMP_MIN_P2:  45,                  // °C: P2 muss mind. X°C haben (sonst keine nutzbare Wärme)
    STUNDE_VON:   9,                   // Zeitfenster: ab 09:00 Uhr
    STUNDE_BIS:   19,                  // Zeitfenster: bis 19:00 Uhr
    COOLDOWN_MS:  2 * 60 * 60 * 1000, // 2h Mindestpause zwischen zwei Transfers
};

createState('eta.puffer2rueck.letzter_transfer', 0, {
    name: 'Puffer2 Rückspeisung letzter Transfer (ms)',
    type: 'number', role: 'value', read: true, write: false
});
createState('eta.puffer2rueck.grund', '', {
    name: 'Puffer2 Rückspeisung letzter Grund',
    type: 'string', role: 'text', read: true, write: false
});

function safe(id, fallback) {
    try {
        var s = getState(id);
        if (s && s.val !== null && s.val !== undefined) return s.val;
    } catch(e) {}
    return fallback;
}

function sofortLaden() {
    var body = 'value=1803&at=0';
    var options = {
        host:   ETA_IP,
        port:   ETA_PORT,
        path:   '/user/var' + URI_SOFORT_LADEN,
        method: 'POST',
        headers: {
            'Content-Type':   'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    };
    var req = http.request(options, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
            log('Puffer2 Rückspeisung: Sofort laden gesendet (HTTP ' + res.statusCode + ')');
        });
    });
    req.on('error', function(e) {
        log('Puffer2 Rückspeisung: POST Fehler — ' + e.message, 'error');
        sendTo('telegram.0', '❌ Puffer2 Rückspeisung Fehler: ' + e.message);
    });
    req.write(body);
    req.end();
}

function pruefen() {
    var jetzt    = Date.now();
    var stunde   = new Date().getHours();
    var p2oben   = safe('javascript.0.eta.puffer2.oben',                   0);
    var p1oben   = safe('javascript.0.eta.puffer.fuehler1',                0);
    var letzter  = safe('javascript.0.eta.puffer2rueck.letzter_transfer',  0);

    var deltaT     = p2oben - p1oben;
    var inZeit     = stunde >= CONFIG.STUNDE_VON && stunde < CONFIG.STUNDE_BIS;
    var inCooldown = (jetzt - letzter) < CONFIG.COOLDOWN_MS;

    log('Puffer2 Rückspeisung: P2=' + p2oben + '°C | P1=' + p1oben + '°C | Δ=' + Math.round(deltaT) + '°C | Zeit=' + inZeit + ' | Cooldown=' + inCooldown);

    if (!inZeit)                       return;
    if (inCooldown)                    return;
    if (p2oben < CONFIG.TEMP_MIN_P2)   return;
    if (deltaT  < CONFIG.DELTA_EIN)    return;

    var grund = 'P2=' + p2oben + '°C, P1=' + p1oben + '°C, Δ=' + Math.round(deltaT) + '°C';
    setState('javascript.0.eta.puffer2rueck.letzter_transfer', { val: jetzt, ack: true });
    setState('javascript.0.eta.puffer2rueck.grund',            { val: grund, ack: true });

    sendTo('telegram.0',
        '🔄 Puffer2 → Puffer1 Rückspeisung gestartet\n' +
        grund + '\n' +
        '(ETA Pufferladeventil/-pumpe läuft 15 Min)'
    );
    log('Puffer2 Rückspeisung ausgelöst: ' + grund);

    sofortLaden();
}

// Manueller Telegram-Trigger: /p2rueck
on({id: 'telegram.0.communicate.request', change: 'any'}, function(obj) {
    var msg = obj.state.val;
    var cmd = '';
    try { cmd = JSON.parse(msg).message; } catch(e) { cmd = msg; }
    cmd = cmd.replace(/^\[.*?\]/, '').trim();

    if (cmd === '/p2rueck') {
        var p2 = safe('javascript.0.eta.puffer2.oben',    0);
        var p1 = safe('javascript.0.eta.puffer.fuehler1', 0);
        setState('javascript.0.eta.puffer2rueck.letzter_transfer', { val: Date.now(), ack: true });
        setState('javascript.0.eta.puffer2rueck.grund',            { val: 'Manuell via /p2rueck', ack: true });
        sendTo('telegram.0', '🔄 Puffer2 Rückspeisung manuell gestartet\nP2=' + p2 + '°C | P1=' + p1 + '°C');
        sofortLaden();
    }
});

// Automatischer Trigger deaktiviert — ETA startet Pumpe nicht wenn P2 > P1
// Reaktivieren sobald Shelly 1PM direkt an der Pumpe installiert ist
// pruefen();
// schedule('*/10 * * * *', function() { pruefen(); });
log('ETA Puffer2 Rückspeisung geladen — Auto-Trigger deaktiviert, /p2rueck für manuellen Test');
